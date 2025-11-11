import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RecognizedGesture } from '../components/GuitarCanvas';

type GuitarStringId = 'highE' | 'B' | 'G' | 'D' | 'A' | 'lowE';

type GestureHeadline = string;

interface GuitarStringDefinition {
  id: GuitarStringId;
  name: string;
  label: string;
  frequency: number;
  midi: number;
  order: number;
}

interface GuitarPitchSnapshot {
  string: GuitarStringDefinition;
  articulation: 'tap' | 'slide';
  durationMs?: number;
  fret: number;
  midi: number;
  label: string;
  frequency: number;
}

interface StrumSnapshot {
  direction: 'up' | 'down';
  velocity: number;
  strings: GuitarStringDefinition[];
}

interface SlideSnapshot {
  direction: 'left' | 'right';
  velocity: number;
  distance: number;
  string: GuitarStringDefinition;
  startFret: number;
  targetFret: number;
}

interface DetectedChord {
  root: string;
  quality: 'major' | 'minor';
  notes: string[];
  intervals: number[];
  label: string;
}

export interface GuitarEngineStatus {
  lastGesture?: RecognizedGesture;
  message?: string;
  activeString?: GuitarPitchSnapshot;
  strum?: StrumSnapshot;
  slide?: SlideSnapshot;
  chord?: DetectedChord;
}

const GUITAR_STRINGS: GuitarStringDefinition[] = [
  { id: 'highE', name: 'High E', label: 'E4', frequency: 329.63, midi: 64, order: 0 },
  { id: 'B', name: 'B', label: 'B3', frequency: 246.94, midi: 59, order: 1 },
  { id: 'G', name: 'G', label: 'G3', frequency: 196.0, midi: 55, order: 2 },
  { id: 'D', name: 'D', label: 'D3', frequency: 146.83, midi: 50, order: 3 },
  { id: 'A', name: 'A', label: 'A2', frequency: 110.0, midi: 45, order: 4 },
  { id: 'lowE', name: 'Low E', label: 'E2', frequency: 82.41, midi: 40, order: 5 },
];

interface DemoNoteEvent {
  atMs: number;
  stringId: GuitarStringId;
  fret: number;
  durationMs: number;
}

const CLASSICAL_DEMO_SEQUENCE: DemoNoteEvent[] = [
  { atMs: 0, stringId: 'lowE', fret: 0, durationMs: 460 },
  { atMs: 260, stringId: 'A', fret: 2, durationMs: 420 },
  { atMs: 520, stringId: 'D', fret: 2, durationMs: 420 },
  { atMs: 780, stringId: 'G', fret: 0, durationMs: 420 },
  { atMs: 1040, stringId: 'B', fret: 0, durationMs: 420 },
  { atMs: 1300, stringId: 'highE', fret: 0, durationMs: 460 },
  { atMs: 1560, stringId: 'B', fret: 0, durationMs: 420 },
  { atMs: 1820, stringId: 'G', fret: 0, durationMs: 420 },
  { atMs: 2080, stringId: 'D', fret: 2, durationMs: 420 },
  { atMs: 2340, stringId: 'A', fret: 2, durationMs: 420 },
  { atMs: 2600, stringId: 'lowE', fret: 0, durationMs: 460 },
  { atMs: 2860, stringId: 'B', fret: 3, durationMs: 420 },
  { atMs: 3120, stringId: 'highE', fret: 0, durationMs: 420 },
  { atMs: 3380, stringId: 'B', fret: 2, durationMs: 420 },
  { atMs: 3640, stringId: 'highE', fret: 0, durationMs: 420 },
  { atMs: 3900, stringId: 'B', fret: 3, durationMs: 420 },
  { atMs: 4160, stringId: 'highE', fret: 0, durationMs: 480 },
];

const CLASSICAL_DEMO_DURATION_MS = CLASSICAL_DEMO_SEQUENCE.reduce((max, event) => {
  const end = event.atMs + event.durationMs;
  return end > max ? end : max;
}, 0);

