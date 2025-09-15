import ErrorPage from '@/pages/error-page';
import LoginPage from '@/pages/login-page';
import RootLayout from '@/pages/root-layout';
import SignUpPage from '@/pages/sign-up-page';
import { childrenRoutes } from '@/routes/routes';
import { Suspense } from 'react';
import { Provider } from 'react-redux';
import {
  createBrowserRouter,
  RouterProvider,
  useLocation
} from 'react-router-dom';
import {
  ToastContainer
} from "react-toastify";
import { store } from './store/store';

// Read token safely and determine authentication state.
// Authenticated only when token is a non-empty string and not the literal "undefined" or "null".
const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
const isAuthenticated = !!token && token !== 'undefined' && token !== 'null' && token.trim() !== '';

function AuthLanding() {
  const location = useLocation()
  const pathname = location.pathname || ''

  if (pathname.includes('/sign-up') || pathname === '/sign-up') return <SignUpPage />
  if (pathname.includes('/login') || pathname === '/login') return <LoginPage />

  const params = new URLSearchParams(location.search)
  const mode = params.get('mode')

  const pref = typeof window !== 'undefined' ? localStorage.getItem('authMode') : null

  if (mode === 'signup' || pref === 'signup') return <SignUpPage />
  return <LoginPage />
}

const router = createBrowserRouter([
  {
    path: '/',
    element: isAuthenticated ? <RootLayout /> : <AuthLanding />,
    errorElement: <ErrorPage />,
    children: childrenRoutes
  },
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