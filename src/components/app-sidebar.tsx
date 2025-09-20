import {
  Settings2,
  SquareTerminal,
  Wallet2
} from "lucide-react"
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

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Pay First",
      logo: Wallet2,
      plan: "Enterprise",
    },
  ],
  navMain: [
    {
      title: "Contacts",
      url: "/contact",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "All Contacts",
          url: "/contact",
        },
        {
          title: "Groups",
          url: "/contact/groups",
        },
      ],
    },
    {
      title: "Finance",
      url: "/transactions",
      icon: Wallet2,
      items: [
        {
          title: "Transactions",
          url: "/transactions",
        },
        {
          title: "Repayments",
          url: "/repayments",
        },
      ],
    },
    {
      title: "Account",
      url: "/profile",
      icon: Settings2,
      items: [
        {
          title: "Profile",
          url: "/profile",
        },
        {
          title: "Change Password",
          url: "/change-password",
        },
      ],
    },
  ],
  projects: [],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
            <span className="truncate font-medium">{data.teams[0].name}</span>
            <span className="truncate text-xs">{data.teams[0].plan}</span>
          </div>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
