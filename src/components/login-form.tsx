import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLoginMutation } from '@/store/api/authApi'
import { useNavigate } from 'react-router-dom'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const [login, { isLoading, isError }] = useLoginMutation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const navigate = useNavigate()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email || !password) return
    const nextErrors: { email?: string; password?: string } = {}

    if (!email) {
      nextErrors.email = 'Email is required'
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = 'Please enter a valid email'
    }

    if (!password) {
      nextErrors.password = 'Password is required'
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    if (!errors.email && !errors.password) {
      // Call the login mutation here
      login({ username: email, password: password }).then((res) => {
        if (res.data.data) {
          localStorage.setItem('token', (res.data).data.token)
          window.location.href = '/'
        }
      })
    }
  }

  return (
    <form className={cn('flex flex-col gap-6', className)} onSubmit={onSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your email below to login to your account
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
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
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
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
        <Button type="submit" disabled={isLoading}>Login</Button>
      </div>
      <div className="text-center text-sm">
        Don&apos;t have an account?{' '}
        <a href="/sign-up" className="underline underline-offset-4">
          Sign up
        </a>
      </div>
    </form>
  )
}