const DEMO_COMPLETION_DELAY_MS = 480;
const CLASSICAL_DEMO_HEADLINE = 'Classical demo: Spanish Romance (excerpt)';

const STRING_SPACING_PX = 40;
const STRING_TOP_OFFSET_PX = 40;

interface AudioEngineOscillator {
  frequency: {
    value: number;
    setValueAtTime?: (value: number, time: number) => void;
    linearRampToValueAtTime?: (value: number, time: number) => void;
  };
  connect: (destinationNode: unknown) => void;
  start: (when?: number) => void;
  stop: (when?: number) => void;
}

interface AudioEngineGain {
  gain: {
    setValueAtTime: (value: number, time: number) => void;
    linearRampToValueAtTime?: (value: number, time: number) => void;
    exponentialRampToValueAtTime?: (value: number, time: number) => void;
  };
  connect: (destinationNode: unknown) => void;
}

interface AudioContextLike {
  state?: string;
  resume?: () => Promise<void>;
  currentTime: number;
  destination: unknown;
  createOscillator: () => AudioEngineOscillator;
  createGain: () => AudioEngineGain;
}

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
};

const findStringIndexFromY = (y: number) => {
  const relative = (y - STRING_TOP_OFFSET_PX) / STRING_SPACING_PX;
  const rounded = Math.round(relative);
  return clamp(rounded, 0, GUITAR_STRINGS.length - 1);
};

const mapSpeedToVelocity = (speed: number) => clamp(speed * 0.6, 0.25, 1);

const mapTapDurationToVelocity = (durationMs: number) => {
  const normalized = clamp(1 - durationMs / 350, 0.2, 0.9);
  return normalized;
};

const mapDistanceToSlideSemitones = (distance: number) => clamp(distance / 40, 1, 6);

