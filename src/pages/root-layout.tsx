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
import { useMemo } from "react"
import { Outlet, useLocation } from "react-router-dom"
// ...existing code...

export default function Page() {
    const location = useLocation()

    const crumbs = useMemo(() => {
        const segments = location.pathname.split("/").filter(Boolean)

        const known: Record<string, string> = {
            "": "Dashboard",
            "sign-up": "Sign up",
            "login": "Login",
            "dashboard": "Dashboard",
            "profile": "Profile",
            // add more known mappings here as you add routes
        }

        const items: { name: string; path: string }[] = [{ name: "Dashboard", path: "/" }]

        segments.forEach((seg, i) => {
            const path = "/" + segments.slice(0, i + 1).join("/")
            const name = known[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
            items.push({ name, path })
        })

        return items
    }, [location.pathname])

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                {crumbs.map((c, idx) => {
                                    const isLast = idx === crumbs.length - 1
                                    return (
                                        <BreadcrumbItem
                                            key={c.path}
                                            className={idx === 0 ? "hidden md:block" : undefined}
                                        >
                                            {isLast ? (
                                                <BreadcrumbPage>{c.name}</BreadcrumbPage>
                                            ) : (
                                                <>
                                                    <BreadcrumbLink href={c.path}>
                                                        {c.name}
                                                    </BreadcrumbLink>
                                                    <BreadcrumbSeparator className="hidden md:block" />
                                                </>
                                            )}
                                        </BreadcrumbItem>
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