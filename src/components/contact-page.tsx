import React, { useMemo, useState } from 'react'
import { useListContactsQuery, useCreateContactMutation, useListContactGroupsQuery, useUpdateContactMutation, useDeleteContactMutation, type ApiSuccess, type ApiFail, type Paginated, type Contact, type ContactGroup } from '@/store/api/payFirstApi'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'react-toastify'
import { Search, ArrowDownAZ, ArrowUpAZ, ChevronDown, ChevronRight, FolderTree, LayoutList } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { extractErrorMessage, extractSuccessMessage } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ContactPage = () => {
    const [ordering, setOrdering] = useState<string>('name')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [treeView, setTreeView] = useState(false)
    const [query, setQuery] = useState('')
    const [filters, setFilters] = useState<{ name: string }>({ name: '' })

    const [refresh, setRefresh] = useState(0)
    const { data: contactsRes, isLoading: loadingContacts, isFetching: fetchingContacts } = useListContactsQuery({
        page: treeView ? 1 : page,
        page_size: treeView ? 1000 : pageSize,
        ordering,
        // Map to DRF SearchFilter 'search' across name and group name
        search: filters.name || undefined,
        refresh, // noop param to force refetch on demand
    })
    const { data: groupsRes, isLoading: loadingGroups, refetch: refetchGroups } = useListContactGroupsQuery()
    const [createContact, { isLoading: creating }] = useCreateContactMutation()
    const [updateContact, { isLoading: updating }] = useUpdateContactMutation()
    const [deleteContact, { isLoading: deleting }] = useDeleteContactMutation()

    const [name, setName] = useState('')
    const [selectedGroups, setSelectedGroups] = useState<number[]>([])
    const [dataField, setDataField] = useState('')
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
        const res = contactsRes as ApiFail | Paginated<Contact> | ApiSuccess<Paginated<Contact> | Contact[]> | undefined
        if (!res) return { items: [] as Contact[], total: 0 }
        if ((res as ApiSuccess<Paginated<Contact> | Contact[]>).status === true) {
            const ok = res as ApiSuccess<Paginated<Contact> | Contact[]>
            const data = ok.data
            if (Array.isArray(data)) return { items: data, total: data.length }
            return { items: data.results ?? [], total: data.count ?? (data.results ? data.results.length : 0) }
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
        let parsedData: Record<string, unknown> = {}
        if (dataField.trim()) {
            try {
                parsedData = JSON.parse(dataField)
            } catch {
                setFormError('Data must be valid JSON')
                return false
            }
        }
        try {
            const res = await createContact({ name: name.trim(), groups: selectedGroups, data: parsedData }).unwrap()
            setName('')
            setSelectedGroups([])
            setDataField('')
            toast.success(extractSuccessMessage(res, 'Contact created'))
            return true
        } catch (e) {
            const msg = extractErrorMessage(e)
            setFormError(msg)
            toast.error(msg)
            return false
        }
    }

    // Build Group tree for tree view
    type GroupTreeNode = { id: number; name: string; parent_group?: number | null; children: GroupTreeNode[] }
    const hasNested = useMemo(() => Array.isArray(groups) && groups.some((g: ContactGroup & { subgroups?: ContactGroup[] }) => Array.isArray(g.subgroups) && g.subgroups.length > 0), [groups])
    const groupTree: GroupTreeNode[] = useMemo(() => {
        if (!groups) return []
        if (hasNested) {
            const toNode = (g: ContactGroup & { subgroups?: ContactGroup[] }): GroupTreeNode => ({ id: g.id, name: g.name, parent_group: g.parent_group ?? null, children: Array.isArray(g.subgroups) ? g.subgroups.map(toNode) : [] })
            return (groups as (ContactGroup & { subgroups?: ContactGroup[] })[]).map(toNode)
        }
        const byId = new Map<number, GroupTreeNode>()
        const roots: GroupTreeNode[] = []
        ;(groups as ContactGroup[]).forEach((g) => byId.set(g.id, { id: g.id, name: g.name, parent_group: g.parent_group ?? null, children: [] }))
        ;(groups as ContactGroup[]).forEach((g) => {
            const node = byId.get(g.id)!
            if (g.parent_group && byId.has(g.parent_group)) {
                byId.get(g.parent_group)!.children.push(node)
            } else {
                roots.push(node)
            }
        })
        return roots
    }, [groups, hasNested])

    const contactsByGroup = useMemo(() => {
        const map = new Map<number, Contact[]>()
        contacts.forEach((c) => {
            const gs = c.groups || []
            gs.forEach((gid) => {
                const list = map.get(gid) || []
                list.push(c)
                map.set(gid, list)
            })
        })
        return map
    }, [contacts])

    const ungroupedContacts = useMemo(() => contacts.filter((c) => !c.groups || c.groups.length === 0), [contacts])

    type TreeGroupNodeProps = {
        node: GroupTreeNode
        depth: number
        contactsByGroup: Map<number, Contact[]>
        onView: (id: number) => void
        onEdit: (c: Contact) => void
        onDelete: (id: number) => void
    }

    const TreeGroupNode: React.FC<TreeGroupNodeProps> = ({ node, depth, contactsByGroup, onView, onEdit, onDelete }) => {
        const [open, setOpen] = React.useState(true)
        const children = node.children || []
        const contactList = contactsByGroup.get(node.id) || []
        const hasChildren = children.length > 0
        const hasContacts = contactList.length > 0
        return (
            <li className="text-sm" style={{ paddingLeft: depth * 12 }}>
                <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                        {(hasChildren || hasContacts) ? (
                            <button type="button" aria-label={open ? 'Collapse' : 'Expand'} className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => setOpen(o => !o)}>
                                {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </button>
                        ) : (
                            <span className="inline-block w-4" />
                        )}
                        <div className="font-medium flex items-center gap-2">
                            <span>{node.name}</span>
                            {(hasContacts || hasChildren) && (
                                <span className="text-xs text-muted-foreground">({contactList.length}{hasChildren ? `, ${children.length} sub` : ''})</span>
                            )}
                        </div>
                    </div>
                </div>
                {open && (
                    <div className="ml-3">
                        {hasContacts && (
                            <ul className="space-y-1">
                                {contactList.map((c) => (
                                    <li key={c.id} className="flex items-center justify-between">
                                        <span>{c.name}</span>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => onView(c.id)}>View</Button>
                                            <Button size="sm" variant="outline" onClick={() => onEdit(c)}>Edit</Button>
                                            <Button size="sm" variant="destructive" onClick={() => onDelete(c.id)} disabled={deleting}>Delete</Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {children.length > 0 && (
                            <ul className="border-l pl-3 mt-1">
                                {children.map((child) => (
                                    <TreeGroupNode
                                        key={child.id}
                                        node={child}
                                        depth={depth + 1}
                                        contactsByGroup={contactsByGroup}
                                        onView={onView}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </li>
        )
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
                    <div className="flex items-center gap-3 text-sm">
                        {!treeView && (
                            <div className="flex items-center gap-2">
                                <label className="text-muted-foreground" htmlFor="contact-page-size">Rows per page</label>
                                <select
                                    id="contact-page-size"
                                    className="h-8 rounded-md border bg-background px-2 text-sm"
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        )}
                        <Button variant={treeView ? 'default' : 'outline'} size="sm" className="gap-1" onClick={() => { setTreeView(true); setPage(1) }}>
                            <FolderTree className="size-4" /> Tree
                        </Button>
                        <Button variant={!treeView ? 'default' : 'outline'} size="sm" className="gap-1" onClick={() => setTreeView(false)}>
                            <LayoutList className="size-4" /> List
                        </Button>
                    </div>
                </div>
                {contactsFailMessage && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between gap-3">
                        <span>{contactsFailMessage}</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => setRefresh((c) => c + 1)}>Retry</Button>
                    </div>
                )}
                {!treeView ? (
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead
                                    className="cursor-pointer select-none"
                                    onClick={() => setOrdering((prev) => prev === 'name' ? '-name' : 'name')}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        Name {ordering.includes('name') && (ordering.startsWith('-') ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />)}
                                    </span>
                                </TableHead>
                                <TableHead>Groups</TableHead>
                                <TableHead className="w-[1%] whitespace-nowrap text-right pr-3">Actions</TableHead>
                            </TableRow>
                            {/* Filters row */}
                            <TableRow>
                                <TableCell>
                                    <div className="relative">
                                        <Input
                                            value={query}
                                            onChange={(e) => { setQuery(e.target.value) }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    setFilters({ name: query.trim().toLowerCase() })
                                                    setPage(1)
                                                }
                                            }}
                                            placeholder="Filter name…"
                                            className="pl-8 h-8"
                                        />
                                        <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
                                    </div>
                                </TableCell>
                                <TableCell />
                                <TableCell className="text-right pr-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        disabled={fetchingContacts}
                                        onClick={() => { setFilters({ name: query.trim().toLowerCase() }); setPage(1) }}
                                    >
                                        Apply
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingContacts ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell className="text-right pr-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Skeleton className="h-8 w-16" />
                                                <Skeleton className="h-8 w-16" />
                                                <Skeleton className="h-8 w-16" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : contacts.length ? (
                                contacts.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <div className="font-medium">{c.name}</div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {(() => {
                                                const idToGroup = new Map<number, ContactGroup>()
                                                groups.forEach(g => idToGroup.set(g.id, g))
                                                const toPath = (gid: number): string => {
                                                    const segs: string[] = []
                                                    let cur: ContactGroup | undefined = idToGroup.get(gid)
                                                    const guard = new Set<number>()
                                                    while (cur && !guard.has(cur.id)) {
                                                        guard.add(cur.id)
                                                        segs.unshift(cur.name)
                                                        if (cur.parent_group && idToGroup.has(cur.parent_group)) {
                                                            cur = idToGroup.get(cur.parent_group)
                                                        } else {
                                                            break
                                                        }
                                                    }
                                                    return segs.join(' > ')
                                                }
                                                const ids = c.groups || []
                                                if (!ids.length) return '—'
                                                const paths = ids.map(toPath).filter(Boolean)
                                                return paths.length ? paths.join(', ') : (ids.map(id => idToGroup.get(id)?.name || String(id)).join(', '))
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-right pr-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setViewingId(c.id)}>View</Button>
                                                <Button size="sm" variant="outline" onClick={() => { setEditingId(c.id); setEditName(c.name); setEditGroups(c.groups || []); }}>Edit</Button>
                                                <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteId(c.id)} disabled={deleting}>Delete</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-sm text-muted-foreground">
                                        No contacts found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                ) : (
                <div className="rounded-md border divide-y">
                    {/* Filters row for Tree view */}
                    <div className="flex items-center justify-between p-2">
                        <div className="relative">
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setFilters({ name: query.trim().toLowerCase() }); setPage(1) } }}
                                placeholder="Filter name…"
                                className="pl-8 h-8 w-64"
                            />
                            <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" disabled={fetchingContacts} onClick={() => { setFilters({ name: query.trim().toLowerCase() }); setPage(1) }}>Apply</Button>
                    </div>
                    <ul className="p-2">
                        {groupTree.map((node) => (
                            <TreeGroupNode
                                key={node.id}
                                node={node}
                                depth={0}
                                contactsByGroup={contactsByGroup}
                                onView={(id) => setViewingId(id)}
                                onEdit={(c) => { setEditingId(c.id); setEditName(c.name); setEditGroups(c.groups || []) }}
                                onDelete={(id) => setConfirmDeleteId(id)}
                            />
                        ))}
                        {/* Ungrouped contacts */}
                        {ungroupedContacts.length > 0 && (
                            <li className="pt-2">
                                <div className="font-medium text-sm mb-1">Ungrouped</div>
                                <ul className="ml-3 space-y-1">
                                    {ungroupedContacts.map((c) => (
                                        <li key={c.id} className="flex items-center justify-between text-sm">
                                            <span>{c.name}</span>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setViewingId(c.id)}>View</Button>
                                                <Button size="sm" variant="outline" onClick={() => { setEditingId(c.id); setEditName(c.name); setEditGroups(c.groups || []) }}>Edit</Button>
                                                <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteId(c.id)} disabled={deleting}>Delete</Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        )}
                        {groupTree.length === 0 && ungroupedContacts.length === 0 && (
                            <li className="text-sm text-muted-foreground">No contacts found</li>
                        )}
                    </ul>
                </div>
                )}
                {(() => {
                    const totalPages = Math.max(1, Math.ceil(totalContacts / pageSize))
                    return !treeView && totalContacts > 0 ? (
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                            <span className="text-xs">Page {page} of {totalPages}</span>
                            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                        </div>
                    ) : null
                })()}
            </div>
            {/* TreeGroupNode component defined above is used in tree view */}

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
                                <Label htmlFor="data">Data (JSON)</Label>
                                <textarea
                                    id="data"
                                    className="min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm font-mono"
                                    placeholder='{"phone": "123-456-7890"}'
                                    value={dataField}
                                    onChange={e => setDataField(e.target.value)}
                                />
                                <span className="text-xs text-muted-foreground">Optional. Must be valid JSON.</span>
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
                                let parsedData: Record<string, unknown> = {}
                                if (dataField.trim()) {
                                    try {
                                        parsedData = JSON.parse(dataField)
                                    } catch {
                                        toast.error('Data must be valid JSON')
                                        return
                                    }
                                }
                                try {
                                    const id = editingId!
                                    const res = await updateContact({ id, changes: { name: editName.trim(), groups: editGroups, data: parsedData } }).unwrap()
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
                            <div className="grid gap-2">
                                <Label htmlFor="edit-data">Data (JSON)</Label>
                                <textarea
                                    id="edit-data"
                                    className="min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm font-mono"
                                    placeholder='{"phone": "123-456-7890"}'
                                    value={dataField}
                                    onChange={e => setDataField(e.target.value)}
                                />
                                <span className="text-xs text-muted-foreground">Optional. Must be valid JSON.</span>
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
