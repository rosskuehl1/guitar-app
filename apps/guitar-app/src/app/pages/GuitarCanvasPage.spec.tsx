import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import GuitarCanvasPage from './GuitarCanvasPage';
import { __TESTING__ } from '../state/useGuitarEngine';

describe('GuitarCanvasPage demo button', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('plays the demo sequence when pressed', () => {
    const { getByTestId } = render(<GuitarCanvasPage />);
    const demoButton = getByTestId('demo-button');
    const demoLabel = getByTestId('demo-button-label');

    expect(demoLabel).toHaveTextContent('Play classical demo');

    fireEvent.press(demoButton);
    expect(demoLabel).toHaveTextContent('Playing demo...');

    act(() => {
      jest.advanceTimersByTime(__TESTING__.CLASSICAL_DEMO_DURATION_MS + 500);
    });

    expect(demoLabel).toHaveTextContent('Play classical demo');
  });
});