const FRETBOARD_START_RATIO = 0.1;
const FRETBOARD_END_RATIO = 0.9;
const MAX_FRET = 12;
const FRETBOARD_SPAN = FRETBOARD_END_RATIO - FRETBOARD_START_RATIO;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const computeFretFromRelativeX = (relativeX?: number) => {
  if (relativeX == null || Number.isNaN(relativeX)) {
    return 0;
  }

  if (FRETBOARD_SPAN <= 0) {
    return 0;
  }

  const normalized = clamp01((relativeX - FRETBOARD_START_RATIO) / FRETBOARD_SPAN);
  const fret = Math.round(normalized * MAX_FRET);
  return clamp(fret, 0, MAX_FRET);
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

const midiToNoteLabel = (midi: number) => {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
};

const createPitchSnapshot = (
  stringDef: GuitarStringDefinition,
  fret: number,
  articulation: 'tap' | 'slide',
  durationMs?: number
): GuitarPitchSnapshot => {
  const clampedFret = clamp(fret, 0, MAX_FRET);
  const midi = stringDef.midi + clampedFret;
  const label = midiToNoteLabel(midi);
  const frequency = midiToFrequency(midi);

  return {
    string: stringDef,
    articulation,
    durationMs,
    fret: clampedFret,
    midi,
    label,
    frequency,
  };
};

const computeSlideTargetFret = (startFret: number, direction: 'left' | 'right', distance: number) => {
  const semitoneDelta = Math.max(1, Math.round(mapDistanceToSlideSemitones(distance)));
  const delta = direction === 'right' ? semitoneDelta : -semitoneDelta;
  return clamp(startFret + delta, 0, MAX_FRET);
};

const getPitchClass = (midi: number) => ((midi % 12) + 12) % 12;

const TRIAD_PATTERNS = [
  { quality: 'major' as const, intervals: [0, 4, 7] },
  { quality: 'minor' as const, intervals: [0, 3, 7] },
];

const detectChordFromFrets = (frettedState: Record<GuitarStringId, number>): DetectedChord | null => {
  const midiValues = GUITAR_STRINGS.map((stringDef) => {
    const fret = clamp(frettedState[stringDef.id] ?? 0, 0, MAX_FRET);
    return stringDef.midi + fret;
  });

  const pitchClasses = Array.from(new Set(midiValues.map(getPitchClass)));
  if (pitchClasses.length < 3) {
    return null;
  }

  const candidates = pitchClasses.flatMap((rootPitchClass) => {
    const intervalSet = new Set(pitchClasses.map((pitchClass) => (pitchClass - rootPitchClass + 12) % 12));
    const intervals = Array.from(intervalSet).sort((a, b) => a - b);

    return TRIAD_PATTERNS.filter((pattern) => pattern.intervals.every((interval) => intervalSet.has(interval))).map(
      (pattern) => ({
        rootPitchClass,
        pattern,
        intervals,
      })
    );
  });

  if (candidates.length === 0) {
    return null;
  }

  const scored = candidates
    .map(({ rootPitchClass, pattern, intervals }) => {
      const extraIntervals = intervals.filter(
        (interval) => interval !== 0 && !pattern.intervals.includes(interval)
      );

      return {
        rootPitchClass,
        pattern,
        intervals,
        extraCount: extraIntervals.length,
      };
    })
    .sort((a, b) => {
      if (a.extraCount !== b.extraCount) {
        return a.extraCount - b.extraCount;
      }

      if (a.pattern.quality === b.pattern.quality) {
        return 0;
      }

      return a.pattern.quality === 'major' ? -1 : 1;
    });

  const best = scored[0];
  if (!best) {
    return null;
  }

  const rootName = NOTE_NAMES[best.rootPitchClass] ?? `Root${best.rootPitchClass}`;
  const noteNames = best.intervals.map((interval) => NOTE_NAMES[(best.rootPitchClass + interval) % 12]);
  const label = `${rootName} ${best.pattern.quality}`;

  return {
    root: rootName,
    quality: best.pattern.quality,
    notes: noteNames,
    intervals: best.intervals,
    label,
  };
};

const formatGestureInternal = (gesture: RecognizedGesture): GestureHeadline => {
  switch (gesture.type) {
    case 'tap':
      return `Tap at (${gesture.position.x.toFixed(0)}, ${gesture.position.y.toFixed(0)}) in ${gesture.duration}ms`;
    case 'strum':
      return `${gesture.direction.toUpperCase()} strum • ${gesture.distance.toFixed(0)}px at ${gesture.speed.toFixed(2)}v`;
    case 'slide':
      return `${gesture.direction.toUpperCase()} slide • ${gesture.distance.toFixed(0)}px at ${gesture.speed.toFixed(2)}v`;
    case 'unknown':
    default:
      return gesture.detail;
  }
};

const createAudioContext = (): AudioContextLike | null => {
  const globalScope = typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>) : undefined;
  if (!globalScope) {
    return null;
  }

  const Ctor = (globalScope.AudioContext ?? globalScope.webkitAudioContext) as unknown;
  if (typeof Ctor !== 'function') {
    return null;
  }

  try {
    return new (Ctor as new () => AudioContextLike)();
  } catch (error) {
    console.warn('Failed to create audio context for guitar engine:', error);
    return null;
  }
};

class GuitarSoundEngine {
  private context: AudioContextLike | null;

  constructor() {
    this.context = createAudioContext();
  }

  private ensureContextReady() {
    if (!this.context) {
      return;
    }
    if (this.context.state === 'suspended' && typeof this.context.resume === 'function') {
      void this.context.resume().catch(() => {
        // Best effort resume; ignore failures silently to avoid noisy logs during tests.
      });
    }
  }

  private playFrequency(frequency: number, durationSeconds: number, velocity: number, startDelaySeconds = 0) {
    if (!this.context) {
      return;
    }

    this.ensureContextReady();

    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);

    const startTime = this.context.currentTime + startDelaySeconds;
    const attack = 0.0125;
    const release = 0.3;

    if (oscillator.frequency.setValueAtTime) {
      oscillator.frequency.setValueAtTime(frequency, startTime);
    } else {
      oscillator.frequency.value = frequency;
    }

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime?.(velocity, startTime + attack);

