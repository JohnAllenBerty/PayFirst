import { useEffect, useMemo } from 'react'
import { useMeta } from '@/context/MetaContext'

export function useMetaPageTitle(keyOrPath: string, defaultTitle: string) {
    const { getTitle, ready } = useMeta()
    const title = useMemo(() => getTitle(keyOrPath, defaultTitle), [getTitle, keyOrPath, defaultTitle])
    useEffect(() => {
        if (!title) return
        const prev = document.title
        document.title = title
        return () => { document.title = prev }
    }, [title])
    return { title, ready }
}
