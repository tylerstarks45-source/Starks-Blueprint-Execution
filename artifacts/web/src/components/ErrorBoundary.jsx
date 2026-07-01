import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            An unexpected error interrupted this page. You can try again, or head back to your dashboard.
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Reload page
            </button>
            <a
              href="/dashboard"
              className="flex items-center gap-2 px-6 py-2.5 border border-border rounded-lg font-semibold text-foreground hover:bg-muted/30 transition-all"
            >
              <Home className="w-4 h-4" /> Go to dashboard
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
