import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error('App crashed:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#f87171', marginBottom: '1rem' }}>⚠️ Erro ao carregar o app</h1>
          <pre style={{ color: '#fbbf24', fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxWidth: '600px', textAlign: 'left' }}>
            {this.state.error?.message}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '2rem', padding: '0.5rem 1.5rem', background: '#00d4ff', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
