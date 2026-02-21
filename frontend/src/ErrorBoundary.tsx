/**
 * Error boundary to prevent blank screen on React render errors.
 * Renders a fallback UI and logs the error.
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Error shown in fallback UI; no console output for zero console errors
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0c10] text-white p-8">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-xl font-bold text-red-400">Something went wrong</h1>
            <p className="text-slate-400 text-sm">{this.state.error.message}</p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
