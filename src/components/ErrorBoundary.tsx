import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  inline?: boolean;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[React ErrorBoundary Caught Error]:', error);
    console.error('[Component Stack]:', errorInfo.componentStack);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.inline) {
        return (
          <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl space-y-4 my-4 max-w-2xl mx-auto">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="h-6 w-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">
                {this.props.fallbackTitle || 'Something went wrong while loading this view'}
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              A temporary issue prevented this section from rendering. You can retry or refresh the dashboard.
            </p>
            {this.state.error && (
              <div className="p-3 bg-slate-950/90 rounded-xl border border-rose-900/50 font-mono text-[11px] text-rose-300 break-words max-h-32 overflow-y-auto">
                {this.state.error.message || 'Render exception encountered'}
              </div>
            )}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center space-x-2 transition-all shadow-md"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="h-7 w-7 flex-shrink-0" />
              <h2 className="text-lg font-extrabold text-white">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              An unexpected error occurred while rendering the portal component.
            </p>
            {this.state.error && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-rose-900/50 font-mono text-[11px] text-rose-300 break-words whitespace-pre-wrap max-h-48 overflow-y-auto">
                <strong>{this.state.error.name}:</strong> {this.state.error.message}
                {this.state.error.stack && (
                  <div className="mt-2 text-[10px] text-slate-400">
                    {this.state.error.stack}
                  </div>
                )}
              </div>
            )}
            <div className="pt-2 flex justify-end">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center space-x-2 transition-all shadow-md"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
