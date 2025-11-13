import { useState } from 'react'
import { useForgotPasswordMutation } from '@/store/api/payFirstApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('')
  const [forgot, { isLoading }] = useForgotPasswordMutation()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await forgot({ username: username.trim() }).unwrap()
      if ((res as { status?: boolean })?.status === true) {
        toast.success('If the account exists, a reset link has been sent.')
      } else {
        toast.error('Request failed')
      }
    } catch {
      toast.error('Unable to process your request, try again later.')
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold mb-4">Forgot password</h1>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="fp-username">Email or username</Label>
          <Input id="fp-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={isLoading}>{isLoading ? 'Sending…' : 'Send reset link'}</Button>
        </div>
      </form>
      <div className="mt-4 text-sm">
        <Link to="/login" className="underline underline-offset-4">Back to login</Link>
      </div>
    </div>
  )
}
