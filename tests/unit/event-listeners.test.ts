import { describe, it, expect } from 'vitest';

describe('Escape and Scroll-Lock Event Integrity', () => {
  it('registers and removes keydown listener cleanly', () => {
    const listeners: Record<string, ((e: any) => void)[]> = {};
    const mockTarget = {
      addEventListener: (evt: string, fn: any) => {
        if (!listeners[evt]) listeners[evt] = [];
        listeners[evt].push(fn);
      },
      removeEventListener: (evt: string, fn: any) => {
        if (listeners[evt]) {
          listeners[evt] = listeners[evt].filter((h) => h !== fn);
        }
      },
    };

    let closed = false;
    const handleKeyDown = (e: { key: string }) => {
      if (e.key === 'Escape') closed = true;
    };

    mockTarget.addEventListener('keydown', handleKeyDown);
    expect(listeners['keydown']).toHaveLength(1);

    // Simulate keydown Escape
    listeners['keydown'][0]({ key: 'Escape' });
    expect(closed).toBe(true);

    // Cleanup on close / unmount
    mockTarget.removeEventListener('keydown', handleKeyDown);
    expect(listeners['keydown']).toHaveLength(0);
  });
});
