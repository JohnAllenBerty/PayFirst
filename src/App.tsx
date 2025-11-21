import ErrorPage from '@/pages/error-page';
import LoginPage from '@/pages/login-page';
import RootLayout from '@/pages/root-layout';
import SignUpPage from '@/pages/sign-up-page';
import { childrenRoutes } from '@/routes/routes';
// PrivateRoute no longer wraps the root; we inline a Gate component instead.
import { Suspense, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from './store/store';
import { openAuthModal } from './store/slices/authModalSlice';
import { AuthModal } from '@/components/auth-modal';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ToastContainer } from "react-toastify";
import { store } from './store/store';
import ForgotPasswordPage from './pages/forgot-password';
import ResetPasswordPage from './pages/reset-password';
import VerifyEmailPage from './pages/verify-email';
import { MetaProvider } from './context/MetaContext';

// Determine basename from Vite's BASE_URL (e.g., "/PayFirst/") and trim trailing slash for React Router
const BASENAME = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const base: string = ((import.meta as any)?.env?.BASE_URL) || '/'
    return base.endsWith('/') ? base.slice(0, -1) : base
  } catch {
    return ''
  }
})()

function hasToken(): boolean {
  if (typeof window === 'undefined') return false
  // If a 401 occurred and we opened the auth modal, keep RootLayout mounted
  // so the user stays on their current route.
  try {
    const sentinel = sessionStorage.getItem('auth_modal_open')
    if (sentinel === '1') return true
  } catch { /* ignore */ }
  const t = localStorage.getItem('token') || sessionStorage.getItem('token')
  return !!t && t !== 'undefined' && t !== 'null' && t.trim() !== ''
}

// Gate decides what to render at root: Dashboard (RootLayout) if token, else LoginPage.
function Gate() {
  console.log('Gate checking authentication status...', { hasToken: hasToken() })
  return hasToken() ? <RootLayout /> : <LoginPage />
}

// Root route uses Gate so "/" => Dashboard when authenticated, Login when not.
// Child routes remain protected implicitly because Gate won't render an <Outlet /> when unauthenticated.
const router = createBrowserRouter([
  {
    path: '/',
    element: <Gate />,
    errorElement: <ErrorPage />,
    children: childrenRoutes,
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/sign-up', element: <SignUpPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
], { basename: BASENAME });

export default function App() {
  return (
    <Provider store={store}>
      <InnerApp />
    </Provider>
  )
}

function InnerApp() {
  const dispatch = useDispatch<AppDispatch>();
  const authOpen = useSelector((s: RootState) => s.authModal.open);
  const reason = useSelector((s: RootState) => s.authModal.reason);
  console.log('[InnerApp] Auth modal state:', { open: authOpen, reason });

  // Listen for custom 401 events as fallback
  useEffect(() => {
    const handle401Event = (event: CustomEvent) => {
      console.log('[InnerApp] Received 401 event:', event.detail);
      dispatch(openAuthModal(event.detail?.reason || '401'));
    };

    window.addEventListener('payfirst-401', handle401Event as EventListener);
    return () => window.removeEventListener('payfirst-401', handle401Event as EventListener);
  }, [dispatch]);

  return (
    <>
      <ToastContainer theme='colored' />
      <MetaProvider>
        <Suspense fallback={<div className="w-full text-center py-8">Loading...</div>}>
          <RouterProvider router={router} />
        </Suspense>
      </MetaProvider>
      <AuthModal
        isOpen={authOpen}
        reason={reason}
      />
    </>
  )
}