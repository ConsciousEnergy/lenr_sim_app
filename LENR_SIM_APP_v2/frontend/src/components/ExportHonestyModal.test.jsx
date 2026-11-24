import React from 'react';
import { render, screen, fireEvent } from '../tests/test-utils';
import ExportHonestyModal from './ExportHonestyModal';

describe('ExportHonestyModal', () => {
  test('requires acknowledgment before confirm', () => {
    const onConfirm = jest.fn();
    render(
      <ExportHonestyModal
        open
        onClose={jest.fn()}
        onConfirm={onConfirm}
        testIdPrefix="honesty-test"
      />,
    );
    expect(screen.getByTestId('honesty-test-lenr-proved')).toBeInTheDocument();
    expect(screen.getByTestId('honesty-test-eq-open')).toBeInTheDocument();
    const confirm = screen.getByTestId('honesty-test-confirm');
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByTestId('honesty-test-ack'));
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalled();
  });
});
