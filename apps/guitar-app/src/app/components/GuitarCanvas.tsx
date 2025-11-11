import React, { useCallback, useMemo, useRef } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  LayoutRectangle,
  PanResponder,
  PanResponderGestureState,
  PanResponderInstance,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

interface NormalizedPosition {
  x: number;
  y: number;
}

export type RecognizedGesture =
  | {
      type: 'tap';
      position: { x: number; y: number };
      duration: number;
      relativePosition?: NormalizedPosition;
    }
  | {
      type: 'strum';
      direction: 'up' | 'down';
      distance: number;
      speed: number;
      relativePosition?: NormalizedPosition;
    }
  | {
      type: 'slide';
      direction: 'left' | 'right';
      distance: number;
      speed: number;
      relativePosition?: NormalizedPosition;
    }
  | {
      type: 'unknown';
      detail: string;
    };

export interface GuitarCanvasProps {
  onGesture?: (gesture: RecognizedGesture) => void;
}

const TAP_DURATION_MS = 200;
const TAP_MOVEMENT_PX = 12;
const MIN_STRUM_DISTANCE = 120;
const MIN_SLIDE_DISTANCE = 80;
const STRING_COUNT = 6;
const FRET_COUNT = 12;
const STRING_SPACING = 40;
const FIRST_STRING_Y = 40;
const FRET_HORIZONTAL_START = 10;
const FRET_HORIZONTAL_END = 90;
const FRETS_VISIBLE_WIDTH = FRET_HORIZONTAL_END - FRET_HORIZONTAL_START;
const FRET_VERTICAL_PADDING = 28;
const MARKER_FRETS = [3, 5, 7, 9];
const DOUBLE_MARKER_FRETS = [12];
const DOUBLE_MARKER_OFFSET = STRING_SPACING * 0.6;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const getRelativePosition = (
  event: GestureResponderEvent,
  layout?: LayoutRectangle | null
): NormalizedPosition | undefined => {
  if (!layout || layout.width <= 0 || layout.height <= 0) {
    return undefined;
  }

  const { locationX, locationY } = event.nativeEvent;

  return {
    x: clamp01(locationX / layout.width),
    y: clamp01(locationY / layout.height),
  };
};

const handleInterpretation = (
  onGesture: GuitarCanvasProps['onGesture'],
  startTime: number,
  gestureState: PanResponderGestureState,
  event: GestureResponderEvent,
  layout?: LayoutRectangle | null
) => {
  const duration = Date.now() - startTime;
  const absDx = Math.abs(gestureState.dx);
  const absDy = Math.abs(gestureState.dy);
  const relativePosition = getRelativePosition(event, layout);

  if (duration <= TAP_DURATION_MS && absDx <= TAP_MOVEMENT_PX && absDy <= TAP_MOVEMENT_PX) {
    onGesture?.({
      type: 'tap',
      position: {
        x: event.nativeEvent.locationX,
        y: event.nativeEvent.locationY,
      },
      duration,
      relativePosition,
    });
    return;
  }

  if (absDy > absDx && absDy >= MIN_STRUM_DISTANCE) {
    onGesture?.({
      type: 'strum',
      direction: gestureState.dy > 0 ? 'down' : 'up',
      distance: absDy,
      speed: Math.abs(gestureState.vy),
      relativePosition,
    });
    return;
  }

  if (absDx >= MIN_SLIDE_DISTANCE) {
    onGesture?.({
      type: 'slide',
      direction: gestureState.dx > 0 ? 'right' : 'left',
      distance: absDx,
      speed: Math.abs(gestureState.vx),
      relativePosition,
    });
    return;
  }

  onGesture?.({
    type: 'unknown',
    detail: 'No matching gesture pattern detected',
  });
};

export const GuitarCanvas: React.FC<GuitarCanvasProps> = ({ onGesture }) => {
  const startTimestamp = useRef<number>(0);
  const layoutRef = useRef<LayoutRectangle | null>(null);
  const panResponder = useMemo<PanResponderInstance>(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startTimestamp.current = Date.now();
        },
        onPanResponderRelease: (event, gestureState) => {
          handleInterpretation(onGesture, startTimestamp.current, gestureState, event, layoutRef.current);
        },
        onPanResponderTerminate: (event, gestureState) => {
          handleInterpretation(onGesture, startTimestamp.current, gestureState, event, layoutRef.current);
        },
      }),
    [onGesture]
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    layoutRef.current = event.nativeEvent.layout;
  }, []);

  const stringPositions = useMemo(
    () => Array.from({ length: STRING_COUNT }, (_, index) => FIRST_STRING_Y + index * STRING_SPACING),
    []
  );

  const fretPositions = useMemo(
    () =>
      Array.from({ length: FRET_COUNT + 1 }, (_, index) => FRET_HORIZONTAL_START + (index * FRETS_VISIBLE_WIDTH) / FRET_COUNT),
    []
  );

  const fretMarkers = useMemo(() => {
    const firstString = stringPositions[0];
    const lastString = stringPositions[stringPositions.length - 1];
    const centerY = (firstString + lastString) / 2;

    const midpointPercent = (fret: number) => {
      const prev = fretPositions[fret - 1];
      const next = fretPositions[fret];
      if (prev === undefined || next === undefined) {
        return null;
      }
      return `${prev + (next - prev) / 2}%`;
    };

    const markerPoints = MARKER_FRETS.flatMap((fret) => {
      const cx = midpointPercent(fret);
      return cx ? [{ key: `marker-${fret}`, cx, cy: centerY }] : [];
    });

    const doubleMarkers = DOUBLE_MARKER_FRETS.flatMap((fret) => {
      const cx = midpointPercent(fret);
      if (!cx) {
        return [];
      }
      return [
        { key: `marker-${fret}-upper`, cx, cy: centerY - DOUBLE_MARKER_OFFSET / 2 },
        { key: `marker-${fret}-lower`, cx, cy: centerY + DOUBLE_MARKER_OFFSET / 2 },
      ];
    });

    return [...markerPoints, ...doubleMarkers];
  }, [fretPositions, stringPositions]);

  return (
    <View
      style={styles.surface}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
      testID="guitar-canvas-surface"
    >
      <Svg width="100%" height="100%">
        <Rect x={0} y={0} width="100%" height="100%" rx={18} ry={18} fill="#0f172a" />
        {fretPositions.map((xPosition, index) => {
          const x = `${xPosition}%`;
          const isNut = index === 0;
          return (
            <Line
              key={`fret-${index}`}
              x1={x}
              x2={x}
              y1={FIRST_STRING_Y - FRET_VERTICAL_PADDING}
              y2={FIRST_STRING_Y + STRING_SPACING * (STRING_COUNT - 1) + FRET_VERTICAL_PADDING}
              stroke="#1d2a3b"
              strokeOpacity={isNut ? 0.9 : index % 2 === 0 ? 0.55 : 0.35}
              strokeWidth={isNut ? 4 : 2}
            />
          );
        })}
        {stringPositions.map((y, index) => {
          return (
            <Line
              key={`string-${index}`}
              x1="10%"
              x2="90%"
              y1={y}
              y2={y}
              stroke="#f1f5f9"
              strokeOpacity={index === 2 || index === 3 ? 0.9 : 0.6}
              strokeWidth={index < 2 ? 1.5 : index < 4 ? 2 : 2.5}
              strokeLinecap="round"
            />
          );
        })}
        {fretMarkers.map(({ key, cx, cy }) => (
          <Circle key={key} cx={cx} cy={cy} r={6} fill="#334155" />
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
});

export default GuitarCanvas;

export const __TESTING__ = {
  handleInterpretation,
};
