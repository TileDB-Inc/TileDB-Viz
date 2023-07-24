import * as React from 'react';

interface Props extends React.PropsWithChildren {
  errorHandler?: (err: Error) => void;
  errorState?: (err: Error) => React.ReactNode;
}

interface State {
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.props.errorHandler?.(error);
  }

  render() {
    if (this.state.error && this.props.errorState) {
      return this.props.errorState(this.state.error);
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
