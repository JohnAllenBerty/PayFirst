import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiSuccess, AuthToken } from '@/store/api/payFirstApi'
import { useApiLoginMutation } from '@/store/api/payFirstApi'
import { Link, useLocation, useNavigate } from 'react-router-dom'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const [login, { isLoading, isError }] = useApiLoginMutation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/'

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
  login({ username: email, password, remember })
        .unwrap()
        .then((res) => {
          // Only navigate after a successful response with a token
          const ok = (res as ApiSuccess<AuthToken>)?.status === true
          const token = ok ? (res as ApiSuccess<AuthToken>).data?.token : undefined
          if (ok && token) {
            navigate(from, { replace: true })
          }
        })
        .catch(() => {
          // error handled by isError and message below
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
          {isError && (
            <span className="text-sm text-red-600">
              Invalid email or password
            </span>
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