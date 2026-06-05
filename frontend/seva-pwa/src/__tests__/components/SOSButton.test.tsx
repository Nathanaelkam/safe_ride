import { render, screen, act } from '@testing-library/react';
import { SOSButton } from '@/components/emergency/SOSButton';

// requestAnimationFrame in jsdom doesn't auto-advance with timers; stub it to a
// setTimeout-driven loop so we can deterministically simulate hold progress.
beforeEach(() => {
  let rafId = 0;
  // @ts-ignore
  global.requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafId += 1;
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  };
  // @ts-ignore
  global.cancelAnimationFrame = (id: number) => clearTimeout(id);
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('<SOSButton />', () => {
  it('renders an accessible SOS control', () => {
    render(<SOSButton onTrigger={() => {}} />);
    expect(
      screen.getByRole('button', { name: /press and hold to trigger sos/i })
    ).toBeInTheDocument();
  });

  it('shows the prompt copy', () => {
    render(<SOSButton onTrigger={() => {}} />);
    expect(screen.getByText(/alert your circle/i)).toBeInTheDocument();
  });

  it('does not trigger on a quick tap', () => {
    const onTrigger = jest.fn();
    render(<SOSButton onTrigger={onTrigger} holdMs={1000} />);
    const btn = screen.getByRole('button', { name: /press and hold to trigger sos/i });

    // Quick press and release — well under holdMs
    act(() => {
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    act(() => {
      jest.advanceTimersByTime(150);
    });
    act(() => {
      btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('cancels the trigger when the pointer leaves before holdMs', () => {
    const onTrigger = jest.fn();
    render(<SOSButton onTrigger={onTrigger} holdMs={1000} />);
    const btn = screen.getByRole('button', { name: /press and hold to trigger sos/i });

    act(() => {
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => {
      btn.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(onTrigger).not.toHaveBeenCalled();
  });
});
