import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import 'highlight.js/styles/github-dark.css';
import './index.css';

interface ErrorBoundaryState {
  errorMessage: string | null;
  errorStack: string | null;
}

class RootErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    errorMessage: null,
    errorStack: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      errorMessage: error.message,
      errorStack: error.stack ?? null,
    };
  }

  componentDidCatch(error: Error) {
    console.error('Error al renderizar la aplicacion.', error);
  }

  render() {
    if (!this.state.errorMessage) {
      return this.props.children;
    }

    return (
      <div
        style={{
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
          fontFamily:
            'Segoe UI, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          minHeight: '100vh',
          padding: '32px',
        }}
      >
        <div
          style={{
            border: '1px solid rgba(248, 113, 113, 0.4)',
            borderRadius: '20px',
            margin: '0 auto',
            maxWidth: '960px',
            padding: '24px',
          }}
        >
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
            La aplicacion no ha podido renderizarse
          </h1>
          <p style={{ color: '#cbd5e1', lineHeight: 1.6, marginBottom: '20px' }}>
            Se ha capturado un error en tiempo de ejecucion. Copia este mensaje para
            revisarlo:
          </p>
          <pre
            style={{
              backgroundColor: '#020617',
              borderRadius: '16px',
              overflowX: 'auto',
              padding: '20px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {this.state.errorMessage}
            {this.state.errorStack ? `\n\n${this.state.errorStack}` : ''}
          </pre>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
