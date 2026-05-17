'use client';

import { Component, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode | ((error: Error) => ReactNode);
  onError?: (error: Error, info: { componentStack: string }) => void;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * Generic React error boundary. Use to isolate failure-prone subtrees
 * (e.g. the 3D cabin preview) from crashing the parent component.
 *
 * Falls back to the provided `fallback` node/function. Optional onError
 * for logging — keep it lean (no PII, no full stacks to bug-monitor).
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.error) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(this.state.error)
        : this.props.fallback;
    }
    return this.props.children;
  }
}
