import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResetPasswordMutation } from '@/store/api/payFirstApi'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const uid = searchParams.get('uid') || ''
  const token = searchParams.get('token') || ''

  const [resetPassword, { isLoading }] = useResetPasswordMutation()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({})

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const nextErrors: { newPassword?: string; confirmPassword?: string } = {}

    if (!newPassword) {
      nextErrors.newPassword = 'Password is required'
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = 'Password must be at least 8 characters'
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password'
    } else if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    if (!uid || !token) {
      toast.error('Invalid reset link')
      return
    }

    resetPassword({ _id: uid, token, new_password: newPassword })
      .unwrap()
      .then(() => {
        toast.success('Password reset successful. You can now login with your new password.')
        navigate('/login')
      })
      .catch((error) => {
        const message = error?.data?.detail || error?.data?.new_password?.[0] || 'Failed to reset password. The link may be invalid or expired.'
        toast.error(message)
        setErrors({ newPassword: message })
      })
  }

  return (
    <form className={cn('flex flex-col gap-6', className)} onSubmit={onSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your new password below
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter new password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            aria-invalid={!!errors.newPassword}
            aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
          />
          {errors.newPassword && (
            <span id="new-password-error" className="text-sm text-red-600">
              {errors.newPassword}
            </span>
          )}
        </div>
        <div className="grid gap-3">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm new password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
          />
          {errors.confirmPassword && (
            <span id="confirm-password-error" className="text-sm text-red-600">
              {errors.confirmPassword}
            </span>
          )}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} /> Show password
          </label>
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Resetting…' : 'Reset password'}
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
