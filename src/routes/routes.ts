import React, { lazy } from "react"
import type { RouteObject } from "react-router-dom"

const Dashboard = lazy(() => import("@/pages/dashboard"))
const ContactGroupList = lazy(() => import("@/components/contact-group-list"))
const ContactPage = lazy(() => import("@/components/contact-page"))
const TransactionsPage = lazy(() => import("@/pages/transactions"))
const RepaymentsPage = lazy(() => import("@/pages/repayments"))
const ProfilePage = lazy(() => import("@/pages/profile"))
const ChangePasswordPage = lazy(() => import("@/pages/change-password"))

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
    {
        path: "/transactions",
        element: React.createElement(TransactionsPage)
    },
    {
        path: "/repayments",
        element: React.createElement(RepaymentsPage)
    },
    {
        path: "/profile",
        element: React.createElement(ProfilePage)
    },
    {
        path: "/change-password",
        element: React.createElement(ChangePasswordPage)
    },
]