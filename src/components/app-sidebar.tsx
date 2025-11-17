import {
  Settings2,
  SquareTerminal,
  Wallet2
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useProfileQuery, type ApiSuccess, type ApiFail, type Profile } from "@/store/api/payFirstApi"
import { useAuthToken } from '@/hooks/useAuthToken'
import { useMeta } from "@/context/MetaContext"

// Static shells; labels will be overridden by Meta when present
const sections = [
  {
    key: 'contacts',
    title: 'Contacts',
    icon: SquareTerminal,
    items: [
      { key: 'contacts', title: 'All Contacts', url: '/contact' },
      { key: 'contact_groups', title: 'Groups', url: '/contact/groups' },
    ],
  },
  {
    key: 'finance',
    title: 'Finance',
    icon: Wallet2,
    items: [
      { key: 'transactions', title: 'Transactions', url: '/transactions' },
      { key: 'repayments', title: 'Repayments', url: '/repayments' },
      { key: 'payment_methods', title: 'Payment Methods', url: '/payment-methods' },
      { key: 'payment_sources', title: 'Payment Sources', url: '/payment-sources' },
    ],
  },
  {
    key: 'account',
    title: 'Account',
    icon: Settings2,
    items: [
      { key: 'profile', title: 'Profile', url: '/profile' },
      { key: 'change_password', title: 'Change Password', url: '/change-password' },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { getLabel, isActive } = useMeta()
  const { hasToken } = useAuthToken()
  const { data: profileRes } = useProfileQuery(undefined, { skip: !hasToken })
  const userFromProfile = React.useMemo(() => {
    const fallback = { name: "User", email: "", avatar: "" }
    if (profileRes && typeof profileRes !== 'string') {
      const res = profileRes as ApiSuccess<Profile> | ApiFail
      if (res.status) {
        const p = res.data
        const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
        const name = fullName || p.user || 'User'
        // Our Profile type doesn't include email; show user in the subline if available
        const email = p.user || ''
        return { name, email, avatar: "" }
      }
    }
    return fallback
  }, [profileRes])
  const navMain = React.useMemo(() => {
    // Map sections + items with Meta labels and visibility
    return sections
      .map((sec) => {
        const visibleItems = sec.items.filter((it) => isActive(it.url) !== false && isActive(it.key) !== false)
        if (visibleItems.length === 0 && isActive(sec.key) === false) return null
        return {
          title: getLabel(sec.key, sec.title),
          url: visibleItems[0]?.url || '#',
          icon: sec.icon,
          isActive: true,
          items: visibleItems.map((it) => ({
            title: getLabel(it.url, getLabel(it.key, it.title)),
            url: it.url,
          })),
        }
      })
  .filter(Boolean) as Array<{ title: string; url: string; icon?: LucideIcon; isActive?: boolean; items: { title: string; url: string }[] }>
  }, [getLabel, isActive])
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* <TeamSwitcher teams={data.teams} /> */}
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Wallet2 className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">Pay First</span>
            <span className="truncate text-xs">App</span>
          </div>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userFromProfile} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
