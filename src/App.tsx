import ErrorPage from '@/pages/error-page';
import LoginPage from '@/pages/login-page';
import ForgotPasswordPage from '@/pages/forgot-password-page';
import ResetPasswordPage from '@/pages/reset-password-page';
import RootLayout from '@/pages/root-layout';
import SignUpPage from '@/pages/sign-up-page';
import { childrenRoutes } from '@/routes/routes';
import PrivateRoute from '@/routes/PrivateRoute';
import { Suspense } from 'react';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ToastContainer } from "react-toastify";
import { store } from './store/store';

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
]);

export default function App() {
  return (
    <Provider store={store}>
      <ToastContainer theme='colored' />
      <Suspense fallback={<div className="w-full text-center py-8">Loading...</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </Provider>
  )
}