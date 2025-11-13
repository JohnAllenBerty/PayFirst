import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useMetaPageTitle } from '@/hooks/useMeta'
import { useListTransactionsQuery, useCreateTransactionMutation, useListContactsQuery, useUpdateTransactionMutation, useDeleteTransactionMutation, useListPaymentMethodsQuery, useCreatePaymentMethodMutation, useListPaymentSourcesQuery, useCreatePaymentSourceMutation, type ApiFail, type ApiSuccess, type Paginated, type Transaction, type Contact, type PaymentMethod, type PaymentSource } from '@/store/api/payFirstApi'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, ArrowUpAZ, ArrowDownAZ } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-toastify'
import { extractErrorMessage, extractSuccessMessage } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const TransactionsPage = () => {
    const { title } = useMetaPageTitle('/transactions', 'Transactions • PayFirst')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [ordering, setOrdering] = useState<string>('label')
    const [refresh, setRefresh] = useState(0)
    // Column filter input states (query) and applied filters
    const [labelQuery, setLabelQuery] = useState('')
    const [typeQuery, setTypeQuery] = useState<'credit' | 'debit' | ''>('')
    const [contactQuery, setContactQuery] = useState<number | ''>('')
    const [filters, setFilters] = useState<{ label?: string; _type?: 'credit' | 'debit'; contact?: number }>({})
    // Contacts for dropdown and details
    const { data: contactsRes, isLoading: loadingContacts } = useListContactsQuery({ page_size: 1000 })

    // Payment methods for optional selection
    const { data: pmRes, isLoading: loadingPM } = useListPaymentMethodsQuery({ page_size: 1000 })
    const [createPM, { isLoading: creatingPM }] = useCreatePaymentMethodMutation()
    // Payment sources for optional selection
    const { data: psRes, isLoading: loadingPS } = useListPaymentSourcesQuery({ page_size: 1000 })
    const [createPS, { isLoading: creatingPS }] = useCreatePaymentSourceMutation()
    const paymentMethods = useMemo(() => {
        const res = pmRes as ApiFail | Paginated<PaymentMethod> | ApiSuccess<Paginated<PaymentMethod> | PaymentMethod[]> | undefined
        if (!res) return [] as PaymentMethod[]
        if ((res as ApiFail).status === false) return [] as PaymentMethod[]
        if ((res as ApiSuccess<Paginated<PaymentMethod> | PaymentMethod[]>).status === true) {
            const ok = res as ApiSuccess<Paginated<PaymentMethod> | PaymentMethod[]>
            const data = ok.data
            return Array.isArray(data) ? data : (data.results ?? [])
        }
        const pg = res as Paginated<PaymentMethod>
        return Array.isArray(pg.results) ? pg.results : []
    }, [pmRes])
    const paymentSources = useMemo(() => {
        const res = psRes as ApiFail | Paginated<PaymentSource> | ApiSuccess<Paginated<PaymentSource> | PaymentSource[]> | undefined
        if (!res) return [] as PaymentSource[]
        if ((res as ApiFail).status === false) return [] as PaymentSource[]
        if ((res as ApiSuccess<Paginated<PaymentSource> | PaymentSource[]>).status === true) {
            const ok = res as ApiSuccess<Paginated<PaymentSource> | PaymentSource[]>
            const data = ok.data
            return Array.isArray(data) ? data : ((data as Paginated<PaymentSource>).results ?? [])
        }
        const pg = res as Paginated<PaymentSource>
        return Array.isArray(pg.results) ? pg.results : []
    }, [psRes])

    // Normalize contacts array once; use this in UI and search
    const contacts = useMemo(() => {
        const res = contactsRes as ApiFail | Paginated<Contact> | ApiSuccess<Paginated<Contact> | Contact[]> | undefined
        if (!res) return [] as Contact[]
        if ((res as ApiFail).status === false) return [] as Contact[]
        if ((res as ApiSuccess<Paginated<Contact> | Contact[]>).status === true) {
            const ok = res as ApiSuccess<Paginated<Contact> | Contact[]>
            const data = ok.data
            return Array.isArray(data) ? data : (data.results ?? [])
        }
        const pg = res as Paginated<Contact>
        return Array.isArray(pg.results) ? pg.results : []
    }, [contactsRes])

    // Build backend search param from supported fields (label, contact name). Type is filtered client-side.
    const searchText = useMemo(() => {
        const parts: string[] = []
        if (filters.label) parts.push(filters.label)
        if (typeof filters.contact === 'number') {
            const found = contacts.find(c => c.id === filters.contact)
            if (found?.name) parts.push(found.name)
        }
        return parts.join(' ').trim() || undefined
    }, [filters, contacts])

    // If type filter is active (no backend support), fetch unpaginated for reliable client-side filtering.
    const listParams = useMemo(() => {
        const base: Record<string, string | number | boolean | undefined> = {
            ordering,
            refresh,
            search: searchText,
        }
        if (!filters._type) {
            base.page = page
            base.page_size = pageSize
        }
        return base
    }, [ordering, refresh, searchText, filters._type, page, pageSize])

    const { data: txRes, isLoading: loadingTx, isFetching: fetchingTx } = useListTransactionsQuery(listParams)
    const [createTx, { isLoading: creating }] = useCreateTransactionMutation()
    const [updateTx, { isLoading: updating }] = useUpdateTransactionMutation()
    const [deleteTx, { isLoading: deleting }] = useDeleteTransactionMutation()

    const txData = useMemo(() => {
        const res = txRes as ApiFail | Paginated<Transaction> | ApiSuccess<Paginated<Transaction> | Transaction[]> | undefined
        if (!res) return { items: [] as Transaction[], total: 0 }
        if ((res as ApiFail).status === false) return { items: [] as Transaction[], total: 0 }
        if ((res as ApiSuccess<Paginated<Transaction> | Transaction[]>).status === true) {
            const ok = res as ApiSuccess<Paginated<Transaction> | Transaction[]>
            const data = ok.data
            if (Array.isArray(data)) return { items: data, total: data.length }
            return { items: data.results ?? [], total: data.count ?? (data.results ? data.results.length : 0) }
        }
        const pg = res as Paginated<Transaction>
        if (Array.isArray(pg.results)) return { items: pg.results, total: pg.count }
        return { items: [] as Transaction[], total: 0 }
    }, [txRes])
    // Apply client-side filters not supported by backend (i.e., _type)
    const transactions = useMemo(() => {
        let items = txData.items
        if (filters._type) items = items.filter((t) => t._type === filters._type)
        if (typeof filters.contact === 'number') items = items.filter((t) => t.contact === filters.contact)
        if (filters.label) items = items.filter((t) => t.label.toLowerCase().includes(filters.label!.toLowerCase()))
        return items
    }, [txData.items, filters])
    const totalTransactions = filters._type ? transactions.length : txData.total

    // contacts useMemo moved above

    const failMessage = (() => {
        const res = txRes as ApiFail | Paginated<Transaction> | ApiSuccess<Paginated<Transaction>> | undefined
        if (!res) return null
        if ((res as ApiFail).status === false) return String((res as ApiFail).error ?? 'Server error')
        return null
    })()

    const [label, setLabel] = useState('')
    const [contact, setContact] = useState<number | ''>('')
    const [_type, setType] = useState<'credit' | 'debit'>('credit')
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [returnDate, setReturnDate] = useState('')
    const [formError, setFormError] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<number | ''>('')
    const [paymentSource, setPaymentSource] = useState<number | ''>('')
    const [txRef, setTxRef] = useState('')
    // Inline quick add payment method state (create modal)
    const [showAddPM, setShowAddPM] = useState(false)
    const [newPMLabel, setNewPMLabel] = useState('')
    const [newPMDefault, setNewPMDefault] = useState(false)
    const [newPMCommon, setNewPMCommon] = useState(false)
    // No debounce; filters apply only on Enter/Apply

    const filteredTx = transactions // server handles filtering and sorting
    const [viewingId, setViewingId] = useState<number | null>(null)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editLabel, setEditLabel] = useState('')
    const [editType, setEditType] = useState<'credit' | 'debit'>('credit')
    const [editAmount, setEditAmount] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [editReturnDate, setEditReturnDate] = useState('')
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

    const onSubmit = async (e: React.FormEvent): Promise<boolean> => {
        e.preventDefault()
        setFormError(null)
        if (!label.trim()) { setFormError('Label is required'); return false }
        if (contact === '') { setFormError('Contact is required'); return false }
        const amt = parseFloat(amount)
        if (!isFinite(amt) || amt <= 0) { setFormError('Amount must be > 0'); return false }
        try {
            const res = await createTx({
                label: label.trim(),
                contact: Number(contact),
                _type,
                amount: amt,
                description: description.trim(),
                return_date: returnDate || null,
                date: new Date().toISOString().slice(0, 10),
                    payment_method: paymentMethod === '' ? null : Number(paymentMethod),
                    payment_source: paymentSource === '' ? null : Number(paymentSource),
                    transaction_reference: txRef.trim() || null,
            }).unwrap()
                setLabel(''); setContact(''); setType('credit'); setAmount(''); setDescription(''); setReturnDate(''); setPaymentMethod(''); setPaymentSource(''); setTxRef('')
            toast.success(extractSuccessMessage(res, 'Transaction created'))
            setRefresh((c) => c + 1)
            return true
        } catch (e) {
            const msg = extractErrorMessage(e)
            setFormError(msg)
            toast.error(msg)
            return false
        }
    }
    const [editPaymentMethod, setEditPaymentMethod] = useState<number | ''>('')
    const [editPaymentSource, setEditPaymentSource] = useState<number | ''>('')
    const [editTxRef, setEditTxRef] = useState('')
    // Inline quick add for edit modal
    const [showAddPMEdit, setShowAddPMEdit] = useState(false)
    const [newPMLabelEdit, setNewPMLabelEdit] = useState('')
    const [newPMDefaultEdit, setNewPMDefaultEdit] = useState(false)
    const [newPMCommonEdit, setNewPMCommonEdit] = useState(false)

    // Zero-results toast logic
    const lastToastSignature = useRef<string>('')
    useEffect(() => {
        if (loadingTx) return
        const activeFilter = Boolean(filters.label || filters._type || typeof filters.contact === 'number')
        if (!activeFilter) return
        const signature = `${filters.label || ''}|${filters._type || ''}|${filters.contact || ''}`
        if (filteredTx.length === 0 && lastToastSignature.current !== signature) {
            lastToastSignature.current = signature
            toast.info('No transactions match your filters. Adjust or clear filters to see results.')
        }
    }, [loadingTx, filteredTx.length, filters])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">{title.replace(/\s*•\s*PayFirst$/, '')}</h1>
                <p className="text-sm text-muted-foreground">Record credits and debits for your contacts.</p>
            </div>

            {failMessage && (
                <div className="max-w-xl rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between gap-3">
                    <span>{failMessage}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => setRefresh((c) => c + 1)}>Retry</Button>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div />
                <Button size="sm" onClick={() => { setCreateOpen(true); setFormError(null) }}>New Transaction</Button>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="font-medium">All transactions</h2>
                    <div className="flex items-center gap-2 text-sm">
                        <label className="text-muted-foreground" htmlFor="tx-page-size">Rows per page</label>
                        <select
                            id="tx-page-size"
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
                                <TableHead>Type</TableHead>
                                <TableHead className="cursor-pointer select-none" aria-label="Sort by amount" onClick={() => setOrdering((prev) => prev === 'amount' ? '-amount' : 'amount')}>
                                    <span className="inline-flex items-center gap-1">Amount {ordering.includes('amount') && (ordering.startsWith('-') ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />)}</span>
                                </TableHead>
                                <TableHead>Pending</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead className="cursor-pointer select-none" aria-label="Sort by date" onClick={() => setOrdering((prev) => prev === 'date' ? '-date' : 'date')}>
                                    <span className="inline-flex items-center gap-1">Date {ordering.includes('date') && (ordering.startsWith('-') ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />)}</span>
                                </TableHead>
                                <TableHead className="cursor-pointer select-none" aria-label="Sort by return date" onClick={() => setOrdering((prev) => prev === 'return_date' ? '-return_date' : 'return_date')}>
                                    <span className="inline-flex items-center gap-1">Return date {ordering.includes('return_date') && (ordering.startsWith('-') ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />)}</span>
                                </TableHead>
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
                                <TableCell>
                                    <select className="h-8 rounded-md border bg-background px-2 text-sm" value={typeQuery} onChange={(e) => setTypeQuery((e.target.value as 'credit' | 'debit' | ''))}>
                                        <option value="">All</option>
                                        <option value="credit">Credit</option>
                                        <option value="debit">Debit</option>
                                    </select>
                                </TableCell>
                                <TableCell />
                                <TableCell />
                                <TableCell>
                                    <select className="h-8 rounded-md border bg-background px-2 text-sm" value={contactQuery} onChange={(e) => setContactQuery(e.target.value ? Number(e.target.value) : '')}>
                                        <option value="">All contacts</option>
                                        {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </TableCell>
                                <TableCell />
                                <TableCell className="text-right pr-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        disabled={fetchingTx}
                                        onClick={() => {
                                            const next: { label?: string; _type?: 'credit' | 'debit'; contact?: number } = {}
                                            const lbl = labelQuery.trim()
                                            if (lbl) next.label = lbl
                                            if (typeQuery) next._type = typeQuery
                                            if (typeof contactQuery === 'number') next.contact = contactQuery
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
                            {loadingTx ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
                            ) : filteredTx.length ? (
                                (filters._type ? filteredTx.slice((page - 1) * pageSize, page * pageSize) : filteredTx).map((t: Transaction) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-medium" title={t.description ? `${t.label} — ${t.description}` : t.label}>{t.label}</TableCell>
                                        <TableCell className="uppercase">{t._type}</TableCell>
                                        <TableCell>{t.amount}</TableCell>
                                        <TableCell className="text-muted-foreground">{t.pending_amount}</TableCell>
                                        <TableCell>{contacts.find(c => c.id === t.contact)?.name || t.contact}</TableCell>
                                        <TableCell>{t.date}</TableCell>
                                        <TableCell>{t.return_date || '—'}</TableCell>
                                        <TableCell className="text-right pr-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setViewingId(t.id)}>View</Button>
                                                <Button size="sm" variant="outline" onClick={() => { setEditingId(t.id); setEditLabel(t.label); setEditType(t._type); setEditAmount(String(t.amount)); setEditDescription(t.description || ''); setEditReturnDate(t.return_date || ''); setEditPaymentMethod(typeof t.payment_method === 'number' ? t.payment_method : ''); setEditPaymentSource(typeof t.payment_source === 'number' ? t.payment_source : ''); setEditTxRef(t.transaction_reference || ''); }}>Edit</Button>
                                                <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteId(t.id)} disabled={deleting}>Delete</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-sm text-muted-foreground">No transactions found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {(() => {
                    const totalPages = Math.max(1, Math.ceil(totalTransactions / pageSize))
                    return totalTransactions > 0 ? (
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
                    <div role="dialog" aria-modal="true" aria-labelledby="new-transaction-title" className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 id="new-transaction-title" className="font-semibold">New transaction</h3>
                            <button aria-label="Close dialog" className="text-sm text-muted-foreground" onClick={() => setCreateOpen(false)}>Close</button>
                        </div>
                        <form onSubmit={async (e) => { const ok = await onSubmit(e); if (ok) setCreateOpen(false) }} className="grid gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="label">Label</Label>
                                <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Loan to John" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="contact">Contact</Label>
                                <select id="contact" className="h-9 rounded-md border bg-background px-3 text-sm" value={contact} onChange={(e) => setContact(e.target.value ? Number(e.target.value) : '')}>
                                    <option value="" disabled>{loadingContacts ? 'Loading…' : 'Select a contact'}</option>
                                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type">Type</Label>
                                <select id="type" className="h-9 rounded-md border bg-background px-3 text-sm" value={_type} onChange={(e) => setType(e.target.value as 'credit' | 'debit')}>
                                    <option value="credit">Credit</option>
                                    <option value="debit">Debit</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="amount">Amount</Label>
                                <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="returnDate">Return date (optional)</Label>
                                <Input id="returnDate" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
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
                                            <Button type="button" size="sm" variant="outline" className="h-7 px-3" onClick={() => {
                                                setShowAddPM(false); setNewPMLabel(''); setNewPMDefault(false); setNewPMCommon(false)
                                            }}>Cancel</Button>
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
                    <div role="dialog" aria-modal="true" aria-labelledby="view-transaction-title" className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 id="view-transaction-title" className="font-semibold">Transaction details</h3>
                            <button aria-label="Close dialog" className="text-sm text-muted-foreground" onClick={() => setViewingId(null)}>Close</button>
                        </div>
                        {(() => {
                            const tx = transactions.find(x => x.id === viewingId)
                            if (!tx) return <div className="text-sm">Not found</div>
                            const contactName = contacts.find(c => c.id === tx.contact)?.name || tx.contact
                            return (
                                <div className="text-sm space-y-2">
                                    <div><span className="text-muted-foreground">Label:</span> {tx.label}</div>
                                    <div><span className="text-muted-foreground">Contact:</span> {String(contactName)}</div>
                                    <div><span className="text-muted-foreground">Type:</span> {tx._type}</div>
                                    <div><span className="text-muted-foreground">Amount:</span> {tx.amount}</div>
                                    <div><span className="text-muted-foreground">Pending:</span> {tx.pending_amount}</div>
                                    <div><span className="text-muted-foreground">Date:</span> {tx.date}</div>
                                    <div><span className="text-muted-foreground">Return date:</span> {tx.return_date || '—'}</div>
                                    <div><span className="text-muted-foreground">Description:</span> {tx.description || '—'}</div>
                                    <div><span className="text-muted-foreground">Payment method:</span> {paymentMethods.find(pm => pm.id === (tx.payment_method ?? -1))?.label || '—'}</div>
                                    <div><span className="text-muted-foreground">Payment source:</span> {paymentSources.find(ps => ps.id === (tx.payment_source ?? -1))?.label || '—'}</div>
                                    <div><span className="text-muted-foreground">Reference:</span> {tx.transaction_reference || '—'}</div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {editingId !== null && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditingId(null)}>
                    <div role="dialog" aria-modal="true" aria-labelledby="edit-transaction-title" className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 id="edit-transaction-title" className="font-semibold">Edit transaction</h3>
                            <button aria-label="Close dialog" className="text-sm text-muted-foreground" onClick={() => setEditingId(null)}>Close</button>
                        </div>
                        <form className="grid gap-3" onSubmit={async (e) => {
                            e.preventDefault()
                            try {
                                const id = editingId!
                                const amt = parseFloat(editAmount)
                                await updateTx({ id, changes: { label: editLabel.trim(), _type: editType, amount: amt, description: editDescription.trim(), return_date: editReturnDate || null, payment_method: editPaymentMethod === '' ? null : Number(editPaymentMethod), payment_source: editPaymentSource === '' ? null : Number(editPaymentSource), transaction_reference: editTxRef.trim() || null } }).unwrap()
                                toast.success('Transaction updated')
                                setEditingId(null)
                            } catch (e) {
                                toast.error(extractErrorMessage(e))
                            }
                        }}>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-label">Label</Label>
                                <Input id="edit-label" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-type">Type</Label>
                                <select id="edit-type" className="h-9 rounded-md border bg-background px-3 text-sm" value={editType} onChange={(e) => setEditType(e.target.value as 'credit' | 'debit')}>
                                    <option value="credit">Credit</option>
                                    <option value="debit">Debit</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-amount">Amount</Label>
                                <Input id="edit-amount" type="number" min="0" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Input id="edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-return-date">Return date</Label>
                                <Input id="edit-return-date" type="date" value={editReturnDate} onChange={(e) => setEditReturnDate(e.target.value)} />
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
                                            <Button type="button" size="sm" variant="outline" className="h-7 px-3" onClick={() => {
                                                setShowAddPMEdit(false); setNewPMLabelEdit(''); setNewPMDefaultEdit(false); setNewPMCommonEdit(false)
                                            }}>Cancel</Button>
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
                    <div role="dialog" aria-modal="true" aria-labelledby="delete-transaction-title" className="bg-background rounded-md p-4 w-[420px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                        <h3 id="delete-transaction-title" className="font-semibold mb-2">Delete transaction</h3>
                        <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                            <Button variant="destructive" disabled={deleting} onClick={async () => {
                                try {
                                    await deleteTx(confirmDeleteId!).unwrap()
                                    toast.success('Transaction deleted')
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

export default TransactionsPage
