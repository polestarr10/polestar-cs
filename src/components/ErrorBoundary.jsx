import React from 'react';

// Keeps one broken screen from blanking the whole app. Data is safe in
// localStorage; reloading usually recovers.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-page">
        <div className="max-w-lg w-full rounded-2xl border border-danger/60 bg-panel p-6 space-y-3">
          <div className="text-[18px] font-extrabold text-ink">Something went wrong on this screen</div>
          <div className="text-sm text-ink-2">
            Your inquiries are saved on this device and weren't affected. Reload the page to continue. If it keeps happening, send this message to whoever maintains the app:
          </div>
          <pre className="text-[12.5px] font-mono text-danger-ink-2 bg-field border border-line-3 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-auto">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="btn-coral">Reload</button>
            <button onClick={() => this.setState({ error: null })} className="btn-dark">Try to continue</button>
          </div>
        </div>
      </div>
    );
  }
}
