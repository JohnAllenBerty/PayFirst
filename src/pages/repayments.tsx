import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useMetaPageTitle } from '@/hooks/useMeta'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, ArrowUpAZ, ArrowDownAZ } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-toastify'
import { type ApiFail, type ApiSuccess, type Paginated, type Repayment, type Transaction, type PaymentMethod, type PaymentSource } from '@/store/api/payFirstApi'
import { useListRepaymentsQuery, useCreateRepaymentMutation, useListTransactionsQuery, useUpdateRepaymentMutation, useDeleteRepaymentMutation, useListPaymentMethodsQuery, useCreatePaymentMethodMutation, useListPaymentSourcesQuery, useCreatePaymentSourceMutation } from '@/store/api/payFirstApi'
import { extractErrorMessage, extractSuccessMessage } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const RepaymentsPage = () => {
    const { title } = useMetaPageTitle('/repayments', 'Repayments • PayFirst')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [ordering, setOrdering] = useState<string>('label')
    const [refresh, setRefresh] = useState(0)
    // Filters: query inputs and applied filters
    const [labelQuery, setLabelQuery] = useState('')
    const [txQuery, setTxQuery] = useState<number | ''>('')
    const [filters, setFilters] = useState<{ label?: string; transaction?: number }>({})

    const { data: txRes, isLoading: loadingTx } = useListTransactionsQuery({ page_size: 1000 })
    const { data: pmRes, isLoading: loadingPM } = useListPaymentMethodsQuery({ page_size: 1000 })
    const [createPM, { isLoading: creatingPM }] = useCreatePaymentMethodMutation()
    const { data: psRes, isLoading: loadingPS } = useListPaymentSourcesQuery({ page_size: 1000 })
    const [createPS, { isLoading: creatingPS }] = useCreatePaymentSourceMutation()

    // Normalize transactions array once; use this in UI and search
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
    const paymentMethods = useMemo(() => {
        const res = pmRes as ApiFail | Paginated<PaymentMethod> | ApiSuccess<Paginated<PaymentMethod> | PaymentMethod[]> | undefined
        if (!res) return [] as PaymentMethod[]
        if ((res as ApiSuccess<Paginated<PaymentMethod> | PaymentMethod[]>).status === true) {
            const ok = res as ApiSuccess<Paginated<PaymentMethod> | PaymentMethod[]>
            const d = ok.data as unknown
            if (Array.isArray(d)) return d
            const pg = d as Paginated<PaymentMethod>
            return Array.isArray(pg.results) ? pg.results : []
        }
        if ((res as ApiFail).status === false) return [] as PaymentMethod[]
        const pg = res as Paginated<PaymentMethod>
        return Array.isArray(pg.results) ? pg.results : []
    }, [pmRes])
    const paymentSources = useMemo(() => {
        const res = psRes as ApiFail | Paginated<PaymentSource> | ApiSuccess<Paginated<PaymentSource> | PaymentSource[]> | undefined
        if (!res) return [] as PaymentSource[]
        if ((res as ApiFail).status === false) return [] as PaymentSource[]
        if ((res as ApiSuccess<Paginated<PaymentSource> | PaymentSource[]>).status === true) {
            const ok = res as ApiSuccess<Paginated<PaymentSource> | PaymentSource[]>
            const d = ok.data as unknown
            if (Array.isArray(d)) return d
            const pg = d as Paginated<PaymentSource>
            return Array.isArray(pg.results) ? pg.results : []
        }
        const pg = res as Paginated<PaymentSource>
        return Array.isArray(pg.results) ? pg.results : []
    }, [psRes])

    const searchText = useMemo(() => {
        const parts: string[] = []
        if (filters.label) parts.push(filters.label)
        if (typeof filters.transaction === 'number') {
            const found = transactions.find(t => t.id === filters.transaction)
            if (found?.label) parts.push(found.label)
        }
        return parts.join(' ').trim() || undefined
    }, [filters, transactions])

    const { data: repRes, isLoading: loadingRep, isFetching: fetchingRep } = useListRepaymentsQuery({
        page,
        page_size: pageSize,
        ordering,
        refresh,
        search: searchText,
    })
    const [createRep, { isLoading: creating }] = useCreateRepaymentMutation()
    const [updateRep, { isLoading: updating }] = useUpdateRepaymentMutation()
    const [deleteRep, { isLoading: deleting }] = useDeleteRepaymentMutation()

    // No debounce; filters applied on Enter/Apply only

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

    // transactions useMemo moved above

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
    const [paymentMethod, setPaymentMethod] = useState<number | ''>('')
    const [paymentSource, setPaymentSource] = useState<number | ''>('')
    const [txRef, setTxRef] = useState('')
    const [showAddPM, setShowAddPM] = useState(false)
    const [newPMLabel, setNewPMLabel] = useState('')
    const [newPMDefault, setNewPMDefault] = useState(false)
    const [newPMCommon, setNewPMCommon] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)

    const [viewingId, setViewingId] = useState<number | null>(null)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editLabel, setEditLabel] = useState('')
    const [editTransaction, setEditTransaction] = useState<number | ''>('')
    const [editAmount, setEditAmount] = useState('')
    const [editRemarks, setEditRemarks] = useState('')
    const [editDate, setEditDate] = useState('')
    const [editPaymentMethod, setEditPaymentMethod] = useState<number | ''>('')
    const [editPaymentSource, setEditPaymentSource] = useState<number | ''>('')
    const [editTxRef, setEditTxRef] = useState('')
    const [showAddPMEdit, setShowAddPMEdit] = useState(false)
    const [newPMLabelEdit, setNewPMLabelEdit] = useState('')
    const [newPMDefaultEdit, setNewPMDefaultEdit] = useState(false)
    const [newPMCommonEdit, setNewPMCommonEdit] = useState(false)

    // Zero-results toast when filters applied and no results
        const lastToastSignature = useRef<string>('')
        useEffect(() => {
            if (loadingRep) return
            const activeFilter = Boolean(filters.label || typeof filters.transaction === 'number')
            if (!activeFilter) return
            const signature = `${filters.label || ''}|${filters.transaction || ''}`
            if (repayments.length === 0 && lastToastSignature.current !== signature) {
                lastToastSignature.current = signature
                toast.info('No repayments match your filters. Adjust or clear filters to see results.')
            }
        }, [loadingRep, repayments.length, filters])
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
                payment_method: paymentMethod === '' ? null : Number(paymentMethod),
                payment_source: paymentSource === '' ? null : Number(paymentSource),
                transaction_reference: txRef.trim() || null,
            }).unwrap()
            setLabel(''); setTransaction(''); setAmount(''); setRemarks(''); setDate(''); setPaymentMethod(''); setPaymentSource(''); setTxRef('')
            toast.success(extractSuccessMessage(res, 'Repayment created'))
            setRefresh((c) => c + 1)
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
                <h1 className="text-xl font-semibold">{title.replace(/\s*•\s*PayFirst$/, '')}</h1>
                <p className="text-sm text-muted-foreground">Record repayments against transactions.</p>
            </div>

            {failMessage && (
                <div className="max-w-xl rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between gap-3">
                    <span>{failMessage}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => setRefresh((c) => c + 1)}>Retry</Button>
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
                        <label className="text-muted-foreground" htmlFor="rep-page-size">Rows per page</label>
                        <select
                            id="rep-page-size"
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
                                <TableHead className="cursor-pointer select-none" aria-label="Sort by label" onClick={() => setOrdering((prev) => prev === 'label' ? '-label' : 'label')}>
                                    <span className="inline-flex items-center gap-1">Label {ordering.includes('label') && (ordering.startsWith('-') ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />)}</span>
                                </TableHead>
                                <TableHead className="cursor-pointer select-none" aria-label="Sort by amount" onClick={() => setOrdering((prev) => prev === 'amount' ? '-amount' : 'amount')}>
                                    <span className="inline-flex items-center gap-1">Amount {ordering.includes('amount') && (ordering.startsWith('-') ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />)}</span>
                                </TableHead>
                                <TableHead className="cursor-pointer select-none" aria-label="Sort by date" onClick={() => setOrdering((prev) => prev === 'date' ? '-date' : 'date')}>
                                    <span className="inline-flex items-center gap-1">Date {ordering.includes('date') && (ordering.startsWith('-') ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />)}</span>
                                </TableHead>
                                <TableHead>Remarks</TableHead>
                                <TableHead>Transaction</TableHead>
                                <TableHead className="w-[1%] whitespace-nowrap text-right pr-3">Actions</TableHead>
                            </TableRow>
                            {/* Filters */}
                            <TableRow>
                                <TableCell>
                                    <div className="relative">
                                        <Input
                                            value={labelQuery}
                                            onChange={(e) => setLabelQuery(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setFilters({ ...filters, label: labelQuery.trim() || undefined }); setPage(1) } }}
                                            placeholder="Filter label…"
                                            className="pl-8 h-8"
                                        />
                                        <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
                                    </div>
                                </TableCell>
                                <TableCell />
                                <TableCell />
                                <TableCell />
                                <TableCell>
                                    <select className="h-8 rounded-md border bg-background px-2 text-sm" value={txQuery} onChange={(e) => setTxQuery(e.target.value ? Number(e.target.value) : '')}>
                                        <option value="">All transactions</option>
                                        {transactions.map((t: Transaction) => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                </TableCell>
                                <TableCell className="text-right pr-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        disabled={fetchingRep}
                                        onClick={() => {
                                            const next: { label?: string; transaction?: number } = {}
                                            const lbl = labelQuery.trim()
                                            if (lbl) next.label = lbl
                                            if (typeof txQuery === 'number') next.transaction = txQuery
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
                            {loadingRep ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell className="text-right pr-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Skeleton className="h-8 w-16" />
                                                <Skeleton className="h-8 w-16" />
                                                <Skeleton className="h-8 w-16" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : filtered.length ? (
                                filtered.map((r: Repayment) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium" title={r.remarks ? `${r.label} — ${r.remarks}` : r.label}>{r.label}</TableCell>
                                        <TableCell>{r.amount}</TableCell>
                                        <TableCell>{r.date}</TableCell>
                                        <TableCell className="text-muted-foreground">{r.remarks || '—'}</TableCell>
                                        <TableCell>{transactions.find((t: Transaction) => t.id === r.transaction)?.label || r.transaction}</TableCell>
                                        <TableCell className="text-right pr-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setViewingId(r.id)}>View</Button>
                                                <Button size="sm" variant="outline" onClick={() => { setEditingId(r.id); setEditLabel(r.label); setEditTransaction(r.transaction); setEditAmount(String(r.amount)); setEditRemarks(r.remarks || ''); setEditDate(r.date); setEditPaymentMethod(typeof r.payment_method === 'number' ? r.payment_method : ''); setEditPaymentSource(typeof r.payment_source === 'number' ? r.payment_source : ''); setEditTxRef(r.transaction_reference || ''); }}>Edit</Button>
                                                <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteId(r.id)} disabled={deleting}>Delete</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-sm text-muted-foreground">No repayments found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {(() => {
                    const totalPages = Math.max(1, Math.ceil(totalRepayments / pageSize))
                    return totalRepayments > 0 ? (
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
                    <div role="dialog" aria-modal="true" aria-labelledby="new-repayment-title" className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 id="new-repayment-title" className="font-semibold">New repayment</h3>
                            <button aria-label="Close dialog" className="text-sm text-muted-foreground" onClick={() => setCreateOpen(false)}>Close</button>
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
                            <div className="grid gap-2">
                                <Label htmlFor="payment-method">Payment method (optional)</Label>
                                <select id="payment-method" className="h-9 rounded-md border bg-background px-3 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value ? Number(e.target.value) : '')}>
                                    <option value="">{loadingPM ? 'Loading…' : 'None'}</option>
                                    {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.label}{pm.is_default ? ' (default)' : ''}</option>)}
                                </select>
                                <div className="flex items-center justify-between mt-1">
                                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowAddPM(v => !v)}>{showAddPM ? 'Cancel' : 'Add new'}</Button>
                                    {showAddPM && creatingPM && <span className="text-xs text-muted-foreground">Saving…</span>}
                                </div>
                                {showAddPM && (
                                    <div className="mt-2 border rounded-md p-2 space-y-2">
                                        <div className="grid gap-1">
                                            <Label htmlFor="new-pm-label" className="text-xs">New method label</Label>
                                            <Input id="new-pm-label" value={newPMLabel} onChange={(e) => setNewPMLabel(e.target.value)} placeholder="e.g. Cash" className="h-8" />
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <label className="flex items-center gap-1"><input type="checkbox" checked={newPMDefault} onChange={(e) => setNewPMDefault(e.target.checked)} /> Default</label>
                                            <label className="flex items-center gap-1"><input type="checkbox" checked={newPMCommon} onChange={(e) => setNewPMCommon(e.target.checked)} /> Common</label>
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                            <Button type="button" size="sm" variant="outline" className="h-7 px-3" onClick={() => { setShowAddPM(false); setNewPMLabel(''); setNewPMDefault(false); setNewPMCommon(false) }}>Cancel</Button>
                                            <Button type="button" size="sm" className="h-7 px-3" disabled={creatingPM} onClick={async () => {
                                                if (!newPMLabel.trim()) { toast.error('Label required'); return }
                                                if (newPMDefault && paymentMethods.some(pm => pm.is_default)) { toast.error('Only one default method allowed'); return }
                                                try {
                                                    const res = await createPM({ label: newPMLabel.trim(), is_default: newPMDefault, is_common: newPMCommon }).unwrap()
                                                    if ((res as ApiSuccess<PaymentMethod>)?.status) {
                                                        const created = (res as ApiSuccess<PaymentMethod>).data
                                                        setPaymentMethod(created.id)
                                                        toast.success(extractSuccessMessage(res, 'Added'))
                                                    } else {
                                                        toast.success('Added')
                                                    }
                                                    setShowAddPM(false); setNewPMLabel(''); setNewPMDefault(false); setNewPMCommon(false)
                                                } catch (e2) {
                                                    toast.error(extractErrorMessage(e2))
                                                }
                                            }}>Save</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="payment-source">Payment source (optional)</Label>
                                <select id="payment-source" className="h-9 rounded-md border bg-background px-3 text-sm" value={paymentSource} onChange={(e) => setPaymentSource(e.target.value ? Number(e.target.value) : '')}>
                                    <option value="">{loadingPS ? 'Loading…' : 'None'}</option>
                                    {paymentSources.map(ps => <option key={ps.id} value={ps.id}>{ps.label}</option>)}
                                </select>
                                <div className="flex items-center justify-between mt-1">
                                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={async () => {
                                        const v = prompt('New payment source label?')?.trim()
                                        if (!v) return
                                        try {
                                            const res = await createPS({ label: v }).unwrap()
                                            if ((res as ApiSuccess<PaymentSource>)?.status) {
                                                const created = (res as ApiSuccess<PaymentSource>).data
                                                setPaymentSource(created.id)
                                                toast.success(extractSuccessMessage(res, 'Added'))
                                            } else {
                                                toast.success('Added')
                                            }
                                        } catch (e2) { toast.error(extractErrorMessage(e2)) }
                                    }}>Add new</Button>
                                    {creatingPS && <span className="text-xs text-muted-foreground">Saving…</span>}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tx-ref">Reference (optional)</Label>
                                <Input id="tx-ref" value={txRef} onChange={(e) => setTxRef(e.target.value)} placeholder="e.g., UTR/Ref no." />
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
                    <div role="dialog" aria-modal="true" aria-labelledby="view-repayment-title" className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 id="view-repayment-title" className="font-semibold">Repayment details</h3>
                            <button aria-label="Close dialog" className="text-sm text-muted-foreground" onClick={() => setViewingId(null)}>Close</button>
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
                                    <div><span className="text-muted-foreground">Payment method:</span> {paymentMethods.find(pm => pm.id === (rep.payment_method ?? -1))?.label || '—'}</div>
                                    <div><span className="text-muted-foreground">Payment source:</span> {paymentSources.find(ps => ps.id === (rep.payment_source ?? -1))?.label || '—'}</div>
                                    <div><span className="text-muted-foreground">Reference:</span> {rep.transaction_reference || '—'}</div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {editingId !== null && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditingId(null)}>
                    <div role="dialog" aria-modal="true" aria-labelledby="edit-repayment-title" className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 id="edit-repayment-title" className="font-semibold">Edit repayment</h3>
                            <button aria-label="Close dialog" className="text-sm text-muted-foreground" onClick={() => setEditingId(null)}>Close</button>
                        </div>
                        <form className="grid gap-3" onSubmit={async (e) => {
                            e.preventDefault()
                            try {
                                const id = editingId!
                                const amt = parseFloat(editAmount)
                                const res = await updateRep({ id, changes: { label: editLabel.trim(), transaction: editTransaction as number, amount: amt, remarks: editRemarks.trim(), date: editDate, payment_method: editPaymentMethod === '' ? null : Number(editPaymentMethod), payment_source: editPaymentSource === '' ? null : Number(editPaymentSource), transaction_reference: editTxRef.trim() || null } }).unwrap()
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
                                <Label htmlFor="edit-payment-source">Payment source (optional)</Label>
                                <select id="edit-payment-source" className="h-9 rounded-md border bg-background px-3 text-sm" value={editPaymentSource} onChange={(e) => setEditPaymentSource(e.target.value ? Number(e.target.value) : '')}>
                                    <option value="">None</option>
                                    {paymentSources.map(ps => <option key={ps.id} value={ps.id}>{ps.label}</option>)}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-tx-ref">Reference (optional)</Label>
                                <Input id="edit-tx-ref" value={editTxRef} onChange={(e) => setEditTxRef(e.target.value)} placeholder="e.g., UTR/Ref no." />
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
                            <div className="grid gap-2">
                                <Label htmlFor="edit-payment-method">Payment method (optional)</Label>
                                <select id="edit-payment-method" className="h-9 rounded-md border bg-background px-3 text-sm" value={editPaymentMethod} onChange={(e) => setEditPaymentMethod(e.target.value ? Number(e.target.value) : '')}>
                                    <option value="">None</option>
                                    {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.label}{pm.is_default ? ' (default)' : ''}</option>)}
                                </select>
                                <div className="flex items-center justify-between mt-1">
                                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowAddPMEdit(v => !v)}>{showAddPMEdit ? 'Cancel' : 'Add new'}</Button>
                                    {showAddPMEdit && creatingPM && <span className="text-xs text-muted-foreground">Saving…</span>}
                                </div>
                                {showAddPMEdit && (
                                    <div className="mt-2 border rounded-md p-2 space-y-2">
                                        <div className="grid gap-1">
                                            <Label htmlFor="new-pm-label-edit" className="text-xs">New method label</Label>
                                            <Input id="new-pm-label-edit" value={newPMLabelEdit} onChange={(e) => setNewPMLabelEdit(e.target.value)} placeholder="e.g. Cash" className="h-8" />
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <label className="flex items-center gap-1"><input type="checkbox" checked={newPMDefaultEdit} onChange={(e) => setNewPMDefaultEdit(e.target.checked)} /> Default</label>
                                            <label className="flex items-center gap-1"><input type="checkbox" checked={newPMCommonEdit} onChange={(e) => setNewPMCommonEdit(e.target.checked)} /> Common</label>
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                            <Button type="button" size="sm" variant="outline" className="h-7 px-3" onClick={() => { setShowAddPMEdit(false); setNewPMLabelEdit(''); setNewPMDefaultEdit(false); setNewPMCommonEdit(false) }}>Cancel</Button>
                                            <Button type="button" size="sm" className="h-7 px-3" disabled={creatingPM} onClick={async () => {
                                                if (!newPMLabelEdit.trim()) { toast.error('Label required'); return }
                                                if (newPMDefaultEdit && paymentMethods.some(pm => pm.is_default)) { toast.error('Only one default method allowed'); return }
                                                try {
                                                    const res = await createPM({ label: newPMLabelEdit.trim(), is_default: newPMDefaultEdit, is_common: newPMCommonEdit }).unwrap()
                                                    if ((res as ApiSuccess<PaymentMethod>)?.status) {
                                                        const created = (res as ApiSuccess<PaymentMethod>).data
                                                        setEditPaymentMethod(created.id)
                                                        toast.success(extractSuccessMessage(res, 'Added'))
                                                    } else {
                                                        toast.success('Added')
                                                    }
                                                    setShowAddPMEdit(false); setNewPMLabelEdit(''); setNewPMDefaultEdit(false); setNewPMCommonEdit(false)
                                                } catch (e2) {
                                                    toast.error(extractErrorMessage(e2))
                                                }
                                            }}>Save</Button>
                                        </div>
                                    </div>
                                )}
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
                    <div role="dialog" aria-modal="true" aria-labelledby="delete-repayment-title" className="bg-background rounded-md p-4 w-[420px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <h3 id="delete-repayment-title" className="font-semibold mb-2">Delete repayment</h3>
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
