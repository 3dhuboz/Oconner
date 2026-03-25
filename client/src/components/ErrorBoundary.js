import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0a1a', color: '#e2e8f0', fontFamily: 'Inter, sans-serif', padding: '2rem'
        }}>
          <div style={{ maxWidth: 600, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ef4444' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
              The page encountered an error. Try refreshing or going back to the home page.
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '1rem', textAlign: 'left', marginBottom: '1.5rem',
              fontSize: '0.8125rem', color: '#f87171', fontFamily: 'monospace', whiteSpace: 'pre-wrap',
              maxHeight: 200, overflow: 'auto'
            }}>
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack && (
                <div style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8,
                  padding: '0.625rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem'
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                style={{
                  background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem'
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
