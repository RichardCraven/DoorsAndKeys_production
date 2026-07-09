jest.mock('@coreui/icons', () => ({}));
jest.mock('@coreui/icons-react', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }) => React.createElement('span', null, children)
  };
});
jest.mock('@coreui/react', () => {
  const React = require('react');
  return {
    CDropdown: ({ children }) => React.createElement('div', null, children),
    CDropdownToggle: ({ children }) => React.createElement('button', null, children),
    CDropdownMenu: ({ children }) => React.createElement('div', null, children),
    CDropdownItem: ({ children }) => React.createElement('button', null, children),
    CCollapse: ({ children }) => React.createElement('div', null, children)
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import PlanesPanel from '../dungonBuilderViews/PlanesPanel';

describe('PlanesPanel component tests', () => {
  let mockProps;

  beforeEach(() => {
    mockProps = {
      tileSize: 30,
      boardSize: 450,
      selectedView: 'dungeon',
      loadedPlane: null,
      planes: [
        {
          id: 'plane-1',
          name: 'dream_0_front',
          valid: true,
          miniboards: [
            { id: 0, tiles: [] }
          ]
        }
      ],
      loadPlane: jest.fn(),
      setViewState: jest.fn(),
      onDragStartDungeon: jest.fn()
    };
  });

  test('clicking a plane in dungeon-view triggers loadPlane and sets view state to plane', () => {
    // Render the panel with the mocked properties
    const { container } = render(<PlanesPanel {...mockProps} />);

    // Find the plane preview container (it has class 'plane-preview')
    const previewContainer = container.querySelector('.plane-preview');
    expect(previewContainer).toBeDefined();

    // Trigger the click event on the plane preview
    fireEvent.click(previewContainer);

    // Verify it called loadPlane with the clicked plane
    expect(mockProps.loadPlane).toHaveBeenCalledWith(mockProps.planes[0]);

    // Verify it switched the view state to 'plane'
    expect(mockProps.setViewState).toHaveBeenCalledWith('plane');
  });

  test('clicking a plane in plane-view does not call setViewState again', () => {
    mockProps.selectedView = 'plane';
    const { container } = render(<PlanesPanel {...mockProps} />);

    const previewContainer = container.querySelector('.plane-preview');
    fireEvent.click(previewContainer);

    // loadPlane is still called
    expect(mockProps.loadPlane).toHaveBeenCalledWith(mockProps.planes[0]);

    // setViewState is not called again since selectedView is already 'plane'
    expect(mockProps.setViewState).not.toHaveBeenCalled();
  });
});
