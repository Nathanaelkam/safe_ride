import { render, screen } from '@testing-library/react';
import { StatusPill } from '@/components/common/StatusPill';

describe('<StatusPill />', () => {
  it('renders the label', () => {
    render(<StatusPill>All clear</StatusPill>);
    expect(screen.getByText('All clear')).toBeInTheDocument();
  });

  it('applies the safe tone classes', () => {
    const { container } = render(<StatusPill tone="safe">Safe</StatusPill>);
    expect(container.firstChild).toHaveClass('text-sage');
  });

  it('applies the alert tone classes', () => {
    const { container } = render(<StatusPill tone="alert">Alert</StatusPill>);
    expect(container.firstChild?.className).toMatch(/terracotta/);
  });
});
