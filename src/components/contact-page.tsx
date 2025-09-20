import React, { useMemo, useState } from 'react'
import { useListContactsQuery, useCreateContactMutation, useListContactGroupsQuery, useUpdateContactMutation, useDeleteContactMutation, type ApiSuccess, type ApiFail, type Paginated, type Contact, type ContactGroup } from '@/store/api/payFirstApi'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'react-toastify'
import { Search, ArrowDownAZ, ArrowUpAZ } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { extractErrorMessage, extractSuccessMessage } from '@/lib/utils'

const ContactPage = () => {
    const [sortAsc, setSortAsc] = useState(true)
    const [page, setPage] = useState(1)
    const pageSize = 10
    const [query, setQuery] = useState('')
    const [search, setSearch] = useState('')

    const { data: contactsRes, isLoading: loadingContacts, isFetching: fetchingContacts } = useListContactsQuery({
        page,
        page_size: pageSize,
        search: search || undefined,
        ordering: sortAsc ? 'name' : '-name',
    })
    const { data: groupsRes, isLoading: loadingGroups, refetch: refetchGroups } = useListContactGroupsQuery()
    const [createContact, { isLoading: creating }] = useCreateContactMutation()
    const [updateContact, { isLoading: updating }] = useUpdateContactMutation()
    const [deleteContact, { isLoading: deleting }] = useDeleteContactMutation()

    const [name, setName] = useState('')
    const [selectedGroups, setSelectedGroups] = useState<number[]>([])
    const [formError, setFormError] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)

    // typing in the search box does not trigger API; searching occurs on Enter or button click
    const [viewingId, setViewingId] = useState<number | null>(null)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [editGroups, setEditGroups] = useState<number[]>([])
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

    const groups = useMemo(() => (groupsRes && typeof groupsRes !== 'string' && (groupsRes as ApiSuccess<ContactGroup[]>)?.status ? (groupsRes as ApiSuccess<ContactGroup[]>)?.data : []), [groupsRes])
    const contactsData = useMemo(() => {
        const res = contactsRes as ApiFail | Paginated<Contact> | ApiSuccess<Paginated<Contact>> | undefined
        if (!res) return { items: [] as Contact[], total: 0 }
        if ((res as ApiSuccess<Paginated<Contact>>).status === true) {
            const ok = res as ApiSuccess<Paginated<Contact>>
            return { items: ok.data.results, total: ok.data.count }
        }
        if ((res as ApiFail).status === false) return { items: [] as Contact[], total: 0 }
        const pg = res as Paginated<Contact>
        if (Array.isArray(pg.results)) return { items: pg.results, total: pg.count }
        return { items: [] as Contact[], total: 0 }
    }, [contactsRes])
    const contacts = contactsData.items
    const totalContacts = contactsData.total
    const groupsFailMessage = typeof groupsRes === 'string' ? groupsRes : (groupsRes && typeof groupsRes !== 'string' && (groupsRes as ApiFail).status === false ? String((groupsRes as ApiFail).error ?? 'Server error') : null)
    const contactsFailMessage = (() => {
        const res = contactsRes as ApiFail | Paginated<Contact> | ApiSuccess<Paginated<Contact>> | undefined
        if (!res) return null
        if ((res as ApiFail).status === false) return String((res as ApiFail).error ?? 'Server error')
        return null
    })()

    const toggleGroup = (id: number, checked: boolean) => {
        setSelectedGroups(prev => checked ? Array.from(new Set([...prev, id])) : prev.filter(g => g !== id))
    }

    const onSubmit = async (e: React.FormEvent): Promise<boolean> => {
        e.preventDefault()
        setFormError(null)
        if (!name.trim()) { setFormError('Name is required'); return false }
        try {
            const res = await createContact({ name: name.trim(), groups: selectedGroups }).unwrap()
            setName('')
            setSelectedGroups([])
            toast.success(extractSuccessMessage(res, 'Contact created'))
            return true
        } catch (e) {
            const msg = extractErrorMessage(e)
            setFormError(msg)
            toast.error(msg)
            return false
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Contacts</h1>
                <p className="text-sm text-muted-foreground">Manage your contacts and assign them to groups.</p>
            </div>

            {groupsFailMessage && (
                <div className="max-w-xl rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between gap-3">
                    <span>{groupsFailMessage}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => refetchGroups()}>Retry</Button>
                </div>
            )}
            <div className="flex items-center justify-between">
                <div />
                <Button size="sm" onClick={() => { setCreateOpen(true); setFormError(null) }}>New Contact</Button>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="font-medium">All contacts</h2>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="relative">
                            <Input
                                value={query}
                                onChange={(e) => { setQuery(e.target.value) }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        setSearch(query.trim().toLowerCase())
                                        setPage(1)
                                    }
                                }}
                                placeholder="Search contacts…"
                                className="pl-8 pr-20 h-9 w-56"
                            />
                            <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-1">
                                <span className="h-5 w-px bg-border mr-1" aria-hidden="true" />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    aria-label="Search"
                                    title="Search"
                                    className="h-9 px-2"
                                    disabled={fetchingContacts}
                                    onClick={() => {
                                        setSearch(query.trim().toLowerCase())
                                        setPage(1)
                                    }}
                                >
                                    Search
                                </Button>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSortAsc(s => !s)} className="gap-1">
                            {sortAsc ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />} Sort
                        </Button>
                    </div>
                </div>
                {contactsFailMessage && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between gap-3">
                        <span>{contactsFailMessage}</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => refetchContacts()}>Retry</Button>
                    </div>
                )}
                {loadingContacts ? (
                    <div className="grid gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between rounded-md border p-3">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : contacts.length ? (
                    <ul className="divide-y rounded-md border">
                        {contacts.map((c) => (
                            <li key={c.id} className="p-3 text-sm flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{c.name}</div>
                                    <div className="text-muted-foreground">{c.groups?.length ?? 0} groups</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setViewingId(c.id)}>View</Button>
                                    <Button size="sm" variant="outline" onClick={() => { setEditingId(c.id); setEditName(c.name); setEditGroups(c.groups || []); }}>Edit</Button>
                                    <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteId(c.id)} disabled={deleting}>Delete</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-sm text-muted-foreground">No contacts found</div>
                )}
                {totalContacts > pageSize && (
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                        <span className="text-xs">Page {page} of {Math.ceil(totalContacts / pageSize)}</span>
                        <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(Math.ceil(totalContacts / pageSize), p + 1))} disabled={page >= Math.ceil(totalContacts / pageSize)}>Next</Button>
                    </div>
                )}
            </div>

            {/* Create modal */}
            {createOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setCreateOpen(false)}>
                    <div className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">New contact</h3>
                            <button className="text-sm text-muted-foreground" onClick={() => setCreateOpen(false)}>Close</button>
                        </div>
                        <form onSubmit={async (e) => { const ok = await onSubmit(e); if (ok) setCreateOpen(false) }} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Groups</Label>
                                <div className="flex flex-wrap gap-3">
                                    {loadingGroups ? (
                                        <span className="text-sm text-muted-foreground">Loading groups…</span>
                                    ) : groups.length ? (
                                        groups.map(g => (
                                            <label key={g.id} className="flex items-center gap-2 text-sm">
                                                <Checkbox checked={selectedGroups.includes(g.id)} onCheckedChange={(c) => toggleGroup(g.id, Boolean(c))} />
                                                <span>{g.name}</span>
                                            </label>
                                        ))
                                    ) : (
                                        <span className="text-sm text-muted-foreground">No groups yet</span>
                                    )}
                                </div>
                            </div>
                            {formError && <div className="text-sm text-red-600">{formError}</div>}
                            <div className="flex items-center justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={creating}>Create</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View sheet */}
            {viewingId !== null && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setViewingId(null)}>
                    <div className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Contact details</h3>
                            <button className="text-sm text-muted-foreground" onClick={() => setViewingId(null)}>Close</button>
                        </div>
                        {(() => {
                            const contact = contacts.find(x => x.id === viewingId)
                            if (!contact) return <div className="text-sm">Not found</div>
                            const groupNames = (contact.groups || []).map(id => groups.find(g => g.id === id)?.name || String(id))
                            return (
                                <div className="text-sm space-y-2">
                                    <div><span className="text-muted-foreground">Name:</span> {contact.name}</div>
                                    <div><span className="text-muted-foreground">Groups:</span> {groupNames.length ? groupNames.join(', ') : '—'}</div>
                                    <div>
                                        <div className="text-muted-foreground">Data:</div>
                                        <pre className="mt-1 max-h-60 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(contact.data ?? {}, null, 2)}</pre>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            )}

            {/* Edit sheet */}
            {editingId !== null && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditingId(null)}>
                    <div className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Edit contact</h3>
                            <button className="text-sm text-muted-foreground" onClick={() => setEditingId(null)}>Close</button>
                        </div>
                        <form
                            className="grid gap-3"
                            onSubmit={async (e) => {
                                e.preventDefault()
                                try {
                                    const id = editingId!
                                    const res = await updateContact({ id, changes: { name: editName.trim(), groups: editGroups } }).unwrap()
                                    toast.success(extractSuccessMessage(res, 'Contact updated'))
                                    setEditingId(null)
                                } catch (e) {
                                    toast.error(extractErrorMessage(e))
                                }
                            }}
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Groups</Label>
                                <div className="flex flex-wrap gap-3">
                                    {groups.map(g => (
                                        <label key={g.id} className="flex items-center gap-2 text-sm">
                                            <Checkbox checked={editGroups.includes(g.id)} onCheckedChange={(c) => setEditGroups(prev => (c ? Array.from(new Set([...prev, g.id])) : prev.filter(x => x !== g.id)))} />
                                            <span>{g.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                                <Button type="submit" disabled={updating}>Save</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {confirmDeleteId !== null && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setConfirmDeleteId(null)}>
                    <div className="bg-background rounded-md p-4 w-[420px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-semibold mb-2">Delete contact</h3>
                        <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                            <Button variant="destructive" disabled={deleting} onClick={async () => {
                                try {
                                    const res = await deleteContact(confirmDeleteId!).unwrap()
                                    toast.success(extractSuccessMessage(res, 'Contact deleted'))
                                } catch (e) {
                                    toast.error(extractErrorMessage(e))
                                } finally {
                                    setConfirmDeleteId(null)
                                }
                            }}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ContactPage
