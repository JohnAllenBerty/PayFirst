import React, { useMemo, useState } from 'react'
import { useListPaymentSourcesQuery, useCreatePaymentSourceMutation, useUpdatePaymentSourceMutation, useDeletePaymentSourceMutation, type ApiFail, type ApiSuccess, type Paginated, type PaymentSource } from '@/store/api/payFirstApi'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, ArrowUpAZ, ArrowDownAZ } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-toastify'
import { extractErrorMessage, extractSuccessMessage } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PaymentSourcesPage = () => {
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [ordering, setOrdering] = useState<string>('label')
    const [refresh, setRefresh] = useState(0)
    const [labelQuery, setLabelQuery] = useState('')
    const [filters, setFilters] = useState<{ label?: string }>({})

    const searchText = useMemo(() => {
        return filters.label?.trim() || undefined
    }, [filters])

    const listParams = useMemo(() => {
        const base: Record<string, string | number | boolean | undefined> = {
            ordering,
            refresh,
            search: searchText,
            page,
            page_size: pageSize,
        }
        return base
    }, [ordering, refresh, searchText, page, pageSize])

    const { data: psRes, isLoading: loadingPS, isFetching: fetchingPS } = useListPaymentSourcesQuery(listParams)
    const [createPS, { isLoading: creating }] = useCreatePaymentSourceMutation()
    const [updatePS, { isLoading: updating }] = useUpdatePaymentSourceMutation()
    const [deletePS, { isLoading: deleting }] = useDeletePaymentSourceMutation()

    const psData = useMemo(() => {
        const res = psRes as ApiFail | Paginated<PaymentSource> | ApiSuccess<Paginated<PaymentSource> | PaymentSource[]> | undefined
        if (!res) return { items: [] as PaymentSource[], total: 0 }
        if ((res as ApiFail).status === false) return { items: [] as PaymentSource[], total: 0 }
        if ((res as ApiSuccess<Paginated<PaymentSource> | PaymentSource[]>).status === true) {
            const ok = res as ApiSuccess<Paginated<PaymentSource> | PaymentSource[]>
            const data = ok.data
            if (Array.isArray(data)) return { items: data, total: data.length }
            return { items: data.results ?? [], total: data.count ?? (data.results ? data.results.length : 0) }
        }
        const pg = res as Paginated<PaymentSource>
        if (Array.isArray(pg.results)) return { items: pg.results, total: pg.count }
        return { items: [] as PaymentSource[], total: 0 }
    }, [psRes])

    const paymentSources = psData.items
    const totalPaymentSources = psData.total

    const failMessage = (() => {
        const res = psRes as ApiFail | Paginated<PaymentSource> | ApiSuccess<Paginated<PaymentSource>> | undefined
        if (!res) return null
        if ((res as ApiFail).status === false) return String((res as ApiFail).error ?? 'Server error')
        return null
    })()

    const [label, setLabel] = useState('')
    const [formError, setFormError] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)

    const filteredPS = paymentSources
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editLabel, setEditLabel] = useState('')
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

    const onSubmit = async (e: React.FormEvent): Promise<boolean> => {
        e.preventDefault()
        setFormError(null)
        if (!label.trim()) { setFormError('Label is required'); return false }
        try {
            const res = await createPS({ label: label.trim() }).unwrap()
            setLabel('')
            toast.success(extractSuccessMessage(res, 'Payment source created'))
            setRefresh((c) => c + 1)
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
                <h1 className="text-xl font-semibold">Payment Sources</h1>
                <p className="text-sm text-muted-foreground">Manage your payment sources like bank accounts, cards, or cash.</p>
            </div>

            {failMessage && (
                <div className="max-w-xl rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between gap-3">
                    <span>{failMessage}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => setRefresh((c) => c + 1)}>Retry</Button>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div />
                <Button size="sm" onClick={() => { setCreateOpen(true); setFormError(null) }}>New Payment Source</Button>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="font-medium">All payment sources</h2>
                    <div className="flex items-center gap-2 text-sm">
                        <label className="text-muted-foreground" htmlFor="ps-page-size">Rows per page</label>
                        <select
                            id="ps-page-size"
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
                </div>
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="cursor-pointer select-none" onClick={() => setOrdering((prev) => prev === 'label' ? '-label' : 'label')}>
                                    <span className="inline-flex items-center gap-1">Label {ordering.includes('label') && (ordering.startsWith('-') ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />)}</span>
                                </TableHead>
                                <TableHead className="w-[1%] whitespace-nowrap text-right pr-3">Actions</TableHead>
                            </TableRow>
                            <TableRow>
                                <TableCell>
                                    <div className="relative">
                                        <Input
                                            value={labelQuery}
                                            onChange={(e) => setLabelQuery(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setFilters({ label: labelQuery.trim() || undefined }); setPage(1) } }}
                                            placeholder="Filter label…"
                                            className="pl-8 h-8"
                                        />
                                        <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        disabled={fetchingPS}
                                        onClick={() => {
                                            const next: { label?: string } = {}
                                            const lbl = labelQuery.trim()
                                            if (lbl) next.label = lbl
                                            setFilters(next)
                                            setPage(1)
                                        }}
                                    >
                                        Apply
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingPS ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell className="text-right pr-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Skeleton className="h-8 w-16" />
                                                <Skeleton className="h-8 w-16" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : filteredPS.length ? (
                                filteredPS.map((ps: PaymentSource) => (
                                    <TableRow key={ps.id}>
                                        <TableCell className="font-medium">{ps.label}</TableCell>
                                        <TableCell className="text-right pr-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => { setEditingId(ps.id); setEditLabel(ps.label); }}>Edit</Button>
                                                <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteId(ps.id)} disabled={deleting}>Delete</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-sm text-muted-foreground">No payment sources found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {(() => {
                    const totalPages = Math.max(1, Math.ceil(totalPaymentSources / pageSize))
                    return totalPaymentSources > 0 ? (
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
                            <h3 className="font-semibold">New payment source</h3>
                            <button className="text-sm text-muted-foreground" onClick={() => setCreateOpen(false)}>Close</button>
                        </div>
                        <form onSubmit={async (e) => { const ok = await onSubmit(e); if (ok) setCreateOpen(false) }} className="grid gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="label">Label</Label>
                                <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., Bank Account, Cash" />
                            </div>
                            {formError && <div className="text-sm text-red-600">{formError}</div>}
                            <div className="flex items-center gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={creating}>Create</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {editingId !== null && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditingId(null)}>
                    <div className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Edit payment source</h3>
                            <button className="text-sm text-muted-foreground" onClick={() => setEditingId(null)}>Close</button>
                        </div>
                        <form className="grid gap-3" onSubmit={async (e) => {
                            e.preventDefault()
                            try {
                                const id = editingId!
                                await updatePS({ id, changes: { label: editLabel.trim() } }).unwrap()
                                toast.success('Payment source updated')
                                setEditingId(null)
                            } catch (e) {
                                toast.error(extractErrorMessage(e))
                            }
                        }}>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-label">Label</Label>
                                <Input id="edit-label" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
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
                        <h3 className="font-semibold mb-2">Delete payment source</h3>
                        <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                            <Button variant="destructive" disabled={deleting} onClick={async () => {
                                try {
                                    await deletePS(confirmDeleteId!).unwrap()
                                    toast.success('Payment source deleted')
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

export default PaymentSourcesPage
