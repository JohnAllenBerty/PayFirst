import React, { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, ArrowUpAZ, ArrowDownAZ } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-toastify'
import { type ApiFail, type ApiSuccess, type Paginated, type Repayment, type Transaction } from '@/store/api/payFirstApi'
import { useListRepaymentsQuery, useCreateRepaymentMutation, useListTransactionsQuery, useUpdateRepaymentMutation, useDeleteRepaymentMutation } from '@/store/api/payFirstApi'
import { extractErrorMessage, extractSuccessMessage } from '@/lib/utils'

const RepaymentsPage = () => {
    const [sortAsc, setSortAsc] = useState(true)
    const [page, setPage] = useState(1)
    const pageSize = 10
    const [query, setQuery] = useState('')
    const [search, setSearch] = useState('')

    const { data: repRes, isLoading: loadingRep, isFetching: fetchingRep } = useListRepaymentsQuery({
        page,
        page_size: pageSize,
        search: search || undefined,
        ordering: sortAsc ? 'label' : '-label',
    })
    const { data: txRes, isLoading: loadingTx } = useListTransactionsQuery({ page_size: 1000 })
    const [createRep, { isLoading: creating }] = useCreateRepaymentMutation()
    const [updateRep, { isLoading: updating }] = useUpdateRepaymentMutation()
    const [deleteRep, { isLoading: deleting }] = useDeleteRepaymentMutation()

    // No debounce; search triggers only on Enter/click

    const repData = useMemo(() => {
        const res = repRes as ApiFail | Paginated<Repayment> | ApiSuccess<Paginated<Repayment> | Repayment[]> | undefined
        if (!res) return { items: [] as Repayment[], total: 0 }
        if ((res as ApiSuccess<Paginated<Repayment> | Repayment[]>).status === true) {
            const ok = res as ApiSuccess<Paginated<Repayment> | Repayment[]>
            const d = ok.data as unknown
            if (Array.isArray(d)) return { items: d, total: d.length }
            const pg = d as Paginated<Repayment>
            if (Array.isArray(pg.results)) return { items: pg.results, total: pg.count ?? pg.results.length }
            return { items: [] as Repayment[], total: 0 }
        }
        if ((res as ApiFail).status === false) return { items: [] as Repayment[], total: 0 }
        const pg = res as Paginated<Repayment>
        if (Array.isArray(pg.results)) return { items: pg.results, total: pg.count ?? pg.results.length }
        return { items: [] as Repayment[], total: 0 }
    }, [repRes])
    const repayments = repData.items
    const totalRepayments = repData.total

    const transactions = useMemo(() => {
        const res = txRes as ApiFail | Paginated<Transaction> | ApiSuccess<Paginated<Transaction> | Transaction[]> | undefined
        if (!res) return [] as Transaction[]
        if ((res as ApiSuccess<Paginated<Transaction> | Transaction[]>).status === true) {
            const ok = res as ApiSuccess<Paginated<Transaction> | Transaction[]>
            const d = ok.data as unknown
            if (Array.isArray(d)) return d
            const pg = d as Paginated<Transaction>
            return Array.isArray(pg.results) ? pg.results : []
        }
        if ((res as ApiFail).status === false) return [] as Transaction[]
        const pg = res as Paginated<Transaction>
        return Array.isArray(pg.results) ? pg.results : []
    }, [txRes])

    const failMessage = useMemo(() => {
        const res = repRes as ApiFail | Paginated<Repayment> | ApiSuccess<Paginated<Repayment>> | undefined
        if (!res) return null
        if ((res as ApiFail).status === false) return String((res as ApiFail).error ?? 'Server error')
        return null
    }, [repRes])

    const [label, setLabel] = useState('')
    const [transaction, setTransaction] = useState<number | ''>('')
    const [amount, setAmount] = useState('')
    const [remarks, setRemarks] = useState('')
    const [date, setDate] = useState('')
    const [formError, setFormError] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)

    const [viewingId, setViewingId] = useState<number | null>(null)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editLabel, setEditLabel] = useState('')
    const [editTransaction, setEditTransaction] = useState<number | ''>('')
    const [editAmount, setEditAmount] = useState('')
    const [editRemarks, setEditRemarks] = useState('')
    const [editDate, setEditDate] = useState('')
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

    const onSubmit = async (e: React.FormEvent): Promise<boolean> => {
        e.preventDefault()
        setFormError(null)
        if (!label.trim()) { setFormError('Label is required'); return false }
        if (transaction === '') { setFormError('Transaction is required'); return false }
        const amt = parseFloat(amount)
        if (!isFinite(amt) || amt <= 0) { setFormError('Amount must be > 0'); return false }
        try {
            const res = await createRep({
                label: label.trim(),
                transaction: Number(transaction),
                amount: amt,
                remarks: remarks.trim(),
                date: date || new Date().toISOString().slice(0, 10),
            }).unwrap()
            setLabel(''); setTransaction(''); setAmount(''); setRemarks(''); setDate('')
            toast.success(extractSuccessMessage(res, 'Repayment created'))
            refetchRep()
            return true
        } catch (e) {
            const msg = extractErrorMessage(e)
            setFormError(msg)
            toast.error(msg)
            return false
        }
    }

    const filtered = repayments // server-side filtering now

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Repayments</h1>
                <p className="text-sm text-muted-foreground">Record repayments against transactions.</p>
            </div>

            {failMessage && (
                <div className="max-w-xl rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between gap-3">
                    <span>{failMessage}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => refetchRep()}>Retry</Button>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div />
                <Button size="sm" onClick={() => { setCreateOpen(true); setFormError(null) }}>New Repayment</Button>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="font-medium">All repayments</h2>
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
                                placeholder="Search label or remarks…"
                                className="pl-8 pr-20 h-9 w-64"
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
                                    disabled={fetchingRep}
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
                {loadingRep ? (
                    <div className="grid gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between rounded-md border p-3">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-4 w-20" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length ? (
                    <ul className="divide-y rounded-md border">
                        {filtered.map((r: Repayment) => (
                            <li key={r.id} className="p-3 text-sm flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{r.label}</div>
                                    <div className="text-muted-foreground">{r.amount} · {r.remarks}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setViewingId(r.id)}>View</Button>
                                    <Button size="sm" variant="outline" onClick={() => { setEditingId(r.id); setEditLabel(r.label); setEditTransaction(r.transaction); setEditAmount(String(r.amount)); setEditRemarks(r.remarks || ''); setEditDate(r.date); }}>Edit</Button>
                                    <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteId(r.id)} disabled={deleting}>Delete</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-sm text-muted-foreground">No repayments found</div>
                )}
                {totalRepayments > pageSize && (
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                        <span className="text-xs">Page {page} of {Math.ceil(totalRepayments / pageSize)}</span>
                        <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(Math.ceil(totalRepayments / pageSize), p + 1))} disabled={page >= Math.ceil(totalRepayments / pageSize)}>Next</Button>
                    </div>
                )}
            </div>

            {/* Create modal */}
            {createOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setCreateOpen(false)}>
                    <div className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">New repayment</h3>
                            <button className="text-sm text-muted-foreground" onClick={() => setCreateOpen(false)}>Close</button>
                        </div>
                        <form onSubmit={async (e) => { const ok = await onSubmit(e); if (ok) setCreateOpen(false) }} className="grid gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="label">Label</Label>
                                <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Repayment 1" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="transaction">Transaction</Label>
                                <select id="transaction" className="h-9 rounded-md border bg-background px-3 text-sm" value={transaction} onChange={(e) => setTransaction(e.target.value ? Number(e.target.value) : '')}>
                                    <option value="" disabled>{loadingTx ? 'Loading…' : 'Select a transaction'}</option>
                                    {transactions.map((t: Transaction) => <option key={t.id} value={t.id}>{t.label} ({t._type} {t.amount})</option>)}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="amount">Amount</Label>
                                <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="remarks">Remarks</Label>
                                <Input id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remarks" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="date">Date</Label>
                                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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

            {/* View modal */}
            {viewingId !== null && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setViewingId(null)}>
                    <div className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Repayment details</h3>
                            <button className="text-sm text-muted-foreground" onClick={() => setViewingId(null)}>Close</button>
                        </div>
                        {(() => {
                            const rep = repayments.find((x: Repayment) => x.id === viewingId)
                            if (!rep) return <div className="text-sm">Not found</div>
                            const txLabel = transactions.find((t: Transaction) => t.id === rep.transaction)?.label || rep.transaction
                            return (
                                <div className="text-sm space-y-2">
                                    <div><span className="text-muted-foreground">Label:</span> {rep.label}</div>
                                    <div><span className="text-muted-foreground">Transaction:</span> {String(txLabel)}</div>
                                    <div><span className="text-muted-foreground">Amount:</span> {rep.amount}</div>
                                    <div><span className="text-muted-foreground">Date:</span> {rep.date}</div>
                                    <div><span className="text-muted-foreground">Remarks:</span> {rep.remarks || '—'}</div>
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
                            <h3 className="font-semibold">Edit repayment</h3>
                            <button className="text-sm text-muted-foreground" onClick={() => setEditingId(null)}>Close</button>
                        </div>
                        <form className="grid gap-3" onSubmit={async (e) => {
                            e.preventDefault()
                            try {
                                const id = editingId!
                                const amt = parseFloat(editAmount)
                                const res = await updateRep({ id, changes: { label: editLabel.trim(), transaction: editTransaction as number, amount: amt, remarks: editRemarks.trim(), date: editDate } }).unwrap()
                                toast.success(extractSuccessMessage(res, 'Repayment updated'))
                                setEditingId(null)
                            } catch (e) {
                                const msg = extractErrorMessage(e)
                                toast.error(msg)
                            }
                        }}>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-label">Label</Label>
                                <Input id="edit-label" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-transaction">Transaction</Label>
                                <select id="edit-transaction" className="h-9 rounded-md border bg-background px-3 text-sm" value={editTransaction} onChange={(e) => setEditTransaction(e.target.value ? Number(e.target.value) : '')}>
                                    <option value="" disabled>Select a transaction</option>
                                    {transactions.map((t: Transaction) => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-amount">Amount</Label>
                                <Input id="edit-amount" type="number" min="0" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-remarks">Remarks</Label>
                                <Input id="edit-remarks" value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-date">Date</Label>
                                <Input id="edit-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
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
                        <h3 className="font-semibold mb-2">Delete repayment</h3>
                        <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                            <Button variant="destructive" disabled={deleting} onClick={async () => {
                                try {
                                    const res = await deleteRep(confirmDeleteId!).unwrap()
                                    toast.success(extractSuccessMessage(res, 'Repayment deleted'))
                                } catch (e) {
                                    const msg = extractErrorMessage(e)
                                    toast.error(msg)
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

export default RepaymentsPage
