import React from 'react';
import { render } from '@testing-library/react';
import WalkerAnimatedUnit from '../WalkerAnimatedUnit';

describe('WalkerAnimatedUnit Weapon Swing & Cleave Attack Animation', () => {
  test('renders base walker unit when not attacking', () => {
    const { container } = render(<WalkerAnimatedUnit isMoving={true} isAttacking={false} />);
    const walkerContainer = container.querySelector('.walker-animated-container');
    expect(walkerContainer).toBeInTheDocument();
    expect(walkerContainer).toHaveClass('is-moving');
    expect(walkerContainer).not.toHaveClass('is-attacking');
    expect(container.querySelector('.walker-sawblade-slash-overlay')).not.toBeInTheDocument();
  });

  test('renders sawblade attack animation and slash overlay when isAttacking is true', () => {
    const { container } = render(<WalkerAnimatedUnit isMoving={true} isAttacking={true} />);
    const walkerContainer = container.querySelector('.walker-animated-container');
    expect(walkerContainer).toBeInTheDocument();
    expect(walkerContainer).toHaveClass('is-attacking');
    
    // Sawblade slash overlay must be present
    const slashOverlay = container.querySelector('.walker-sawblade-slash-overlay');
    expect(slashOverlay).toBeInTheDocument();
    
    // SVG cleave path and sparks present
    const svgPath = container.querySelector('path');
    expect(svgPath).toBeInTheDocument();
    expect(svgPath).toHaveAttribute('stroke', 'url(#sawbladeSlashGrad)');
  });
});
