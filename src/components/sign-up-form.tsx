import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSignUpMutation } from '@/store/api/authApi'
import { useNavigate } from 'react-router-dom'

// ...existing code...
export function SignUpForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [signup, { isLoading }] = useSignUpMutation()
    const navigate = useNavigate()

    // validation helpers
    const emailRegex = /^\S+@\S+\.\S+$/
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/
    // passwordRegex ensures: min 8 chars, at least 1 lowercase, 1 uppercase, 1 digit, 1 special char; allows no whitespace by using \S in overall checks below

    const validate = () => {
        const next: Record<string, string> = {}

        if (!firstName.trim()) {
            next.first_name = 'First name is required'
        }

        const uname = email.trim()
        if (!uname) {
            next.user_name = 'Email is required'
        } else if (!emailRegex.test(uname)) {
            next.user_name = 'Please enter a valid email address'
        }

        if (!password) {
            next.password = 'Password is required'
        } else if (/\s/.test(password)) {
            next.password = 'Password must not contain spaces'
        } else if (!passwordRegex.test(password)) {
            next.password =
                'Password must be at least 8 characters, include upper and lower case letters, a number and a special character'
        }

        if (!confirmPassword) {
            next.confirmPassword = 'Please confirm your password'
        } else if (password !== confirmPassword) {
            next.confirmPassword = 'Passwords do not match'
        }

        setErrors(next)
        return next
    }

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const next = validate()
        if (Object.keys(next).length) return

        try {
            // adapt payload field names to backend expectations
            const payload = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                username: email.trim(),
                password,
            }

            // RTK Query mutation returns a promise; unwrap() will throw on error
            // if your authApi doesn't expose unwrap, you can handle the returned result differently
            const res = await signup(payload).unwrap?.() ?? await signup(payload)
            if (res.data) {
                // on success, navigate to login (or dashboard if backend signs user in)
                navigate('/login')
            }
        } catch (err: any) {
            // normalize server errors into field errors when possible
            const data = err?.data ?? err?.error ?? err
            // backend might return { detail: 'Username already exists' } or status 409
            if (data?.detail && /exists|already/i.test(String(data.detail))) {
                setErrors(prev => ({ ...prev, user_name: 'Email already in use' }))
            } else if (err?.status === 409) {
                setErrors(prev => ({ ...prev, user_name: 'Email already in use' }))
            } else {
                // generic fallback
                setErrors(prev => ({ ...prev, general: (data?.detail || 'Sign up failed').toString() }))
            }
        }
    }

    return (
        <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={onSubmit} noValidate>
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
                        <Input
                            id="firstName"
                            name="firstName"
                            type="text"
                            placeholder="John"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            aria-invalid={!!errors.first_name}
                            aria-describedby={errors.first_name ? 'first-name-error' : undefined}
                        />
                        {errors.first_name && <span id="first-name-error" className="text-sm text-red-600 mt-1">{errors.first_name}</span>}
                    </div>

                    <div className="flex flex-col gap-3">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            name="lastName"
                            type="text"
                            placeholder="Doe"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="johndoe@email.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={!!errors.user_name}
                        aria-describedby={errors.user_name ? 'email-error' : undefined}
                    />
                    {errors.user_name && <span id="email-error" className="text-sm text-red-600 mt-1">{errors.user_name}</span>}
                </div>

                <div className="grid gap-3">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? 'password-error' : undefined}
                    />
                    {errors.password && <span id="password-error" className="text-sm text-red-600 mt-1">{errors.password}</span>}
                    <p className="text-xs text-muted-foreground mt-1">
                        Minimum 8 characters, upper & lower case, a number, a special character, no spaces.
                    </p>
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
                    {errors.confirmPassword && <span id="confirm-password-error" className="text-sm text-red-600 mt-1">{errors.confirmPassword}</span>}
                </div>

                {errors.general && <div className="text-sm text-red-600">{errors.general}</div>}

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing up…' : 'Sign up'}
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