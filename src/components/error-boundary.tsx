import type { ReactNode } from 'react';

// Minimal placeholder implementation to avoid build errors.
// Functional components cannot act as React error boundaries, but this stub
// lets us keep the import path stable until a class-based solution is restored.
export function ErrorBoundary({ children }: { children: ReactNode }) {
  return children;
}

export default ErrorBoundary;