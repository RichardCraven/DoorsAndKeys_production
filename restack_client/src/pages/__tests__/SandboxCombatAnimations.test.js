import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SandboxPage, { fightersData, ALT_PORTRAITS_MAP } from '../SandboxPage';
import skillsMatrix from '../../utils/skills-matrix';

// Mock assembly animation and images if needed
jest.mock('../../components/assembly-animation', () => () => <div data-testid="assembly-animation" />);

describe('Sandbox Combat Animations - Hollow and Horologist', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Fighter Data Registration', () => {
    test('Hollow is registered in fightersData with portraits and all 6 combat abilities', () => {
      const hollow = fightersData.find(f => f.id === 'hollow');
      expect(hollow).toBeDefined();
      expect(hollow.name).toBe('Hollow');
      expect(hollow.portrait).toBeDefined();
      expect(hollow.altPortrait).toBeDefined();
      expect(ALT_PORTRAITS_MAP.hollow).toBeDefined();

      const abilityIds = hollow.abilities.map(a => a.id);
      expect(abilityIds).toEqual([
        'void_touch',
        'death_grasp',
        'soul_rend',
        'spectral_step',
        'abyssal_chains',
        'dark_apotheosis'
      ]);

      // None of the Hollow abilities should be orphan skills
      hollow.abilities.forEach(ability => {
        expect(skillsMatrix[ability.id]).toBeDefined();
      });
    });

    test('Horologist is registered in fightersData with portraits and all 6 combat abilities', () => {
      const horologist = fightersData.find(f => f.id === 'horologist');
      expect(horologist).toBeDefined();
      expect(horologist.name).toBe('Horologist');
      expect(horologist.portrait).toBeDefined();
      expect(horologist.altPortrait).toBeDefined();
      expect(ALT_PORTRAITS_MAP.horologist).toBeDefined();

      const abilityIds = horologist.abilities.map(a => a.id);
      expect(abilityIds).toEqual([
        'future_echo',
        'set_anchor',
        'recall',
        'hour_of_reckoning',
        'rewind_step',
        'stopwatch'
      ]);

      // None of the Horologist abilities should be orphan skills
      horologist.abilities.forEach(ability => {
        expect(skillsMatrix[ability.id]).toBeDefined();
      });
    });
  });

  describe('Sandbox UI Interaction', () => {
    test('selecting Hollow displays abilities and triggers combat animations', () => {
      jest.useFakeTimers();
      const { container } = render(
        <MemoryRouter>
          <SandboxPage />
        </MemoryRouter>
      );

      // Find Hollow tab in fighters list
      const hollowItem = screen.getByText('Hollow');
      expect(hollowItem).toBeInTheDocument();

      // Click to select Hollow
      act(() => {
        fireEvent.click(hollowItem);
      });

      // Verify Hollow abilities are rendered in the ability panel
      expect(screen.getByText('Void Touch')).toBeInTheDocument();
      expect(screen.getByText('Death Grasp')).toBeInTheDocument();
      expect(screen.getByText('Soul Rend')).toBeInTheDocument();
      expect(screen.getByText('Spectral Step')).toBeInTheDocument();
      expect(screen.getByText('Abyssal Chains')).toBeInTheDocument();
      expect(screen.getByText('Dark Apotheosis')).toBeInTheDocument();

      // Trigger Void Touch
      act(() => {
        fireEvent.click(screen.getByText('Void Touch'));
      });
      act(() => {
        jest.advanceTimersByTime(1200);
      });

      // Trigger Death Grasp
      act(() => {
        fireEvent.click(screen.getByText('Death Grasp'));
      });
      act(() => {
        jest.advanceTimersByTime(1200);
      });

      // Trigger Soul Rend
      act(() => {
        fireEvent.click(screen.getByText('Soul Rend'));
      });
      act(() => {
        jest.advanceTimersByTime(1200);
      });

      // Trigger Spectral Step
      act(() => {
        fireEvent.click(screen.getByText('Spectral Step'));
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Trigger Abyssal Chains
      act(() => {
        fireEvent.click(screen.getByText('Abyssal Chains'));
      });
      act(() => {
        jest.advanceTimersByTime(1200);
      });

      // Trigger Dark Apotheosis
      act(() => {
        fireEvent.click(screen.getByText('Dark Apotheosis'));
      });
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      jest.useRealTimers();
    });

    test('selecting Horologist displays abilities and triggers combat animations', () => {
      jest.useFakeTimers();
      const { container } = render(
        <MemoryRouter>
          <SandboxPage />
        </MemoryRouter>
      );

      // Find Horologist tab in fighters list
      const horoItem = screen.getByText('Horologist');
      expect(horoItem).toBeInTheDocument();

      // Click to select Horologist
      act(() => {
        fireEvent.click(horoItem);
      });

      // Verify Horologist abilities are rendered
      expect(screen.getByText('Future Echo')).toBeInTheDocument();
      expect(screen.getByText('Set Anchor')).toBeInTheDocument();
      expect(screen.getByText('Recall')).toBeInTheDocument();
      expect(screen.getByText('Hour of Reckoning')).toBeInTheDocument();
      expect(screen.getByText('Rewind Step')).toBeInTheDocument();
      expect(screen.getByText('Stopwatch')).toBeInTheDocument();

      // Trigger Future Echo
      act(() => {
        fireEvent.click(screen.getByText('Future Echo'));
      });
      act(() => {
        jest.advanceTimersByTime(1400);
      });

      // Trigger Set Anchor
      act(() => {
        fireEvent.click(screen.getByText('Set Anchor'));
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Trigger Recall
      act(() => {
        fireEvent.click(screen.getByText('Recall'));
      });
      act(() => {
        jest.advanceTimersByTime(1300);
      });

      // Trigger Hour of Reckoning
      act(() => {
        fireEvent.click(screen.getByText('Hour of Reckoning'));
      });
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Trigger Rewind Step
      act(() => {
        fireEvent.click(screen.getByText('Rewind Step'));
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Trigger Stopwatch
      act(() => {
        fireEvent.click(screen.getByText('Stopwatch'));
      });
      act(() => {
        jest.advanceTimersByTime(1300);
      });

      jest.useRealTimers();
    });

    test('toggling alternate portraits works for Hollow and Horologist', () => {
      const { container } = render(
        <MemoryRouter>
          <SandboxPage />
        </MemoryRouter>
      );

      // Select Hollow
      const hollowItem = screen.getByText('Hollow');
      act(() => {
        fireEvent.click(hollowItem);
      });

      // Find the ALT toggle buttons
      const altButtons = screen.getAllByText('ALT');
      expect(altButtons.length).toBeGreaterThan(0);

      // Click an ALT toggle button
      act(() => {
        fireEvent.click(altButtons[altButtons.length - 2]); // Hollow ALT
      });

      // Select Horologist
      const horoItem = screen.getByText('Horologist');
      act(() => {
        fireEvent.click(horoItem);
      });

      // Click Horologist ALT toggle
      act(() => {
        fireEvent.click(altButtons[altButtons.length - 1]); // Horologist ALT
      });
    });
  });
});
