import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

function hasToken() {
  if (typeof window === 'undefined') return false
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return !!token && token !== 'undefined' && token !== 'null' && token.trim() !== ''
}

export default function PrivateRoute({ children }: { children: React.ReactElement }) {
  const location = useLocation()
  if (!hasToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}
