import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store/store';
import { closeAuthModal } from '@/store/slices/authModalSlice';
import { LoginForm } from '@/components/login-form';

interface AuthModalProps {
  isOpen: boolean;
  reason?: string | null;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, reason, onClose, onSuccess }: AuthModalProps) {
  const dispatch = useDispatch<AppDispatch>();

  const handleClose = () => {
    dispatch(closeAuthModal());
    onClose?.();
  };

  const handleSuccess = () => {
    dispatch(closeAuthModal());
    try { sessionStorage.removeItem('auth_modal_open'); } catch { /* ignore */ }
    onSuccess?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="relogin-title">
      <div className="bg-background w-full max-w-md rounded-md shadow-lg border p-6 relative">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-2 right-2 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Close relogin dialog"
        >
          ✕
        </button>
        <h2 id="relogin-title" className="text-lg font-semibold mb-2">
          Session expired
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          {reason === '401'
            ? 'Your session is no longer valid (401). Please login again to continue.'
            : 'Please login again.'
          }
        </p>
        <LoginForm
          onSuccess={handleSuccess}
          className="mt-2"
        />
      </div>
    </div>
  );
}