import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Deliberately verbose: this is the only signal we get from a crash on
    // a device we can't attach devtools to (e.g. a user's phone). Viewport
    // and userAgent distinguish "mobile-only" bugs from data-shape bugs
    // that just happened to only be tested on desktop.
    console.error('Unhandled UI error:', {
      message: error?.message,
      stack: error?.stack,
      componentStack: info?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString(),
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[calc(100vh-4rem)] pt-24 px-4 flex flex-col items-center text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Нещо се обърка</h2>
          <p className="text-slate-400 mb-6">Възникна неочаквана грешка при зареждане на тази страница.</p>
          <Link to="/" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
            Обратно към началото
          </Link>
        </div>
      );
    }

    return this.props.children;
  }
}
