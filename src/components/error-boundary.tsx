import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store/store';
import { openAuthModal } from '@/store/slices/authModalSlice';
import { AuthModal } from '@/components/auth-modal';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  isAuthError: boolean;
}

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, isAuthError: false };

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught error', error, info);

    // Check if this is an authentication-related error
    const isAuthError = this.isAuthenticationError(error, info);
    this.setState({ hasError: true, isAuthError });

    // If it's an auth error, trigger the auth modal
    if (isAuthError) {
      this.triggerAuthModal();
    }
  }

  isAuthenticationError(error: unknown, info: ErrorInfo): boolean {
    // Check error message for 401 indicators
    const errorString = String(error);
    if (errorString.includes('401') || errorString.includes('Unauthorized')) {
      return true;
    }

    // Check component stack for auth-related components
    const stackString = info.componentStack || '';
    if (stackString.includes('401') || stackString.includes('auth')) {
      return true;
    }

    // Check if auth modal should be open (from sessionStorage sentinel)
    try {
      const sentinel = sessionStorage.getItem('auth_modal_open');
      if (sentinel === '1') {
        return true;
      }
    } catch {
      // ignore
    }

    return false;
  }

  triggerAuthModal() {
    // Use setTimeout to ensure this runs after the component has mounted
    setTimeout(() => {
      try {
        const globalStore = (typeof window !== 'undefined') ? (window as unknown as { __PAYFIRST_STORE?: { dispatch: (a: unknown) => void } }).__PAYFIRST_STORE : undefined
        if (globalStore) {
          console.log('[ErrorBoundary] Triggering auth modal for caught error');
          globalStore.dispatch(openAuthModal('401'));
          sessionStorage.setItem('auth_modal_open', '1');
        }
      } catch (e) {
        console.warn('[ErrorBoundary] Failed to trigger auth modal:', e);
      }
    }, 0);
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isAuthError) {
        // For auth errors, show the login modal instead of error boundary
        return (
          <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
            <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Session expired</h1>
            <p style={{ marginBottom: '1rem' }}>Please log in again to continue.</p>
            <AuthModalWrapper />
          </div>
        );
      }

      return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Something went wrong.</h1>
          <p style={{ marginBottom: '1rem' }}>An unexpected error occurred and was caught by an error boundary.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, isAuthError: false })}
          >
            Try again
          </button>
        </div>
      );
    }
    return <React.Fragment>{this.props.children}</React.Fragment>;
  }
}

// Wrapper component to use Redux hooks inside class component
function AuthModalWrapper() {
  const dispatch = useDispatch<AppDispatch>();
  const authOpen = useSelector((s: RootState) => s.authModal.open);
  const reason = useSelector((s: RootState) => s.authModal.reason);

  // Ensure modal is open for auth errors
  React.useEffect(() => {
    if (!authOpen) {
      dispatch(openAuthModal('401'));
    }
  }, [authOpen, dispatch]);

  const handleSuccess = () => {
    // Reload the current page after successful login
    window.location.reload();
  };

  return <AuthModal isOpen={true} reason={reason} onSuccess={handleSuccess} />;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps> {
  render() {
    return <ErrorBoundaryClass>{this.props.children}</ErrorBoundaryClass>;
  }
}

export default ErrorBoundary;