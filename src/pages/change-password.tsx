import React, { useState } from 'react'
import { useChangePasswordMutation } from '@/store/api/payFirstApi'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'react-toastify'
import { extractErrorMessage, extractSuccessMessage } from '@/lib/utils'

const ChangePasswordPage = () => {
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ password?: string[]; new_password?: string[]; non_field_errors?: string[]; detail?: string }>({})
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [changePassword, { isLoading }] = useChangePasswordMutation()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess(null); setError(null); setFieldErrors({}); setConfirmError(null)
    if (!password || !newPassword) return setError('Both current and new password are required')
    if (newPassword !== confirm) { setConfirmError('New passwords do not match'); return }
    try {
      const res = await changePassword({ password, new_password: newPassword }).unwrap()
      const msg = extractSuccessMessage(res, 'Password changed successfully')
      setSuccess(msg)
      toast.success(msg)
      setPassword(''); setNewPassword(''); setConfirm('')
    } catch (e) {
      // Best-effort parse field errors from server (DRF-style)
      setError((prev) => prev ?? 'Failed to change password')
      const parse = (err: unknown) => {
        if (err && typeof err === 'object') {
          const anyErr = err as Record<string, unknown>
          const data = (anyErr.data ?? anyErr) as Record<string, unknown>
          const source = (typeof data.error === 'object' && data.error) ? (data.error as Record<string, unknown>) : data
          const fe: { password?: string[]; new_password?: string[]; non_field_errors?: string[]; detail?: string } = {}
          const take = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined
          if (source.password) fe.password = take(source.password)
          if (source.new_password) fe.new_password = take(source.new_password)
          if (source.non_field_errors) fe.non_field_errors = take(source.non_field_errors)
          if (typeof source.detail === 'string') fe.detail = source.detail
          if (fe.password || fe.new_password || fe.non_field_errors || fe.detail) return fe
        }
        return undefined
      }
      const fe = parse(e)
      if (fe) setFieldErrors(fe)
      const msg = extractErrorMessage(e)
      setError(msg)
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Change Password</h1>
        <p className="text-sm text-muted-foreground">Update your account password.</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 max-w-md p-4 border rounded-md">
        <div className="grid gap-2">
          <Label htmlFor="current">Current password</Label>
          <Input id="current" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {fieldErrors.password?.length ? (
            <ul className="text-xs text-red-600 list-disc pl-5">
              {fieldErrors.password.map((m, i) => (<li key={i}>{m}</li>))}
            </ul>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new">New password</Label>
          <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          {fieldErrors.new_password?.length ? (
            <ul className="text-xs text-red-600 list-disc pl-5">
              {fieldErrors.new_password.map((m, i) => (<li key={i}>{m}</li>))}
            </ul>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {confirmError ? <div className="text-xs text-red-600">{confirmError}</div> : null}
        </div>
        {fieldErrors.non_field_errors?.length ? (
          <div className="text-sm text-red-600">{fieldErrors.non_field_errors.join(' ')}</div>
        ) : null}
        {fieldErrors.detail ? (
          <div className="text-sm text-red-600">{fieldErrors.detail}</div>
        ) : null}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-600">{success}</div>}
        <div>
          <Button type="submit" disabled={isLoading}>Change password</Button>
        </div>
      </form>
    </div>
  )
}

export default ChangePasswordPage
