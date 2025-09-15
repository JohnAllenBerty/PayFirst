import React, { lazy } from "react"
import type { RouteObject } from "react-router-dom"

const Dashboard = lazy(() => import("@/pages/dashboard"))
const ContactGroupList = lazy(() => import("@/components/contact-group-list"))
const ContactPage = lazy(() => import("@/components/contact-page"))

export const childrenRoutes: RouteObject[] = [
    {
        index: true,
        element: React.createElement(Dashboard)
    },
    {
        path: "/contact",
        element: React.createElement(ContactPage)
    },
    {
        path: "/contact/groups",
        element: React.createElement(ContactGroupList)
    },
]