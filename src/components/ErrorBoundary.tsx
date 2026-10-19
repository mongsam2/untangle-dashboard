import { Component, type ReactNode } from 'react';
import { Notice } from './Page';

interface Props {
  children: ReactNode;
}

// 응답 모양이 예상과 달라 그리기에 실패해도 화면 전체가 비지 않게 한다.
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <Notice>화면을 그리지 못했어요. {this.state.error.message}</Notice>;
    }
    return this.props.children;
  }
}
