import ErrorPage from '@/pages/error-page';
import LoginPage from '@/pages/login-page';
import RootLayout from '@/pages/root-layout';
import SignUpPage from '@/pages/sign-up-page';
import { childrenRoutes } from '@/routes/routes';
import PrivateRoute from '@/routes/PrivateRoute';
import { Suspense } from 'react';
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

// Define public auth routes explicitly and guard app routes with PrivateRoute
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <PrivateRoute>
        <RootLayout />
      </PrivateRoute>
    ),
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
      <ToastContainer theme='colored' />
      <MetaProvider>
        <Suspense fallback={<div className="w-full text-center py-8">Loading...</div>}>
          <RouterProvider router={router} />
        </Suspense>
      </MetaProvider>
    </Provider>
  )
}