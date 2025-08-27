import LoginPage from '@/pages/login-page';
import RootLayout from '@/pages/root-layout';
import { Suspense } from 'react';
import {
  RouterProvider,
  createBrowserRouter
} from 'react-router-dom';
import {
  ToastContainer
} from "react-toastify";
import { childrenRoutes } from './routes/routes';
import ErrorPage from './pages/error-page';



const isAuthenticated = (localStorage.getItem('isAuthenticated')) ? true : true;

const router = createBrowserRouter([{
  path: '/',
  element: isAuthenticated ? <RootLayout /> : <LoginPage />,
  errorElement: <ErrorPage />,
  children: childrenRoutes
}
]);

export default function App() {
  return (
    <>
      <ToastContainer theme='colored' />
      <Suspense>
        <RouterProvider router={router} />
      </Suspense>
    </>
  )
}
