import React, { Component, ErrorInfo, ReactNode } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

type BoundaryState = { hasError: boolean };

class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Skill-Flix failed to render:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert" className="min-h-screen bg-[#05070D] text-zinc-100 flex items-center justify-center p-6">
          <section className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
            <h1 className="brand-font text-2xl font-bold">Skill-Flix could not load</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              The app encountered an unexpected error. Refresh the page to try again.
              If it continues, check the browser console for details.
            </p>
            <button className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold hover:bg-blue-500" onClick={() => window.location.reload()}>
              Refresh page
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const mountNode = document.getElementById('root');
if (!mountNode) {
  throw new Error('Skill-Flix mount node #root is missing from index.html.');
}

createRoot(mountNode).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </React.StrictMode>
);
