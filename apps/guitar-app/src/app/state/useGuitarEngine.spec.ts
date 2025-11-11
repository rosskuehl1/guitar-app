import { formatGesture, __TESTING__ } from './useGuitarEngine';

describe('useGuitarEngine helpers', () => {
  const {
    findStringIndexFromY,
    mapSpeedToVelocity,
    mapTapDurationToVelocity,
    mapDistanceToSlideSemitones,
    GUITAR_STRINGS,
    computeFretFromRelativeX,
    midiToNoteLabel,
    midiToFrequency,
    createPitchSnapshot,
    computeSlideTargetFret,
    detectChordFromFrets,
  } = __TESTING__;

  it('formats gestures consistently', () => {
    const headline = formatGesture({
      type: 'strum',
      direction: 'down',
      distance: 160,
      speed: 1.2,
    });

    expect(headline).toBe('DOWN strum • 160px at 1.20v');
  });

  it('maps touch coordinates to the closest string index with clamping', () => {
    expect(findStringIndexFromY(40)).toBe(0);
    expect(findStringIndexFromY(240)).toBe(5);
    expect(findStringIndexFromY(-12)).toBe(0);
    expect(findStringIndexFromY(999)).toBe(GUITAR_STRINGS.length - 1);
  });

  it('converts speeds into normalized velocities with clamping', () => {
    expect(mapSpeedToVelocity(0)).toBeCloseTo(0.25, 2);
    expect(mapSpeedToVelocity(5)).toBeCloseTo(1, 2);
    expect(mapSpeedToVelocity(0.5)).toBeCloseTo(0.3, 1);
  });

  it('inverts tap duration for dynamics inside safe bounds', () => {
    expect(mapTapDurationToVelocity(50)).toBeGreaterThan(0.5);
    expect(mapTapDurationToVelocity(800)).toBeGreaterThan(0.19);
    expect(mapTapDurationToVelocity(800)).toBeLessThan(0.91);
  });

  it('converts slide distance into semitone ranges', () => {
    expect(mapDistanceToSlideSemitones(40)).toBeCloseTo(1, 2);
    expect(mapDistanceToSlideSemitones(400)).toBeCloseTo(6, 2);
    expect(mapDistanceToSlideSemitones(0)).toBeCloseTo(1, 2);
  });

  it('maps normalized horizontal input to frets', () => {
    expect(computeFretFromRelativeX(0.1)).toBe(0);
    expect(computeFretFromRelativeX(0.18)).toBe(1);
    expect(computeFretFromRelativeX(0.5)).toBe(6);
    expect(computeFretFromRelativeX(0.92)).toBe(12);
  });

  it('derives note labels and frequencies from midi values', () => {
    expect(midiToNoteLabel(64)).toBe('E4');
    expect(midiToNoteLabel(66)).toBe('F#4');
    expect(midiToFrequency(69)).toBeCloseTo(440, 2);
  });

  it('builds pitch snapshots for fretted notes', () => {
    const snapshot = createPitchSnapshot(GUITAR_STRINGS[0], 3, 'tap');

    expect(snapshot.label).toBe('G4');
    expect(snapshot.fret).toBe(3);
    expect(snapshot.frequency).toBeCloseTo(midiToFrequency(GUITAR_STRINGS[0].midi + 3), 4);
  });

  it('computes bounded slide targets', () => {
    expect(computeSlideTargetFret(2, 'right', 200)).toBe(7);
    expect(computeSlideTargetFret(2, 'left', 200)).toBe(0);
    expect(computeSlideTargetFret(11, 'right', 400)).toBe(12);
  });

  it('detects a common major chord voicing', () => {
    const chord = detectChordFromFrets({
      highE: 3,
      B: 0,
      G: 0,
      D: 0,
      A: 2,
      lowE: 3,
    });

    expect(chord?.label).toBe('G major');
    expect(chord?.quality).toBe('major');
  });

  it('detects a common minor chord voicing', () => {
    const chord = detectChordFromFrets({
      highE: 0,
      B: 0,
      G: 0,
      D: 2,
      A: 2,
      lowE: 0,
    });

    expect(chord?.label).toBe('E minor');
    expect(chord?.quality).toBe('minor');
  });
});
