import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ErrorReport } from './errors';

beforeAll(() => {
  vi.stubGlobal('location', { pathname: '/kid/1/brush', search: '' });
  vi.stubGlobal('navigator', { userAgent: 'TestPhone' });
  vi.stubGlobal('document', { documentElement: { lang: 'he' } });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('error reporting', () => {
  it('queues until a sink exists, then sends; skips repeats, noise and floods', async () => {
    const { reportError, setErrorSink } = await import('./errors');
    reportError(new Error('boom'), 'render');
    reportError(new Error('boom'), 'render'); // repeat
    reportError(new Error('ResizeObserver loop limit exceeded'), 'window'); // noise
    const got: ErrorReport[] = [];
    setErrorSink((r) => got.push(r));
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ message: 'Error: boom', where: 'render', url: '/kid/1/brush', ua: 'TestPhone', lang: 'he' });
    expect(typeof got[0].version).toBe('string');

    reportError('a string error', 'promise');
    expect(got[1].message).toBe('Error: a string error');

    for (let i = 0; i < 20; i++) reportError(new Error(`e${i}`), 'loop');
    expect(got.length).toBe(10); // capped per session
  });

  it('cuts long messages to what the rules allow', async () => {
    vi.resetModules();
    const { reportError, setErrorSink } = await import('./errors');
    const got: ErrorReport[] = [];
    setErrorSink((r) => got.push(r));
    reportError(new Error('x'.repeat(5000)), 'render');
    expect(got[0].message.length).toBeLessThanOrEqual(1000);
    expect(got[0].stack.length).toBeLessThanOrEqual(4000);
  });
});
