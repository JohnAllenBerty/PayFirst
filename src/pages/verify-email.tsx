import { useEffect, useState } from "react"
import { useSearchParams, Link, useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useVerifyEmailMutation } from "@/store/api/payFirstApi"
import { toast } from "react-toastify"
import { extractErrorMessage, extractSuccessMessage } from "@/lib/utils"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

// Avoid double-calling the API in React StrictMode by sharing a pending promise across mounts
const pendingVerifications: Map<string, Promise<{ ok: boolean; message: string }>> = new Map()
// Ensure we show toast only once per verification key
const announcedKeys: Set<string> = new Set()

const VerifyEmailPage = () => {
    const [params] = useSearchParams()
    const initialId = params.get("uid") || params.get("_id") || params.get("id") || ""
    const initialToken = params.get("token") || ""
    const [verify] = useVerifyEmailMutation()
    const [state, setState] = useState<"verifying" | "success" | "error" | "invalid">("verifying")
    const [msg, setMsg] = useState<string>("")
    const navigate = useNavigate()

    useEffect(() => {
        // Auto-submit only; if params missing, show invalid and stop
        if (!initialId || !initialToken) {
            setState("invalid")
            setMsg("Invalid or missing verification link.")
            return
        }
        ;(async () => {
            setState("verifying")
            const key = `${initialId}:${initialToken}`
            let p = pendingVerifications.get(key)
            if (!p) {
                p = (async () => {
                    try {
                        const res = await verify({ _id: initialId, token: initialToken }).unwrap()
                        const message = extractSuccessMessage(res, "Email verified")
                        return { ok: true, message }
                    } catch (e) {
                        const message = extractErrorMessage(e)
                        return { ok: false, message }
                    } finally {
                        // Clean after a short delay to allow subsequent retries if user reloads
                        setTimeout(() => pendingVerifications.delete(key), 1000)
                    }
                })()
                pendingVerifications.set(key, p)
            }
            const result = await p
            if (result.ok) {
                if (!announcedKeys.has(key)) {
                    toast.success(result.message)
                    announcedKeys.add(key)
                }
                setMsg(result.message)
                setState("success")
                setTimeout(() => navigate("/login", { replace: true }), 2000)
            } else {
                if (!announcedKeys.has(key)) {
                    toast.error(result.message)
                    announcedKeys.add(key)
                }
                setMsg(result.message)
                setState("error")
            }
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="h-full bg-gray-50 flex items-center justify-center p-6">
            <Card className="w-full max-w-md shadow-sm">
                <CardHeader>
                    <CardTitle>Email verification</CardTitle>
                    <CardDescription>We’re validating your verification link.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                    {state === "verifying" && (
                        <div className="flex items-start gap-3 text-sm text-muted-foreground">
                            <Loader2 className="size-5 animate-spin mt-0.5" />
                            <div>
                                <div>Verifying your email…</div>
                                <div className="text-xs">This should only take a moment.</div>
                            </div>
                        </div>
                    )}
                    {state === "success" && (
                        <div className="space-y-2">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="size-6 text-green-600 mt-0.5" />
                                <div>
                                    <div className="font-medium">Email verified</div>
                                    <div className="text-sm text-muted-foreground">{msg || "Your email has been successfully verified."}</div>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">Redirecting to login…</div>
                            <div>
                                <Link className="underline text-sm" to="/login">Go to login now</Link>
                            </div>
                        </div>
                    )}
                    {state === "error" && (
                        <div className="space-y-2">
                            <div className="flex items-start gap-3">
                                <XCircle className="size-6 text-red-600 mt-0.5" />
                                <div>
                                    <div className="font-medium">Verification failed</div>
                                    <div className="text-sm text-red-600">{msg || "We couldn’t verify your email with this link."}</div>
                                </div>
                            </div>
                            <div>
                                <Link to="/login" className="underline text-sm">Back to login</Link>
                            </div>
                        </div>
                    )}
                    {state === "invalid" && (
                        <div className="space-y-2">
                            <div className="flex items-start gap-3">
                                <XCircle className="size-6 text-red-600 mt-0.5" />
                                <div>
                                    <div className="font-medium">Invalid link</div>
                                    <div className="text-sm text-red-600">{msg || "Your link is missing required parameters."}</div>
                                </div>
                            </div>
                            <div>
                                <Link to="/login" className="underline text-sm">Back to login</Link>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default VerifyEmailPage
