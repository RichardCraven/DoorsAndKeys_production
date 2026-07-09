jest.mock('react-router-dom', () => ({
  Redirect: ({ to }) => <div data-testid="redirect">Redirect to {to}</div>
}));
jest.mock('react-router', () => ({
  useHistory: () => ({
    push: jest.fn()
  })
}));
jest.mock('../../utils/session-handler', () => ({
  getMeta: jest.fn(() => ({})),
  storeMeta: jest.fn(),
  getUserId: jest.fn(() => '123')
}));
jest.mock('../../utils/api-handler', () => ({
  loadAllDungeonsRequest: jest.fn(() => Promise.resolve({ data: [] })),
  registerRequest: jest.fn()
}));

import React from 'react';
import { render } from '@testing-library/react';
import LoginPage from '../LoginPage';
import LandingPage from '../LandingPage';
import { FEATURE_FLAGS } from '../../utils/feature-flags';

describe('Landing Redux Feature Flag Tests', () => {
  let originalFlagValue;

  beforeAll(() => {
    originalFlagValue = FEATURE_FLAGS.landingRedux;
  });

  afterAll(() => {
    FEATURE_FLAGS.landingRedux = originalFlagValue;
  });

  describe('LoginPage Redux', () => {
    test('renders legacy login layout when feature flag is false', () => {
      FEATURE_FLAGS.landingRedux = false;
      const { container } = render(<LoginPage login={jest.fn()} refreshAllUsers={jest.fn()} />);
      
      const legacyTitle = container.querySelector('.doors-and-keys-title');
      expect(legacyTitle).toBeInTheDocument();
      expect(legacyTitle.textContent).toBe('Doors and Keys');
      
      const newTitle = container.querySelector('.title-glowing');
      expect(newTitle).toBeNull();
    });

    test('renders modern login layout when feature flag is true', () => {
      FEATURE_FLAGS.landingRedux = true;
      const { container } = render(<LoginPage login={jest.fn()} refreshAllUsers={jest.fn()} />);
      
      const newTitle = container.querySelector('.title-glowing');
      expect(newTitle).toBeInTheDocument();
      expect(newTitle.textContent).toContain('Dream Tower');
      
      const legacyTitle = container.querySelector('.doors-and-keys-title');
      expect(legacyTitle).toBeNull();
    });
  });

  describe('LandingPage Redux', () => {
    test('renders legacy landing layout when feature flag is false', () => {
      FEATURE_FLAGS.landingRedux = false;
      const { container } = render(<LandingPage />);
      
      const legacyContainer = container.querySelector('.landing-buttons-container');
      expect(legacyContainer).toBeInTheDocument();
      
      const newGrid = container.querySelector('.landing-main-grid');
      expect(newGrid).toBeNull();
    });

    test('renders modern landing layout when feature flag is true', () => {
      FEATURE_FLAGS.landingRedux = true;
      const { container } = render(<LandingPage />);
      
      const newGrid = container.querySelector('.landing-main-grid');
      expect(newGrid).toBeInTheDocument();
      
      const legacyContainer = container.querySelector('.landing-buttons-container');
      expect(legacyContainer).toBeNull();
    });
  });
});
