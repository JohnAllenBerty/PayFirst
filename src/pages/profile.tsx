import { useProfileQuery, useUpdateProfileMutation, type ApiFail, type ApiSuccess, type Profile } from '@/store/api/payFirstApi'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'react-toastify'
import { extractErrorMessage, extractSuccessMessage } from '@/lib/utils'

const ProfilePage = () => {
    const { data, isLoading, refetch } = useProfileQuery()
    const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation()
    const failMessage = useMemo(() => {
        const res = data as ApiFail | ApiSuccess<Profile> | undefined
        if (!res) return null
        if ((res as ApiFail).status === false) return extractErrorMessage(res)
        return null
    }, [data])

    const profile = (data && typeof data !== 'string' && (data as ApiSuccess<Profile>).status) ? (data as ApiSuccess<Profile>).data : null
    const displayName = useMemo(() => {
        if (!profile) return 'Profile'
        const full = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
        return full || profile.username
    }, [profile])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Profile</h1>
                <p className="text-sm text-muted-foreground">Your account information.</p>
            </div>

            {failMessage && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between gap-3">
                    <span>{failMessage}</span>
                    <button className="h-8 rounded-md border px-3 text-sm" onClick={() => refetch()}>Retry</button>
                </div>
            )}

            {isLoading ? (
                <Card className="max-w-xl">
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-full" />
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Skeleton className="h-9 w-20" />
                    </CardFooter>
                </Card>
            ) : profile ? (
                <ProfileEditor
                    id={profile.id}
                    username={profile.username}
                    first_name={profile.first_name}
                    last_name={profile.last_name}
                    displayName={displayName}
                    onSave={async (changes) => {
                        try {
                            const res = await updateProfile(changes).unwrap()
                            toast.success(extractSuccessMessage(res, 'Profile updated'))
                        } catch (e) {
                            toast.error(extractErrorMessage(e))
                            throw e
                        }
                    }}
                    saving={saving}
                />
            ) : (
                <div className="text-sm text-muted-foreground">No profile data</div>
            )}
        </div>
    )
}

export default ProfilePage

function ProfileEditor({ id, username, first_name, last_name, displayName, onSave, saving }: {
    id: number
    username: string
    first_name: string
    last_name: string
    displayName: string
    saving: boolean
    onSave: (changes: Partial<{ username: string; first_name: string; last_name: string }>) => Promise<void>
}) {
    const [editing, setEditing] = useState(false)
    const [u, setU] = useState(username)
    const [f, setF] = useState(first_name)
    const [l, setL] = useState(last_name)
    const [err, setErr] = useState<string | null>(null)

    const initials = useMemo(() => {
        const parts = [f || first_name, l || last_name].filter(Boolean)
        const s = parts.map(p => (p || '').trim()[0]).filter(Boolean).join('').slice(0, 2)
        return s || (u || username || 'U')[0]?.toUpperCase() || 'U'
    }, [f, l, u, first_name, last_name, username])

    const isDirty = u !== username || f !== first_name || l !== last_name
    const canSave = isDirty && !!u.trim()

    return (
        <Card className="max-w-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                    </Avatar>
                    {displayName}
                </CardTitle>
                <CardDescription>Update your account information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="text-xs text-muted-foreground">User ID: {id}</div>
                {!editing ? (
                    <div className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between"><span className="text-muted-foreground">Username</span><span>{u}</span></div>
                        <div className="flex items-center justify-between"><span className="text-muted-foreground">First name</span><span>{f || '—'}</span></div>
                        <div className="flex items-center justify-between"><span className="text-muted-foreground">Last name</span><span>{l || '—'}</span></div>
                    </div>
                ) : (
                    <form className="grid gap-3" onSubmit={async (e) => {
                        e.preventDefault()
                        setErr(null)
                        if (!u.trim()) { setErr('Username is required'); return }
                        try {
                            await onSave({ username: u.trim(), first_name: f.trim(), last_name: l.trim() })
                            setEditing(false)
                        } catch (e) {
                            // toast is already handled in onSave; keep inline message too
                            setErr(extractErrorMessage(e))
                        }
                    }}>
                        <div className="grid gap-2">
                            <Label htmlFor="u">Username</Label>
                            <Input id="u" value={u} onChange={(e) => setU(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="f">First name</Label>
                            <Input id="f" value={f} onChange={(e) => setF(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="l">Last name</Label>
                            <Input id="l" value={l} onChange={(e) => setL(e.target.value)} />
                        </div>
                        {err && <div className="text-sm text-red-600">{err}</div>}
                        <div className="flex items-center gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={() => { setU(username); setF(first_name); setL(last_name); setErr(null); setEditing(false) }}>Cancel</Button>
                            <Button type="submit" disabled={saving || !canSave}>{saving ? 'Saving…' : 'Save'}</Button>
                        </div>
                    </form>
                )}
            </CardContent>
            <CardFooter className="justify-end">
                {!editing && (
                    <Button size="sm" onClick={() => setEditing(true)}>Edit</Button>
                )}
            </CardFooter>
        </Card>
    )
}
