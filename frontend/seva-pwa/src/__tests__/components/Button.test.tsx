import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/common/Button';

describe('<Button />', () => {
  it('renders its children', () => {
    render(<Button>Begin a ride</Button>);
    expect(screen.getByRole('button', { name: /begin a ride/i })).toBeInTheDocument();
  });

  it('fires onClick when pressed', async () => {
    const handle = jest.fn();
    render(<Button onClick={handle}>Press me</Button>);
    await userEvent.click(screen.getByRole('button', { name: /press me/i }));
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', async () => {
    const handle = jest.fn();
    render(<Button onClick={handle} disabled>Locked</Button>);
    await userEvent.click(screen.getByRole('button', { name: /locked/i }));
    expect(handle).not.toHaveBeenCalled();
  });

  it('applies full-width when fullWidth is set', () => {
    render(<Button fullWidth>Wide</Button>);
    expect(screen.getByRole('button', { name: /wide/i }).className).toMatch(/w-full/);
  });

  it('applies size classes', () => {
    render(<Button size="lg">Big</Button>);
    expect(screen.getByRole('button', { name: /big/i }).className).toMatch(/px-8/);
  });

  it('renders the danger variant with terracotta tones', () => {
    render(<Button variant="danger">SOS</Button>);
    expect(screen.getByRole('button', { name: /sos/i }).className).toMatch(/terracotta/);
  });
});
