import React, { useMemo, useState } from 'react'
import { useListContactGroupsQuery, useCreateContactGroupMutation, useUpdateContactGroupMutation, useDeleteContactGroupMutation, type ApiSuccess, type ApiFail, type ContactGroup } from '@/store/api/payFirstApi'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-toastify'
import { extractErrorMessage, extractSuccessMessage } from '@/lib/utils'
import { ChevronDown, ChevronRight, Search, ArrowUpAZ, ArrowDownAZ, FolderTree, LayoutList } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Tree node type for rendering hierarchical groups
type GroupTreeNode = { id: number; name: string; parent_group?: number | null; children: GroupTreeNode[] }

function GroupNode({
    node,
    depth,
    idToName,
    onView,
    onEdit,
    onDelete,
}: {
    node: GroupTreeNode
    depth: number
    idToName: Map<number, string>
    onView: (id: number) => void
    onEdit: (id: number, name: string, parent?: number | null) => void
    onDelete: (id: number) => void
}) {
    const [open, setOpen] = useState(true)
    const hasChildren = node.children.length > 0
    const parentName = node.parent_group ? (idToName.get(node.parent_group) || String(node.parent_group)) : null
    return (
        <li className="text-sm">
            <div className="flex items-center justify-between py-2" style={{ paddingLeft: depth * 12 }}>
                <div className="flex items-center gap-2">
                    {hasChildren ? (
                        <button type="button" aria-label={open ? 'Collapse' : 'Expand'} className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => setOpen(o => !o)}>
                            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </button>
                    ) : (
                        <span className="inline-block w-4" />
                    )}
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            <span>{node.name}</span>
                            {hasChildren ? <span className="text-xs text-muted-foreground">({node.children.length})</span> : null}
                        </div>
                        {parentName && (
                            <div className="text-muted-foreground">Parent: {parentName}</div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => onView(node.id)}>View</Button>
                    <Button size="sm" variant="outline" onClick={() => onEdit(node.id, node.name, node.parent_group)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(node.id)}>Delete</Button>
                </div>
            </div>
            {hasChildren && open && (
                <ul className="ml-2 border-l pl-3">
                    {node.children.map(child => (
                        <GroupNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            idToName={idToName}
                            onView={onView}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </ul>
            )}
        </li>
    )
}

const ContactGroupList = () => {
    const [ordering, setOrdering] = useState<string>('name')
    const [nameQuery, setNameQuery] = useState('')
    const [filters, setFilters] = useState<{ name?: string }>({})
    const { data: groupsRes, isLoading, isFetching } = useListContactGroupsQuery({ ordering, search: filters.name || undefined })
    const [createGroup, { isLoading: creating }] = useCreateContactGroupMutation()
    const [updateGroup, { isLoading: updating }] = useUpdateContactGroupMutation()
    const [deleteGroup, { isLoading: deleting }] = useDeleteContactGroupMutation()
    const [name, setName] = useState('')
    const [parent, setParent] = useState<number | ''>('')
    const [error, setError] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    // sortAsc moved above and drives API ordering
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [treeView, setTreeView] = useState(true)
    const [viewingId, setViewingId] = useState<number | null>(null)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [editParent, setEditParent] = useState<number | ''>('')
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

    const failMessage = groupsRes && !groupsRes.status ? String(groupsRes.error ?? 'Server error') : null
    const groups: ContactGroup[] = useMemo(() => {
        if (groupsRes && typeof groupsRes !== 'string') {
            const res = groupsRes as ApiSuccess<ContactGroup[]> | ApiFail
            if (res.status) return res.data
        }
        return []
    }, [groupsRes])

    const hasNested = useMemo(() => groups.some(g => Array.isArray(g.subgroups) && g.subgroups!.length > 0), [groups])

    const flattenNested = (nodes: ContactGroup[]): ContactGroup[] => {
        const result: ContactGroup[] = []
        const walk = (n: ContactGroup, parent: number | null) => {
            result.push({ id: n.id, name: n.name, owner: n.owner, parent_group: parent })
            if (Array.isArray(n.subgroups)) {
                n.subgroups.forEach((child) => walk(child, n.id))
            }
        }
        nodes.forEach(n => walk(n, n.parent_group ?? null))
        return result
    }

    const allGroups: ContactGroup[] = useMemo(() => {
        if (hasNested) {
            // Backend provided tree. Flatten it for selects and flat view
            return flattenNested(groups)
        }
        return groups
    }, [groups, hasNested])

    const idToName = useMemo(() => {
        const m = new Map<number, string>()
        allGroups.forEach(g => m.set(g.id, g.name))
        return m
    }, [allGroups])

    const groupTree = useMemo(() => {
        // If backend provided nested, normalize to GroupTreeNode directly
        if (hasNested) {
            const toNode = (n: ContactGroup): GroupTreeNode => ({
                id: n.id,
                name: n.name,
                parent_group: n.parent_group ?? null,
                children: Array.isArray(n.subgroups) ? n.subgroups.map(toNode) : []
            })
            const roots = groups.map(toNode)
            // Assume server returns ordered; keep original order for visual
            return roots
        }
        // Fallback: build from flat list using parent_group
        const byId = new Map<number, GroupTreeNode>()
        const roots: GroupTreeNode[] = []
        for (const g of groups) byId.set(g.id, { id: g.id, name: g.name, parent_group: g.parent_group ?? null, children: [] })
        for (const g of groups) {
            const node = byId.get(g.id)!
            if (g.parent_group && byId.has(g.parent_group)) {
                byId.get(g.parent_group)!.children.push(node)
            } else {
                roots.push(node)
            }
        }
        // Keep server order
        return roots
    }, [groups, hasNested])

    // Server-side search is used; no client-side filtering

    const onSubmit = async (e: React.FormEvent): Promise<boolean> => {
        e.preventDefault()
        setError(null)
        if (!name.trim()) { setError('Name is required'); return false }
        try {
            const res = await createGroup({ name: name.trim(), parent_group: parent === '' ? null : parent }).unwrap()
            setName('')
            setParent('')
            toast.success(extractSuccessMessage(res, 'Group created'))
            return true
        } catch (e) {
            setError(extractErrorMessage(e))
            return false
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold">Contact Groups</h1>
                <p className="text-sm text-muted-foreground">Organize your contacts into groups and subgroups.</p>
            </div>

            {failMessage && (
                <div className="max-w-xl rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {failMessage}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div />
                <Button size="sm" onClick={() => { setCreateOpen(true); setError(null) }}>New Group</Button>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="font-medium">All groups</h2>
                    <div className="flex items-center gap-3 text-sm">
                        <div className="relative">
                            <Input
                                value={nameQuery}
                                onChange={(e) => { setNameQuery(e.target.value) }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        setFilters({ name: nameQuery.trim() || undefined })
                                        setPage(1)
                                    }
                                }}
                                placeholder="Filter name…"
                                className="pl-8 pr-20 h-9 w-56"
                            />
                            <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-1">
                                <span className="h-5 w-px bg-border mr-1" aria-hidden="true" />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    aria-label="Apply"
                                    title="Apply"
                                    className="h-9 px-2"
                                    disabled={isFetching}
                                    onClick={() => {
                                        setFilters({ name: nameQuery.trim() || undefined })
                                        setPage(1)
                                    }}
                                >
                                    Apply
                                </Button>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setOrdering((prev) => prev === 'name' ? '-name' : 'name')} className="gap-1">
                            {ordering.includes('name') && ordering.startsWith('-') ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />} Sort
                        </Button>
                        {!treeView && (
                            <div className="flex items-center gap-2">
                                <label className="text-muted-foreground" htmlFor="group-page-size">Rows per page</label>
                                <select
                                    id="group-page-size"
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
                        <Button variant={treeView ? 'default' : 'outline'} size="sm" className="gap-1" onClick={() => setTreeView(true)}>
                            <FolderTree className="size-4" /> Tree
                        </Button>
                        <Button variant={!treeView ? 'default' : 'outline'} size="sm" className="gap-1" onClick={() => setTreeView(false)}>
                            <LayoutList className="size-4" /> List
                        </Button>
                    </div>
                </div>
                {isLoading ? (
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
                ) : allGroups.length ? (
                    treeView ? (
                        <ul className="rounded-md border p-2">
                            {groupTree.map(node => (
                                <GroupNode
                                    key={node.id}
                                    node={node}
                                    depth={0}
                                    idToName={idToName}
                                    onView={(id) => setViewingId(id)}
                                    onEdit={(id, name, parent) => { setEditingId(id); setEditName(name); setEditParent(parent ?? ''); }}
                                    onDelete={(id) => setConfirmDeleteId(id)}
                                />
                            ))}
                        </ul>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="cursor-pointer select-none" onClick={() => setOrdering((prev) => prev === 'name' ? '-name' : 'name')}>
                                            <span className="inline-flex items-center gap-1">Name {ordering.includes('name') && (ordering.startsWith('-') ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />)}</span>
                                        </TableHead>
                                        <TableHead>Parent</TableHead>
                                        <TableHead className="w-[1%] whitespace-nowrap text-right pr-3">Actions</TableHead>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <div className="relative">
                                                <Input
                                                    value={nameQuery}
                                                    onChange={(e) => setNameQuery(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setFilters({ name: nameQuery.trim() || undefined }); setPage(1) } }}
                                                    placeholder="Filter name…"
                                                    className="pl-8 h-8"
                                                />
                                                <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
                                            </div>
                                        </TableCell>
                                        <TableCell />
                                        <TableCell className="text-right pr-3">
                                            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" disabled={isFetching} onClick={() => { setFilters({ name: nameQuery.trim() || undefined }); setPage(1) }}>Apply</Button>
                                        </TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allGroups
                                        .slice((page - 1) * pageSize, page * pageSize)
                                        .map(g => (
                                            <TableRow key={g.id}>
                                                <TableCell className="font-medium">{g.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{g.parent_group ? (idToName.get(g.parent_group) || g.parent_group) : '—'}</TableCell>
                                                <TableCell className="text-right pr-3">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => setViewingId(g.id)}>View</Button>
                                                        <Button size="sm" variant="outline" onClick={() => { setEditingId(g.id); setEditName(g.name); setEditParent(g.parent_group ?? ''); }}>Edit</Button>
                                                        <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteId(g.id)} disabled={deleting}>Delete</Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </div>
                    )
                ) : (
                    <div className="text-sm text-muted-foreground">No groups found</div>
                )}
                {(() => {
                    const totalPages = Math.max(1, Math.ceil(allGroups.length / pageSize))
                    return !treeView && allGroups.length > 0 ? (
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                            <span className="text-xs">Page {page} of {totalPages}</span>
                            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                        </div>
                    ) : null
                })()}
            </div>
            {/* Create modal */}
            {createOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setCreateOpen(false)}>
                    <div className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">New group</h3>
                            <button className="text-sm text-muted-foreground" onClick={() => setCreateOpen(false)}>Close</button>
                        </div>
                        <form onSubmit={async (e) => { const ok = await onSubmit(e); if (ok) setCreateOpen(false) }} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Group name</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Friends" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="parent">Parent group (optional)</Label>
                                <select
                                    id="parent"
                                    className="h-9 rounded-md border bg-background px-3 text-sm"
                                    value={parent}
                                    onChange={(e) => setParent(e.target.value ? Number(e.target.value) : '')}
                                >
                                    <option value="">None</option>
                                    {allGroups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            {error && <div className="text-sm text-red-600">{error}</div>}
                            <div className="flex items-center justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={creating}>Create</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* View modal */}
            {viewingId !== null && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setViewingId(null)}>
                    <div className="bg-background rounded-md p-4 w-[480px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Group details</h3>
                            <button className="text-sm text-muted-foreground" onClick={() => setViewingId(null)}>Close</button>
                        </div>
                        {(() => {
                            const g = groups.find(x => x.id === viewingId)
                            if (!g) return <div className="text-sm">Not found</div>
                            return (
                                <div className="text-sm space-y-2">
                                    <div><span className="text-muted-foreground">Name:</span> {g.name}</div>
                                    <div><span className="text-muted-foreground">Parent:</span> {g.parent_group ? (groups.find(x => x.id === g.parent_group)?.name || g.parent_group) : '—'}</div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {editingId !== null && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditingId(null)}>
                    <div className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Edit group</h3>
                            <button className="text-sm text-muted-foreground" onClick={() => setEditingId(null)}>Close</button>
                        </div>
                        <form
                            className="grid gap-3"
                            onSubmit={async (e) => {
                                e.preventDefault()
                                try {
                                    const id = editingId!
                                    const res = await updateGroup({ id, changes: { name: editName.trim(), parent_group: editParent === '' ? null : editParent } }).unwrap()
                                    toast.success(extractSuccessMessage(res, 'Group updated'))
                                    setEditingId(null)
                                } catch (e) {
                                    toast.error(extractErrorMessage(e))
                                }
                            }}
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="edit-g-name">Group name</Label>
                                <Input id="edit-g-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-parent">Parent group</Label>
                                <select id="edit-parent" className="h-9 rounded-md border bg-background px-3 text-sm" value={editParent} onChange={(e) => setEditParent(e.target.value ? Number(e.target.value) : '')}>
                                    <option value="">None</option>
                                    {allGroups.filter(g => g.id !== editingId).map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
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
                        <h3 className="font-semibold mb-2">Delete group</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            This action cannot be undone.
                            {(() => {
                                // detect children either via nested tree or flat parent references
                                let hasChildren = false
                                if (treeView) {
                                    const findInTree = (nodes: GroupTreeNode[], id: number | null | undefined): GroupTreeNode | null => {
                                        for (const n of nodes) {
                                            if (n.id === id) return n
                                            const found = findInTree(n.children, id)
                                            if (found) return found
                                        }
                                        return null
                                    }
                                    const node = findInTree(groupTree, confirmDeleteId)
                                    hasChildren = !!node && node.children.length > 0
                                } else {
                                    hasChildren = allGroups.some(g => g.parent_group === confirmDeleteId)
                                }
                                return hasChildren ? ' This group has subgroups which may also be affected.' : ''
                            })()}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                            <Button variant="destructive" disabled={deleting} onClick={async () => {
                                try {
                                    const res = await deleteGroup(confirmDeleteId!).unwrap()
                                    toast.success(extractSuccessMessage(res, 'Group deleted'))
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

export default ContactGroupList

