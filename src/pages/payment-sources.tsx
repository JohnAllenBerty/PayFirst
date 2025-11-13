import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-toastify'
import { ArrowDownAZ, ArrowUpAZ, Plus } from 'lucide-react'
import type { ApiFail, ApiSuccess, Paginated, PaymentSource } from '@/store/api/payFirstApi'
import { useListPaymentSourcesQuery, useCreatePaymentSourceMutation, useUpdatePaymentSourceMutation, useDeletePaymentSourceMutation } from '@/store/api/payFirstApi'
import { extractErrorMessage, extractSuccessMessage } from '@/lib/utils'
import { useMetaPageTitle } from '@/hooks/useMeta'

const PaymentSourcesPage = () => {
  const { title } = useMetaPageTitle('/payment-sources', 'Payment Sources • PayFirst')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [ordering, setOrdering] = useState<string>('label')
  const [refresh, setRefresh] = useState(0)
  const [labelQuery, setLabelQuery] = useState('')
  const [filters, setFilters] = useState<{ label?: string }>({})
  const [lastToastSig, setLastToastSig] = useState('')

  const { data: psRes, isLoading, isFetching } = useListPaymentSourcesQuery({ page, page_size: pageSize, ordering, refresh, search: filters.label })
  const [createPS, { isLoading: creating }] = useCreatePaymentSourceMutation()
  const [updatePS, { isLoading: updating }] = useUpdatePaymentSourceMutation()
  const [deletePS, { isLoading: deleting }] = useDeletePaymentSourceMutation()

  const psData = useMemo(() => {
    const res = psRes as ApiFail | Paginated<PaymentSource> | ApiSuccess<Paginated<PaymentSource> | PaymentSource[]> | undefined
    if (!res) return { items: [] as PaymentSource[], total: 0 }
    if ((res as ApiSuccess<Paginated<PaymentSource> | PaymentSource[]>).status === true) {
      const ok = res as ApiSuccess<Paginated<PaymentSource> | PaymentSource[]>
      const d = ok.data as unknown
      if (Array.isArray(d)) return { items: d, total: d.length }
      const pg = d as Paginated<PaymentSource>
      if (Array.isArray(pg.results)) return { items: pg.results, total: pg.count ?? pg.results.length }
      return { items: [] as PaymentSource[], total: 0 }
    }
    if ((res as ApiFail).status === false) return { items: [] as PaymentSource[], total: 0 }
    const pg = res as Paginated<PaymentSource>
    if (Array.isArray(pg.results)) return { items: pg.results, total: pg.count ?? pg.results.length }
    return { items: [] as PaymentSource[], total: 0 }
  }, [psRes])

  const items = psData.items
  const total = psData.total

  // Zero-results toast when filters applied
  const activeFilter = Boolean(filters.label)
  if (!isLoading && activeFilter && items.length === 0) {
    const sig = `${filters.label || ''}`
    if (sig !== lastToastSig) {
      setLastToastSig(sig)
      toast.info('No payment sources match your filter. Adjust or clear filters to see results.')
    }
  }

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Edit modal state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title.replace(/\s*•\s*PayFirst$/, '')}</h1>
          <p className="text-sm text-muted-foreground">Track where payments come from (e.g., Bank A, UPI, etc.).</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Source
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">All sources</h2>
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
                  <Input
                    value={labelQuery}
                    onChange={(e) => setLabelQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setFilters({ label: labelQuery.trim() || undefined }); setPage(1) } }}
                    placeholder="Filter label…"
                    className="h-8"
                  />
                </TableCell>
                <TableCell className="text-right pr-3">
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2" disabled={isFetching} onClick={() => { setFilters({ label: labelQuery.trim() || undefined }); setPage(1) }}>Apply</Button>
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
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
              ) : items.length ? (
                items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell className="text-right pr-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(m.id); setEditLabel(m.label) }}>Edit</Button>
                        <Button size="sm" variant="destructive" disabled={deleting} onClick={async () => {
                          try {
                            const res = await deletePS(m.id).unwrap()
                            toast.success(extractSuccessMessage(res, 'Deleted'))
                          } catch (e) {
                            toast.error(extractErrorMessage(e))
                          }
                        }}>Delete</Button>
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
          const totalPages = Math.max(1, Math.ceil(total / pageSize))
          return total > 0 ? (
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
          <div role="dialog" aria-modal="true" aria-labelledby="add-payment-source-title" className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 id="add-payment-source-title" className="font-semibold">Add payment source</h3>
              <button aria-label="Close dialog" className="text-sm text-muted-foreground" onClick={() => setCreateOpen(false)}>Close</button>
            </div>
            <form className="grid gap-3" onSubmit={async (e) => {
              e.preventDefault()
              setFormError(null)
              if (!label.trim()) { setFormError('Label is required'); return }
              try {
                const res = await createPS({ label: label.trim() }).unwrap()
                toast.success(extractSuccessMessage(res, 'Payment source added'))
                setLabel('')
                setCreateOpen(false)
                setRefresh(c => c + 1)
              } catch (e) {
                toast.error(extractErrorMessage(e))
              }
            }}>
              <div className="grid gap-2">
                <Label htmlFor="ps-label">Label</Label>
                <Input id="ps-label" value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              {formError && <div className="text-sm text-red-600">{formError}</div>}
              <div className="flex items-center gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={creating}>Add</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingId !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditingId(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="edit-payment-source-title" className="bg-background rounded-md p-4 w-[520px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 id="edit-payment-source-title" className="font-semibold">Edit payment source</h3>
              <button aria-label="Close dialog" className="text-sm text-muted-foreground" onClick={() => setEditingId(null)}>Close</button>
            </div>
            <form className="grid gap-3" onSubmit={async (e) => {
              e.preventDefault()
              try {
                const id = editingId!
                const res = await updatePS({ id, changes: { label: editLabel.trim() } }).unwrap()
                toast.success(extractSuccessMessage(res, 'Updated'))
                setEditingId(null)
              } catch (e) {
                toast.error(extractErrorMessage(e))
              }
            }}>
              <div className="grid gap-2">
                <Label htmlFor="edit-ps-label">Label</Label>
                <Input id="edit-ps-label" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button type="submit" disabled={updating}>Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentSourcesPage
