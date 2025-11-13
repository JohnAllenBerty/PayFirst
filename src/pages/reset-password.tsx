import { useMemo, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useResetPasswordMutation } from '@/store/api/payFirstApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-toastify'

function useQuery() {
    const { search } = useLocation()
    return useMemo(() => new URLSearchParams(search), [search])
}

export default function ResetPasswordPage() {
    const q = useQuery()
    const [token, setToken] = useState(q.get('token') || '')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [reset, { isLoading }] = useResetPasswordMutation()

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirm) { toast.error('Passwords do not match'); return }
        try {
            const res = await reset({ token: token.trim(), password }).unwrap()
            if ((res as { status?: boolean })?.status === true) {
                toast.success('Password has been reset. You can login now.')
            } else {
                toast.error('Reset failed')
            }
        } catch {
            toast.error('Unable to reset password. Check token and try again.')
        }
    }

    return (
        <div className="mx-auto max-w-md p-6">
            <h1 className="text-xl font-semibold mb-4">Reset password</h1>
            <form className="grid gap-3" onSubmit={onSubmit}>
                <div className="grid gap-2">
                    <Label htmlFor="rp-token">Reset token</Label>
                    <Input id="rp-token" value={token} onChange={(e) => setToken(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="rp-pass">New password</Label>
                    <Input id="rp-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="rp-confirm">Confirm password</Label>
                    <Input id="rp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Resetting…' : 'Reset password'}</Button>
                </div>
            </form>
            <div className="mt-4 text-sm">
                <Link to="/login" className="underline underline-offset-4">Back to login</Link>
            </div>
        </div>
    )
}
