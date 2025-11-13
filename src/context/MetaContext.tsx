import React, { createContext, useContext, useMemo } from 'react'
import { useMetaQuery, type ApiFail, type ApiSuccess, type ModuleInfo } from '@/store/api/payFirstApi'

export type MetaModule = {
    key: string
    label?: string
    title?: string
    is_active?: boolean
    urls?: string[]
}

type MetaContextValue = {
    ready: boolean
    modules: Record<string, MetaModule>
    getModule: (keyOrPath: string) => MetaModule | undefined
    getLabel: (keyOrPath: string, fallback?: string) => string
    getTitle: (keyOrPath: string, fallback?: string) => string
    isActive: (keyOrPath: string) => boolean | undefined
}

const MetaContext = createContext<MetaContextValue | undefined>(undefined)

function normalizeKey(v: unknown): string | undefined {
    if (typeof v !== 'string') return undefined
    const k = v.trim()
    if (!k) return undefined
    return k.toLowerCase().replace(/\s+/g, '_')
}

function toBool(v: unknown): boolean | undefined {
    if (typeof v === 'boolean') return v
    if (typeof v === 'number') return v !== 0
    if (typeof v === 'string') return ['true', '1', 'yes', 'active', 'enabled'].includes(v.toLowerCase())
    return undefined
}

function extractModule(raw: Record<string, unknown>): MetaModule | undefined {
    const key = normalizeKey(raw.key) || normalizeKey(raw.module) || normalizeKey(raw.name) || normalizeKey(raw.slug)
    if (!key) return undefined
    const label = ((): string | undefined => {
        const v = raw.label ?? raw.title ?? raw.name
        return typeof v === 'string' && v.trim() ? v : undefined
    })()
    const title = ((): string | undefined => {
        const v = raw.title ?? raw.label ?? raw.name
        return typeof v === 'string' && v.trim() ? v : undefined
    })()
    const is_active = toBool(raw.is_active ?? raw.active ?? raw.enabled)
    const urls: string[] = []
    const pushUrl = (u: unknown) => { if (typeof u === 'string' && u.startsWith('/')) urls.push(u) }
    pushUrl(raw.url); pushUrl(raw.path)
    const children = (raw.children ?? raw.routes) as unknown
    if (Array.isArray(children)) {
        children.forEach((c) => {
            if (c && typeof c === 'object') {
                const u = (c as Record<string, unknown>).url ?? (c as Record<string, unknown>).path
                pushUrl(u)
            }
        })
    }
    return { key, label, title, is_active, urls: urls.length ? urls : undefined }
}

export const MetaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: metaRes, isLoading } = useMetaQuery()

    const modules = useMemo(() => {
        const res = metaRes as ApiFail | ApiSuccess<ModuleInfo[]> | ModuleInfo[] | undefined
        const map: Record<string, MetaModule> = {}
        let arr: ModuleInfo[] = []
        if (!res) return map
        if (Array.isArray(res)) arr = res
        else if (typeof res !== 'string' && (res as ApiSuccess<ModuleInfo[]>)?.status) arr = (res as ApiSuccess<ModuleInfo[]>)?.data ?? []
        arr.forEach((item) => {
            if (item && typeof item === 'object') {
                const mod = extractModule(item as Record<string, unknown>)
                if (mod?.key) map[mod.key] = mod
            }
        })
        return map
    }, [metaRes])

    const getModule = (keyOrPath: string): MetaModule | undefined => {
        if (!keyOrPath) return undefined
        // path lookup
        if (keyOrPath.startsWith('/')) {
            const found = Object.values(modules).find((m) => m.urls?.some(u => keyOrPath.startsWith(u)))
            if (found) return found
        }
        // key lookup with a few aliases
        const key = normalizeKey(keyOrPath) || keyOrPath
        const direct = modules[key]
        if (direct) return direct
        // common aliases
        const aliases = [
            key.replace(/s$/, ''),
            key.replace(/_page$/, ''),
            key.replace(/^contact_groups?$/, 'contacts'),
        ]
        for (const a of aliases) { if (modules[a]) return modules[a] }
        return undefined
    }

    const getLabel = (keyOrPath: string, fallback?: string) => getModule(keyOrPath)?.label || fallback || keyOrPath
    const getTitle = (keyOrPath: string, fallback?: string) => getModule(keyOrPath)?.title || getLabel(keyOrPath, fallback)
    const isActive = (keyOrPath: string) => getModule(keyOrPath)?.is_active

    const value: MetaContextValue = { ready: !isLoading, modules, getModule, getLabel, getTitle, isActive }
    return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>
}

export function useMeta(): MetaContextValue {
    const ctx = useContext(MetaContext)
    if (ctx) return ctx
    // Safe fallback to avoid runtime errors if a component renders before MetaProvider is mounted
    return {
        ready: false,
        modules: {},
        getModule: () => undefined,
        getLabel: (keyOrPath: string, fallback?: string) => fallback || keyOrPath,
        getTitle: (keyOrPath: string, fallback?: string) => fallback || keyOrPath,
        isActive: () => undefined,
    }
}
