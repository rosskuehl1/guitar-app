import { __TESTING__ } from './GuitarCanvas';

describe('GuitarCanvas gesture interpretation', () => {
  const { handleInterpretation } = __TESTING__;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('recognizes a tap gesture', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const onGesture = jest.fn();
    const layout = { width: 200, height: 300, x: 0, y: 0 } as const;

    handleInterpretation(
      onGesture,
      now - 120,
      {
        dx: 4,
        dy: 6,
        vx: 0,
        vy: 0,
      } as never,
      {
        nativeEvent: {
          locationX: 42,
          locationY: 128,
        },
      } as never,
      layout
    );

    expect(onGesture).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tap',
        position: { x: 42, y: 128 },
        duration: 120,
        relativePosition: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      })
    );
  });

  it('recognizes a downward strum', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const onGesture = jest.fn();
    const layout = { width: 260, height: 320, x: 0, y: 0 } as const;

    handleInterpretation(
      onGesture,
      now - 600,
      {
        dx: 20,
        dy: 180,
        vx: 0.1,
        vy: 1.4,
      } as never,
      {
        nativeEvent: {
          locationX: 20,
          locationY: 200,
        },
      } as never,
      layout
    );

    expect(onGesture).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'strum',
        direction: 'down',
        distance: 180,
        speed: 1.4,
        relativePosition: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      })
    );
  });
});
