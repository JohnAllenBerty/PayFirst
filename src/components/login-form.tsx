import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiSuccess, AuthToken } from '@/store/api/payFirstApi'
import { useApiLoginMutation, useResendEmailMutation } from '@/store/api/payFirstApi'
import { toast } from 'react-toastify'
import { Link, useNavigate } from 'react-router-dom'

export function LoginForm({
  className,
  onSuccess,
  ...props
}: React.ComponentProps<'form'> & { onSuccess?: () => void }) {
  const [login, { isLoading, isError }] = useApiLoginMutation()
  const [resendEmail, { isLoading: resending }] = useResendEmailMutation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loginError, setLoginError] = useState<{ code?: string; message?: string } | null>(null)
  const navigate = useNavigate()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email || !password) return
    const nextErrors: { email?: string; password?: string } = {}

    if (!email) {
      nextErrors.email = 'Email or username is required'
    }

    if (!password) {
      nextErrors.password = 'Password is required'
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    if (!errors.email && !errors.password) {
      setLoginError(null)
      login({ username: email, password, remember })
        .unwrap()
        .then((res) => {
          // Only navigate after a successful response with a token
          const ok = (res as ApiSuccess<AuthToken>)?.status === true
          const token = ok ? (res as ApiSuccess<AuthToken>).data?.token : undefined
          if (ok && token) {
            if (onSuccess) {
              // Allow caller to handle post-login (e.g., close modal, refetch data) without full reload.
              onSuccess()
              return
            }
            // Default behavior: full page refresh to root so Gate renders dashboard.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const base: string = (() => { try { return ((import.meta as any)?.env?.BASE_URL) || '/' } catch { return '/' } })()
            const prefix = base.replace(/\/$/, '')
            const target = `${prefix}/`
            if (typeof window !== 'undefined') {
              try { sessionStorage.removeItem('auth_modal_open') } catch { /* ignore */ }
              window.location.replace(target)
            } else {
              navigate('/', { replace: true })
            }
          }
        })
        .catch((err) => {
          // Try to extract structured error to detect unverified email
          try {
            const eObj: unknown = err
            let data: unknown = eObj
            if (eObj && typeof eObj === 'object' && 'data' in (eObj as Record<string, unknown>)) {
              data = (eObj as { data: unknown }).data
            }
            const obj = (typeof data === 'object' && data) ? (data as Record<string, unknown>) : {}
            const code = typeof obj.code === 'string' ? obj.code : undefined
            const message = typeof obj.message === 'string' && obj.message !== 'fail'
              ? obj.message
              : (typeof obj.error === 'string' ? obj.error : 'Login failed')
            setLoginError({ code, message })
          } catch {
            setLoginError({ message: 'Login failed' })
          }
        })
    }
  }

  return (
    <form className={cn('flex flex-col gap-6', className)} onSubmit={onSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your email address below to login to your account
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">Email or username</Label>
          <Input
            id="email"
            type="text"
            placeholder="you@email.com or username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <span id="email-error" className="text-sm text-red-600">
              {errors.email}
            </span>
          )}
        </div>
        <div className="grid gap-3">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} /> Show password
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
            </label>
          </div>
          {errors.password && (
            <span id="password-error" className="text-sm text-red-600">
              {errors.password}
            </span>
          )}
          {isError && !loginError && (
            <span className="text-sm text-red-600">Invalid email or password</span>
          )}
          {loginError && (
            <div className="text-sm text-red-600 space-y-2">
              <div>{loginError.message || 'Login failed'}</div>
              {loginError.code === 'email_not_verified' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    className="h-8 rounded-md border px-2 text-xs"
                    disabled={resending || !email.includes('@')}
                    onClick={async () => {
                      try {
                        await resendEmail({ email }).unwrap()
                        toast.success('Verification email sent')
                      } catch {
                        toast.error('Unable to send verification email')
                      }
                    }}
                  >
                    {resending ? 'Sending…' : 'Resend verification email'}
                  </button>
                  <Link to="/verify-email" className="underline">Enter verification code</Link>
                </div>
              )}
            </div>
          )}
        </div>
  <Button type="submit" disabled={isLoading}>{isLoading ? 'Logging in…' : 'Login'}</Button>
      </div>
      <div className="text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link to="/sign-up" className="underline underline-offset-4">
          Sign up
        </Link>
      </div>
    </form>
  )
}