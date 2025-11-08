import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForgotPasswordMutation } from '@/store/api/payFirstApi'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<{ email?: string }>({})

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const nextErrors: { email?: string } = {}

    if (!email) {
      nextErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Invalid email format'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    forgotPassword({ email })
      .unwrap()
      .then(() => {
        setSubmitted(true)
        toast.success('Password reset link has been sent to your email')
      })
      .catch((error) => {
        const message = error?.data?.email?.[0] || error?.data?.detail || 'Failed to send reset link'
        toast.error(message)
        setErrors({ email: message })
      })
  }

  if (submitted) {
    return (
      <div className={cn('flex flex-col gap-6', className)}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground text-sm text-balance">
            We've sent a password reset link to <strong>{email}</strong>. 
            Please check your inbox and follow the instructions.
          </p>
        </div>
        <div className="text-center text-sm">
          <Link to="/login" className="underline underline-offset-4">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form className={cn('flex flex-col gap-6', className)} onSubmit={onSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Forgot your password?</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@email.com"
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
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Sending…' : 'Send reset link'}
        </Button>
      </div>
      <div className="text-center text-sm">
        Remember your password?{' '}
        <Link to="/login" className="underline underline-offset-4">
          Back to login
        </Link>
      </div>
    </form>
  )
}
