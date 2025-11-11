import React from 'react';
import { render } from '@testing-library/react-native';

import App from './App';

describe('App', () => {
  it('renders the guitar canvas page heading', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('page-title')).toHaveTextContent('Guitar Canvas');
    expect(getByTestId('demo-button-label')).toHaveTextContent('Play classical demo');
  });
});
