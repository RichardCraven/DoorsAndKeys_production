import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import BuildMenuModal from '../BuildMenuModal';

describe('BuildMenuModal Escape Key Closing', () => {
    test('calls onClose prop when Escape key is pressed', () => {
        const handleClose = jest.fn();
        render(<BuildMenuModal onClose={handleClose} />);

        fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('calls onClose prop when Esc key is pressed', () => {
        const handleClose = jest.fn();
        render(<BuildMenuModal onClose={handleClose} />);

        fireEvent.keyDown(window, { key: 'Esc', code: 'Escape' });

        expect(handleClose).toHaveBeenCalledTimes(1);
    });
});
