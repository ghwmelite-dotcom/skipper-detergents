import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="container py-20 flex flex-col items-center text-center gap-4 max-w-md"
        >
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            The page hit an unexpected error. Refresh to try again, or head back to the homepage.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>Refresh</Button>
            <Button variant="outline" onClick={() => (window.location.href = '/')}>
              Home
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
