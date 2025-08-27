import React from "react";
import type { RouteObject } from "react-router-dom";
import Dashboard from "@/pages/dashboard";

export const childrenRoutes: RouteObject[] = [
    {
        index: true,
        element: React.createElement(Dashboard),
    },
]