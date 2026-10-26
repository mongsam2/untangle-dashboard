import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <div style={{ padding: 24, color: 'var(--text-danger)' }}>화면을 그리지 못했어요. {this.state.error.message}</div>;
    }
    return this.props.children;
  }
}
