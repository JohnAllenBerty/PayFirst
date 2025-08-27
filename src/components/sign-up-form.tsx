import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignUpForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const nextErrors: { password?: string; confirmPassword?: string } = {}

        if (!password) {
            nextErrors.password = 'Password is required'
        } else if (password.length < 6) {
            nextErrors.password = 'Password must be at least 6 characters'
        }

        if (!confirmPassword) {
            nextErrors.confirmPassword = 'Please confirm your password'
        } else if (password !== confirmPassword) {
            nextErrors.confirmPassword = 'Passwords do not match'
        }

        setErrors(nextErrors)
        if (Object.keys(nextErrors).length) return

        // proceed with form submission (delegate to parent via props.onSubmit or handle here)
        // If parent provided an onSubmit prop, call it with the form element's submit event:
        // If you want to submit programmatically, you can extract form data and call API here.
        if (props.onSubmit) {
            // forward the original event to parent handler
            props.onSubmit(e as any)
        }
    }

    return (
        <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={onSubmit}>
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Sign up for an account</h1>
                <p className="text-muted-foreground text-sm text-balance">
                    Enter your details below to create your account
                </p>
            </div>
            <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-3">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" name="firstName" type="text" placeholder="John" required />
                    </div>
                    <div className="flex flex-col gap-3">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" name="lastName" type="text" placeholder="Doe" required />
                    </div>
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" name="username" type="text" placeholder="johndoe" required />
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? 'password-error' : undefined}
                    />
                    {errors.password && (
                        <span id="password-error" className="text-sm text-red-600 p-0 m-0">
                            {errors.password}
                        </span>
                    )}
                </div>

                <div className="grid gap-3">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        aria-invalid={!!errors.confirmPassword}
                        aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                    />
                    {errors.confirmPassword && (
                        <span id="confirm-password-error" className="text-sm text-red-600 p-0 m-0">
                            {errors.confirmPassword}
                        </span>
                    )}
                </div>

                <Button type="submit" className="w-full">
                    Sign up
                </Button>
            </div>
            <div className="text-center text-sm">
                Already have an account?{" "}
                <a href="/login" className="underline underline-offset-4">
                    Login
                </a>
            </div>
        </form>
    )
}