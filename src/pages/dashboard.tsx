import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSummaryQuery, useMetaQuery, type ApiFail, type ApiSuccess, type SummaryItem, type ModuleInfo } from "@/store/api/payFirstApi";
import { useMetaPageTitle } from '@/hooks/useMeta'
import { useMemo } from "react";

const Dashboard = () => {
    const { data: summaryRes, isLoading: loadingSummary } = useSummaryQuery();
    const { data: metaRes, isLoading: loadingMeta } = useMetaQuery();
    const { title } = useMetaPageTitle('/', 'Dashboard • PayFirst')

    const summary = useMemo(() => {
        const res = summaryRes as ApiFail | ApiSuccess<SummaryItem[]> | SummaryItem[] | undefined;
        if (!res) return [] as SummaryItem[];
        if (Array.isArray(res)) return res;
        if (typeof res !== 'string' && (res as ApiSuccess<SummaryItem[]>)?.status) {
            return (res as ApiSuccess<SummaryItem[]>)?.data ?? [];
        }
        return [] as SummaryItem[];
    }, [summaryRes]);

    const meta = useMemo(() => {
        const res = metaRes as ApiFail | ApiSuccess<ModuleInfo[]> | ModuleInfo[] | undefined;
        if (!res) return [] as ModuleInfo[];
        if (Array.isArray(res)) return res;
        if (typeof res !== 'string' && (res as ApiSuccess<ModuleInfo[]>)?.status) {
            return (res as ApiSuccess<ModuleInfo[]>)?.data ?? [];
        }
        return [] as ModuleInfo[];
    }, [metaRes]);

    // Aggregate metrics from summary
    const totals = useMemo(() => {
        const sumNum = (arr: SummaryItem[], keyRe: RegExp) => arr.reduce((acc, it) => {
            const match = Object.entries(it).find(([k]) => keyRe.test(k))?.[1]
            const num = typeof match === 'number' ? match : Number(match ?? 0)
            return acc + (isFinite(num) ? num : 0)
        }, 0)
        return {
            totalTxn: sumNum(summary, /total_transaction_amount/i),
            totalRep: sumNum(summary, /total_repayment_amount/i),
            totalPending: sumNum(summary, /pending_amount/i),
        }
    }, [summary])

    // Top 5 pending contacts (best-effort based on keys)
    const topPending = useMemo(() => {
        const items = summary.map((it) => {
            const name = String(
                Object.entries(it).find(([k]) => /name|label|contact/i.test(k))?.[1] ?? 'Unknown'
            )
            const pendingRaw = Object.entries(it).find(([k]) => /pending_amount/i.test(k))?.[1]
            const pending = typeof pendingRaw === 'number' ? pendingRaw : Number(pendingRaw ?? 0)
            return { name, pending: isFinite(pending) ? pending : 0 }
        })
        const sorted = items.sort((a, b) => b.pending - a.pending)
        return sorted.slice(0, 5)
    }, [summary])

    const maxPending = useMemo(() => Math.max(0, ...topPending.map(x => x.pending)), [topPending])

    return (
        <div className="h-full bg-gray-50 p-6 space-y-6">
            <div>
                <h1 className="text-xl font-semibold">{title.replace(/\s*•\s*PayFirst$/,'')}</h1>
                <p className="text-sm text-muted-foreground">Overview and quick insights.</p>
            </div>

            {/* Totals row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[{ title: 'Total transactions', value: totals.totalTxn }, { title: 'Total repayments', value: totals.totalRep }, { title: 'Pending amount', value: totals.totalPending }].map((m, i) => (
                    <Card key={i} className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">{m.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingSummary ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-semibold">{m.value}</div>}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingSummary ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="shadow-sm">
                            <CardHeader>
                                <Skeleton className="h-5 w-40" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-24" />
                            </CardContent>
                        </Card>
                    ))
                ) : summary.length ? (
                    summary.map((item, idx) => {
                        // Try to find a reasonable label/value; otherwise render as JSON count summary
                        const entries = Object.entries(item || {});
                        const title = String(entries.find(([k]) => /name|label|contact/i.test(k))?.[1] ?? `Item ${idx + 1}`);
                        const value = entries.find(([k]) => /pending|amount|total/i.test(k))?.[1];
                        return (
                            <Card key={idx} className="shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base">{title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {typeof value === 'number' ? (
                                        <div className="text-2xl font-semibold">{value}</div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">{entries.length ? `${entries.length} fields` : 'No data'}</div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">No summary data.</div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Top pending chart */}
            <div className="grid grid-cols-1 gap-4">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Top pending by contact</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingSummary ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-64" />
                                <Skeleton className="h-4 w-56" />
                                <Skeleton className="h-4 w-72" />
                            </div>
                        ) : topPending.length ? (
                            <ul className="space-y-2" aria-label="Top pending chart">
                                {topPending.map((row, i) => {
                                    const pct = maxPending > 0 ? Math.max(2, Math.round((row.pending / maxPending) * 100)) : 0
                                    return (
                                        <li key={i} className="text-sm">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="truncate pr-2" title={row.name}>{row.name}</span>
                                                <span className="tabular-nums">{row.pending}</span>
                                            </div>
                                            <div className="h-2 w-full bg-gray-200 rounded">
                                                <div className="h-2 bg-blue-500 rounded" style={{ width: `${pct}%` }} aria-label={`${row.name} ${row.pending}`} />
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        ) : (
                            <div className="text-sm text-muted-foreground">No pending items.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Meta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingMeta ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-56" />
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                        ) : meta.length ? (
                            <ul className="text-sm list-disc pl-5 space-y-1">
                                {meta.map((m, i) => {
                                    const entries = Object.entries(m || {});
                                    const title = String(entries.find(([k]) => /name|module|label|title/i.test(k))?.[1] ?? `Module ${i + 1}`);
                                    const desc = String(entries.find(([k]) => /desc|help|info/i.test(k))?.[1] ?? '');
                                    return (
                                        <li key={i}>
                                            <span className="font-medium">{title}</span>
                                            {desc ? <span className="text-muted-foreground"> — {desc}</span> : null}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="text-sm text-muted-foreground">No meta information.</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Quick actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                        <Button asChild><a href="/transactions">Transactions</a></Button>
                        <Button asChild variant="outline"><a href="/repayments">Repayments</a></Button>
                        <Button asChild variant="outline"><a href="/contacts">Contacts</a></Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default Dashboard;