    const releaseTime = startTime + durationSeconds;
    if (gainNode.gain.exponentialRampToValueAtTime) {
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseTime);
    } else {
      gainNode.gain.linearRampToValueAtTime?.(0, releaseTime);
    }

    oscillator.start(startTime);
    oscillator.stop(releaseTime + release);
  }

  triggerTap(stringIndex: number, durationMs: number, fret = 0) {
    const clampedIndex = clamp(stringIndex, 0, GUITAR_STRINGS.length - 1);
    const stringDef = GUITAR_STRINGS[clampedIndex];
    const velocity = mapTapDurationToVelocity(durationMs);
    const frequency = midiToFrequency(stringDef.midi + clamp(fret, 0, MAX_FRET));
    this.playFrequency(frequency, 0.45, velocity);
  }

  triggerStrum(direction: 'up' | 'down', speed: number) {
    const orderedStrings = direction === 'down' ? GUITAR_STRINGS : [...GUITAR_STRINGS].reverse();
    const velocity = mapSpeedToVelocity(speed);
    const spreadSeconds = 0.025;

    orderedStrings.forEach((stringDef, index) => {
      const frequency = midiToFrequency(stringDef.midi);
      this.playFrequency(frequency, 0.6, velocity, index * spreadSeconds);
    });
  }

  triggerSlide(
    stringIndex: number,
    direction: 'left' | 'right',
    distance: number,
    speed: number,
    startFret = 0
  ) {
    if (!this.context) {
      return;
    }

    const clampedIndex = clamp(stringIndex, 0, GUITAR_STRINGS.length - 1);
    const baseString = GUITAR_STRINGS[clampedIndex];
    const clampedFret = clamp(startFret, 0, MAX_FRET);
    const velocity = mapSpeedToVelocity(speed);
    const slideSemitones = mapDistanceToSlideSemitones(distance);
    const ratio = Math.pow(2, slideSemitones / 12);
    const startFrequency = midiToFrequency(baseString.midi + clampedFret);
    const targetFrequency = direction === 'right' ? startFrequency * ratio : startFrequency / ratio;

    this.ensureContextReady();

    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);

    const startTime = this.context.currentTime;
    const sustain = clamp(distance / 180, 0.3, 1);

    if (oscillator.frequency.setValueAtTime && oscillator.frequency.linearRampToValueAtTime) {
      oscillator.frequency.setValueAtTime(startFrequency, startTime);
      oscillator.frequency.linearRampToValueAtTime(targetFrequency, startTime + sustain);
    } else {
      oscillator.frequency.value = targetFrequency;
    }

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime?.(velocity, startTime + 0.0125);
    gainNode.gain.linearRampToValueAtTime?.(0.0001, startTime + sustain + 0.25);

    oscillator.start(startTime);
    oscillator.stop(startTime + sustain + 0.4);
  }
}

export interface UseGuitarEngineOptions {
  logLimit?: number;
}

export const formatGesture = (gesture: RecognizedGesture): string => formatGestureInternal(gesture);

export const useGuitarEngine = (options?: UseGuitarEngineOptions) => {
  const logLimit = options?.logLimit ?? 5;
  const [gestureLog, setGestureLog] = useState<RecognizedGesture[]>([]);
  const [headline, setHeadline] = useState<GestureHeadline>('Waiting for gestures...');
  const [status, setStatus] = useState<GuitarEngineStatus>({ message: 'Waiting for gestures...' });
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);

  const soundEngineRef = useRef<GuitarSoundEngine | null>(null);
  const lastStringIndexRef = useRef<number | null>(null);
  const lastFretRef = useRef<number>(0);
  const frettedStringsRef = useRef<Record<GuitarStringId, number>>(
    GUITAR_STRINGS.reduce((acc, stringDef) => {
      acc[stringDef.id] = 0;
      return acc;
    }, {} as Record<GuitarStringId, number>)
  );
  const demoTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const getEngine = useCallback(() => {
    if (!soundEngineRef.current) {
      soundEngineRef.current = new GuitarSoundEngine();
    }
    return soundEngineRef.current;
  }, []);

  const clearDemoTimeouts = useCallback(() => {
    demoTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    demoTimeoutsRef.current = [];
  }, []);

  const scheduleDemoTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeoutId = setTimeout(() => {
      demoTimeoutsRef.current = demoTimeoutsRef.current.filter((stored) => stored !== timeoutId);
      callback();
    }, delayMs);

    demoTimeoutsRef.current.push(timeoutId);
  }, []);

  const pushGestureToLog = useCallback(
    (gesture: RecognizedGesture) =>
      setGestureLog((current) => {
        const next = [gesture, ...current];
        return next.slice(0, logLimit);
      }),
    [logLimit]
  );

  const captureTap = useCallback(
    (gesture: Extract<RecognizedGesture, { type: 'tap' }>) => {
      const stringIndex = findStringIndexFromY(gesture.position.y);
      const stringDef = GUITAR_STRINGS[stringIndex];
      const fret = computeFretFromRelativeX(gesture.relativePosition?.x);
      const snapshot = createPitchSnapshot(stringDef, fret, 'tap', gesture.duration);

      lastStringIndexRef.current = stringIndex;
      lastFretRef.current = snapshot.fret;
      frettedStringsRef.current[stringDef.id] = snapshot.fret;

      setStatus({
        lastGesture: gesture,
        message: `Trigger ${snapshot.label}`,
        activeString: snapshot,
        strum: undefined,
        slide: undefined,
        chord: undefined,
      });

      getEngine().triggerTap(stringIndex, gesture.duration, snapshot.fret);
    },
    [getEngine]
  );

  const captureStrum = useCallback(
    (gesture: Extract<RecognizedGesture, { type: 'strum' }>) => {
      const velocity = mapSpeedToVelocity(gesture.speed);
      const strings = GUITAR_STRINGS.map((entry) => ({ ...entry }));
      lastStringIndexRef.current = gesture.direction === 'down' ? GUITAR_STRINGS.length - 1 : 0;
      lastFretRef.current = 0;
      const chord = detectChordFromFrets(frettedStringsRef.current);

      setStatus({
        lastGesture: gesture,
        message: chord
          ? `Detected ${chord.label} chord`
          : `${gesture.direction === 'down' ? 'Downward' : 'Upward'} strum`,
        activeString: undefined,
        strum: {
          direction: gesture.direction,
          velocity,
          strings,
        },
        slide: undefined,
        chord: chord ?? undefined,
      });

      getEngine().triggerStrum(gesture.direction, gesture.speed);
    },
    [getEngine]
  );

  const captureSlide = useCallback(
    (gesture: Extract<RecognizedGesture, { type: 'slide' }>) => {
      const stringIndex = lastStringIndexRef.current ?? Math.floor(GUITAR_STRINGS.length / 2);
      const stringDef = GUITAR_STRINGS[stringIndex];
      const velocity = mapSpeedToVelocity(gesture.speed);
      const startFret = lastFretRef.current ?? 0;
      const targetFret = computeSlideTargetFret(startFret, gesture.direction, gesture.distance);
      const snapshot = createPitchSnapshot(stringDef, targetFret, 'slide');

      lastStringIndexRef.current = stringIndex;
      lastFretRef.current = snapshot.fret;
      frettedStringsRef.current[stringDef.id] = snapshot.fret;

      setStatus({
        lastGesture: gesture,
        message: `${gesture.direction === 'right' ? 'Forward' : 'Backward'} slide to ${snapshot.label}`,
        activeString: snapshot,
        strum: undefined,
        slide: {
          direction: gesture.direction,
          velocity,
          distance: gesture.distance,
          string: stringDef,
          startFret,
          targetFret,
        },
        chord: undefined,
      });

      getEngine().triggerSlide(stringIndex, gesture.direction, gesture.distance, gesture.speed, startFret);
    },
    [getEngine]
  );

  const playDemo = useCallback(() => {
    if (isDemoPlaying) {
      return;
    }

    clearDemoTimeouts();
    setIsDemoPlaying(true);
    setHeadline(CLASSICAL_DEMO_HEADLINE);
    setStatus((current) => ({
      ...current,
      message: 'Playing classical demo...',
      lastGesture: undefined,
      activeString: undefined,
      strum: undefined,
      slide: undefined,
      chord: undefined,
    }));

    const engine = getEngine();

    CLASSICAL_DEMO_SEQUENCE.forEach((event) => {
      scheduleDemoTimeout(() => {
        const stringIndex = GUITAR_STRINGS.findIndex((entry) => entry.id === event.stringId);
        if (stringIndex === -1) {
          return;
        }

        const stringDef = GUITAR_STRINGS[stringIndex];
        const snapshot = createPitchSnapshot(stringDef, event.fret, 'tap', event.durationMs);

        lastStringIndexRef.current = stringIndex;
        lastFretRef.current = snapshot.fret;
        frettedStringsRef.current[stringDef.id] = snapshot.fret;

        setStatus({
          lastGesture: undefined,
          message: `Demo note ${snapshot.label}`,
          activeString: snapshot,
          strum: undefined,
          slide: undefined,
          chord: undefined,
        });
        setHeadline(`Demo note ${snapshot.label}`);
        engine.triggerTap(stringIndex, event.durationMs, snapshot.fret);
      }, event.atMs);
    });

    scheduleDemoTimeout(() => {
      setIsDemoPlaying(false);
      setHeadline('Demo complete - try your own gestures');
      setStatus((current) => ({
        ...current,
        message: 'Demo complete. Try your own interactions!',
        activeString: undefined,
        strum: undefined,
        slide: undefined,
      }));
    }, CLASSICAL_DEMO_DURATION_MS + DEMO_COMPLETION_DELAY_MS);
  }, [
    clearDemoTimeouts,
    getEngine,
    isDemoPlaying,
    scheduleDemoTimeout,
  ]);

  const handleGesture = useCallback(
    (gesture: RecognizedGesture) => {
      if (isDemoPlaying || demoTimeoutsRef.current.length > 0) {
        clearDemoTimeouts();
        setIsDemoPlaying(false);
      }

      pushGestureToLog(gesture);
      setHeadline(formatGestureInternal(gesture));

      switch (gesture.type) {
        case 'tap':
          captureTap(gesture);
          break;
        case 'strum':
          captureStrum(gesture);
          break;
        case 'slide':
          captureSlide(gesture);
          break;
        case 'unknown':
        default:
          setStatus((current) => ({
            ...current,
            lastGesture: gesture,
            message: gesture.detail,
            activeString: undefined,
            strum: undefined,
            slide: undefined,
            chord: undefined,
          }));
          break;
      }
    },
    [captureSlide, captureStrum, captureTap, clearDemoTimeouts, isDemoPlaying, pushGestureToLog]
  );

  const gesturesWithDescriptions = useMemo(() => gestureLog.map(formatGestureInternal), [gestureLog]);

  useEffect(() => () => {
    clearDemoTimeouts();
  }, [clearDemoTimeouts]);

  return {
    handleGesture,
    headline,
    gestureLog,
    gestureDescriptions: gesturesWithDescriptions,
    status,
    playDemo,
    isDemoPlaying,
  };
};

export const __TESTING__ = {
  GUITAR_STRINGS,
  findStringIndexFromY,
  mapSpeedToVelocity,
  mapTapDurationToVelocity,
  mapDistanceToSlideSemitones,
  computeFretFromRelativeX,
  midiToNoteLabel,
  midiToFrequency,
  createPitchSnapshot,
  computeSlideTargetFret,
  detectChordFromFrets,
  CLASSICAL_DEMO_SEQUENCE,
  CLASSICAL_DEMO_DURATION_MS,
  CLASSICAL_DEMO_HEADLINE,
};
