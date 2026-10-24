// Basic error reporting: crashes and unhandled errors are sent to the
// `errors` collection in Firestore (see firestore.rules), where they can be
// read in the Firebase console. Reports wait in a small queue until the
// app has signed in, and a session sends at most a few, without repeats.

export interface ErrorReport {
  message: string;
  stack: string;
  /** Where it happened, e.g. "render", "window", "brush-start". */
  where: string;
  url: string;
  ua: string;
  version: string;
  lang: string;
  at: number;
}

const MAX_PER_SESSION = 10;
const LIMITS = { message: 1000, stack: 4000, where: 100, url: 300, ua: 300 };
/** Browser noise that isn't a real problem. */
const IGNORE = [/ResizeObserver loop/, /^Script error\.?$/, /AbortError/];

let sink: ((r: ErrorReport) => void) | null = null;
const queue: ErrorReport[] = [];
const seen = new Set<string>();
let sent = 0;

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

export function reportError(err: unknown, where = 'unknown') {
  const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err));
  const message = cut(`${e.name}: ${e.message}`, LIMITS.message);
  if (IGNORE.some((re) => re.test(e.message))) return;
  const key = `${where}|${message}`;
  if (seen.has(key) || sent >= MAX_PER_SESSION) return;
  seen.add(key);
  sent++;
  console.error(`[error:${where}]`, err);
  const report: ErrorReport = {
    message,
    stack: cut(e.stack ?? '', LIMITS.stack),
    where: cut(where, LIMITS.where),
    url: cut(location.pathname + location.search, LIMITS.url),
    ua: cut(navigator.userAgent, LIMITS.ua),
    version: __APP_VERSION__,
    lang: document.documentElement.lang,
    at: Date.now(),
  };
  if (sink) sink(report);
  else queue.push(report);
}

/** Where reports go once the app can send them (after sign-in). */
export function setErrorSink(fn: ((r: ErrorReport) => void) | null) {
  sink = fn;
  if (fn) queue.splice(0).forEach(fn);
}

export function installErrorHandlers() {
  window.addEventListener('error', (ev) => reportError(ev.error ?? ev.message, 'window'));
  window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason, 'promise'));
}
