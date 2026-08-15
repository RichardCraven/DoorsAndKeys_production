import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FreeWillStatBar from '../FreeWillStatBar';

describe('FreeWillStatBar Component', () => {
  test('renders user level 0 and 0 segments for 0 freeWill points', () => {
    const { container } = render(<FreeWillStatBar freeWill={0} animateOnMount={false} />);
    expect(screen.getByText('LVL 0')).toBeInViewport ? expect(screen.getByText('LVL 0')).toBeInTheDocument() : expect(screen.getByText('LVL 0')).toBeInTheDocument();
    expect(screen.getByText('0 / 100 PTS')).toBeInTheDocument();

    const filledSegments = container.querySelectorAll('.freewill-segment.filled');
    expect(filledSegments.length).toBe(0);
  });

  test('renders user level 1 and 5 segments for 15 freeWill points', () => {
    const { container } = render(<FreeWillStatBar freeWill={15} animateOnMount={false} />);
    expect(screen.getByText('LVL 1')).toBeInTheDocument();
    expect(screen.getByText('15 / 100 PTS')).toBeInTheDocument();

    const filledSegments = container.querySelectorAll('.freewill-segment.filled');
    expect(filledSegments.length).toBe(5);
  });

  test('caps max level at 10 and 10 filled segments for 100 freeWill points', () => {
    const { container } = render(<FreeWillStatBar freeWill={100} animateOnMount={false} />);
    expect(screen.getByText('LVL 10')).toBeInTheDocument();
    expect(screen.getByText('100 / 100 PTS')).toBeInTheDocument();
    expect(screen.getByText('MAX')).toBeInTheDocument();

    const filledSegments = container.querySelectorAll('.freewill-segment.filled');
    expect(filledSegments.length).toBe(10);
  });
});
