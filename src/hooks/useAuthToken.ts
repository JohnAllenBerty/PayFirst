import { useEffect, useState } from 'react'

// Centralized token presence hook. Treats any non-empty non-'undefined'/'null' string as valid.
export function useAuthToken() {
  const read = () => {
    try {
      const t = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!t) return null
      const trimmed = t.trim()
      if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null
      return trimmed
    } catch { return null }
  }
  const [token, setToken] = useState<string | null>(read())

  useEffect(() => {
    const sync = () => setToken(read())
    window.addEventListener('storage', sync)
    // Poll very lightly in case some code writes without storage event (e.g., same tab sessionStorage changes)
    const iv = window.setInterval(sync, 4000)
    return () => { window.removeEventListener('storage', sync); window.clearInterval(iv) }
  }, [])

  return { token, hasToken: !!token }
}
