import { useProfileQuery, useUpdateProfileMutation } from '@/store/api/payFirstApi'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const ProfilePage = () => {
  const { data, isLoading, refetch } = useProfileQuery()
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation()
  const failMessage = data && !data.status ? String(data.error ?? 'Server error') : null

  const profile = data?.status ? data.data : null

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
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : profile ? (
        <ProfileEditor
          id={profile.id}
          username={profile.username}
          first_name={profile.first_name}
          last_name={profile.last_name}
          onSave={async (changes) => {
            await updateProfile(changes).unwrap()
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

function ProfileEditor({ id, username, first_name, last_name, onSave, saving }: {
  id: number
  username: string
  first_name: string
  last_name: string
  saving: boolean
  onSave: (changes: Partial<{ username: string; first_name: string; last_name: string }>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [u, setU] = useState(username)
  const [f, setF] = useState(first_name)
  const [l, setL] = useState(last_name)

  return (
    <div className="grid gap-3 max-w-md p-4 border rounded-md">
      <div className="flex items-center justify-between text-sm"><span>ID</span><span>{id}</span></div>
      {!editing ? (
        <>
          <div className="flex items-center justify-between text-sm"><span>Username</span><span>{u}</span></div>
          <div className="flex items-center justify-between text-sm"><span>First name</span><span>{f}</span></div>
          <div className="flex items-center justify-between text-sm"><span>Last name</span><span>{l}</span></div>
          <div className="pt-2">
            <Button size="sm" onClick={() => setEditing(true)}>Edit</Button>
          </div>
        </>
      ) : (
        <form className="grid gap-3" onSubmit={async (e) => {
          e.preventDefault()
          await onSave({ username: u, first_name: f, last_name: l })
          setEditing(false)
        }}>
          <div>
            <label className="text-xs text-muted-foreground">Username</label>
            <Input value={u} onChange={(e) => setU(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">First name</label>
            <Input value={f} onChange={(e) => setF(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Last name</label>
            <Input value={l} onChange={(e) => setL(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => { setU(username); setF(first_name); setL(last_name); setEditing(false) }}>Cancel</Button>
            <Button type="submit" disabled={saving}>Save</Button>
          </div>
        </form>
      )}
    </div>
  )
}
