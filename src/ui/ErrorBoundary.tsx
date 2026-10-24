import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../i18n/i18n';
import { reportError } from '../errors';

/** Shows a friendly screen instead of a blank page when a screen crashes, and reports it. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const component = (info.componentStack ?? '').trim().split('\n')[0]?.trim() ?? '';
    reportError(error, `render ${component}`);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="splash">
        <div className="card stack center">
          <span className="big-emoji">🐲💫</span>
          <h2>{i18n.t('crash.title')}</h2>
          <p className="muted">{i18n.t('crash.body')}</p>
          <button className="btn btn-primary" onClick={() => location.reload()}>
            {i18n.t('crash.reload')}
          </button>
          <button className="link-btn" onClick={() => (location.href = '/')}>
            {i18n.t('crash.home')}
          </button>
        </div>
      </div>
    );
  }
}
