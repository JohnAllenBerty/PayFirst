import { AppSidebar } from "@/components/app-sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { useMemo, Fragment } from "react"
import { Outlet, useLocation, Link } from "react-router-dom"
import { useMeta } from "@/context/MetaContext"

export default function Page() {
    const location = useLocation()
    const { getLabel } = useMeta()

    const crumbs = useMemo(() => {
        const segments = location.pathname.split("/").filter(Boolean)

        const rootLabel = getLabel('/', 'Dashboard')
        const items: { name: string; path: string }[] = [{ name: rootLabel, path: "/" }]

        // Normalize any label or segment into Title Case words, removing slashes/hyphens/underscores
        const humanize = (value: string | undefined): string => {
            const s = (value || '').toString()
                .replace(/^\/+|\/+$/g, '') // trim leading/trailing slashes
                .replace(/[/_-]+/g, ' ') // replace separators with spaces
                .trim()
                .replace(/\s+/g, ' ')
            if (!s) return ''
            return s.replace(/\b\w/g, c => c.toUpperCase())
        }

        segments.forEach((seg, i) => {
            const path = "/" + segments.slice(0, i + 1).join("/")

            // Build labels without leading slashes; capitalize words
            let label: string | undefined
            if (i === 0) {
                // Top-level: prefer a clean Meta label if available and not a path-like string
                const metaByPath = getLabel(path)
                const safeMeta = metaByPath && !metaByPath.startsWith('/') ? metaByPath : undefined
                label = humanize(safeMeta || getLabel(seg) || seg)
            } else {
                // Nested: strictly humanize; do not use Meta for nested segments
                label = humanize(seg)
            }

            items.push({ name: label, path })
        })

        return items
    }, [location.pathname, getLabel])

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4 w-full min-w-0">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb aria-label="Breadcrumb" className="w-full overflow-x-auto whitespace-nowrap">
                            <BreadcrumbList className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                                {crumbs.map((c, idx) => {
                                    const isLast = idx === crumbs.length - 1
                                    return (
                                        <Fragment key={c.path}>
                                            <BreadcrumbItem
                                                className={`${idx === 0 ? "hidden md:block " : ""}flex-shrink-0 whitespace-nowrap`}
                                            >
                                                {isLast ? (
                                                    <BreadcrumbPage>{c.name}</BreadcrumbPage>
                                                ) : (
                                                    <BreadcrumbLink asChild>
                                                        <Link to={c.path} className="inline-flex items-center h-5">{c.name}</Link>
                                                    </BreadcrumbLink>
                                                )}
                                            </BreadcrumbItem>
                                            {!isLast && (
                                                <BreadcrumbSeparator className="hidden md:inline-flex flex-shrink-0 items-center justify-center mx-1 text-muted-foreground" />
                                            )}
                                        </Fragment>
                                    )
                                })}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}