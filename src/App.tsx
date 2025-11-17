import ErrorPage from '@/pages/error-page';
import LoginPage from '@/pages/login-page';
import RootLayout from '@/pages/root-layout';
import SignUpPage from '@/pages/sign-up-page';
import { childrenRoutes } from '@/routes/routes';
// PrivateRoute no longer wraps the root; we inline a Gate component instead.
import { Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from './store/store';
import { closeAuthModal } from './store/slices/authModalSlice';
import { LoginForm } from '@/components/login-form';
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
  return (
    <>
      <ToastContainer theme='colored' />
      <MetaProvider>
        <Suspense fallback={<div className="w-full text-center py-8">Loading...</div>}>
          <RouterProvider router={router} />
        </Suspense>
      </MetaProvider>
      {authOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="relogin-title">
          <div className="bg-background w-full max-w-md rounded-md shadow-lg border p-6 relative">
            <button
              type="button"
              onClick={() => dispatch(closeAuthModal())}
              className="absolute top-2 right-2 text-sm text-muted-foreground hover:text-foreground"
              aria-label="Close relogin dialog"
            >✕</button>
            <h2 id="relogin-title" className="text-lg font-semibold mb-2">Session expired</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {reason === '401' ? 'Your session is no longer valid (401). Please login again to continue.' : 'Please login again.'}
            </p>
            <LoginForm
              onSuccess={() => {
                dispatch(closeAuthModal())
                try { sessionStorage.removeItem('auth_modal_open') } catch { /* ignore */ }
              }}
              className="mt-2"
            />
          </div>
        </div>
      )}
    </>
  )
}