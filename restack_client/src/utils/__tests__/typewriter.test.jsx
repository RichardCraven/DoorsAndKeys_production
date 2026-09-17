import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Typewriter from '../typewriter';

describe('Typewriter Component', () => {
  test('renders text with default align="left"', () => {
    const { getByText } = render(<Typewriter text="Greetings traveler" delay={30} />);
    const textElem = getByText('Greetings traveler');
    expect(textElem).toBeInTheDocument();
    expect(textElem).toHaveStyle('text-align: left');
    expect(textElem.parentElement).toHaveStyle('justify-content: flex-start');
  });

  test('renders text with align="center" when passed', () => {
    const { getByText } = render(<Typewriter text="Greetings traveler" delay={30} align="center" />);
    const textElem = getByText('Greetings traveler');
    expect(textElem).toBeInTheDocument();
    expect(textElem).toHaveStyle('text-align: center');
    expect(textElem.parentElement).toHaveStyle('justify-content: center');
  });

  test('renders null when text is empty', () => {
    const { container } = render(<Typewriter text="" delay={30} />);
    expect(container.firstChild).toBeNull();
  });
});
