'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const callbackError = searchParams.get('error')
    ? 'Authentication failed or link expired. Please try again.'
    : ''

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(callbackError)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validate = () => {
    const newErrors = {}

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    if (!validate()) return

    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email.trim(),
      password: formData.password,
    })

    setIsLoading(false)

    if (error) {
      setServerError(error.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleOAuth = async (provider) => {
    setServerError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setServerError(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eaf4fb] px-4 py-12 md:px-10">
      {/* Main Landscape Card */}
      <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-xl shadow-[#0b4a6f]/10 ring-1 ring-[#0b4a6f]/5 overflow-hidden flex flex-col lg:flex-row min-h-[600px]">
        
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-5/12 bg-[#eaf4fb] p-12 flex-col relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#0b4a6f]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#ff6b5a]/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-10">
              <div className="h-6 w-6 rounded-full bg-[#ff6b5a]" />
              <span className="text-lg font-bold text-[#0b4a6f] tracking-tight">Lifeline</span>
            </div>

            <span className="inline-block rounded-full bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#0b4a6f] mb-6 w-max shadow-sm">
              Welcome Back
            </span>
            
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0b4a6f] leading-tight mb-4">
              Continue building with Lifeline.
            </h2>
            
            <p className="text-[#0b4a6f]/70 leading-relaxed mb-10">
              Sign in to access your community, opportunities, and everything you need to grow as a developer.
            </p>

            {/* Feature List */}
            <ul className="space-y-4 mt-auto mb-8">
              <li className="flex items-start gap-3 text-sm text-[#0b4a6f]/80">
                <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#ff6b5a] shrink-0" />
                <span>Pick up where you left off with your saved progress.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-[#0b4a6f]/80">
                <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#0b4a6f] shrink-0" />
                <span>See new events, jobs, and startup opportunities instantly.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-[#0b4a6f]/80">
                <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#ff6b5a]/40 shrink-0" />
                <span>Stay connected to the local builder community.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-7/12 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white">
          
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-6 w-6 rounded-full bg-[#ff6b5a]" />
            <span className="text-lg font-bold text-[#0b4a6f]">Lifeline</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-[#0b4a6f] mb-2">Sign in to your account</h1>
            <p className="text-[#0b4a6f]/60 text-sm">Enter your details to access your dashboard.</p>
          </div>

          {serverError && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="block text-sm font-semibold text-[#0b4a6f] mb-1.5">Email address</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@lifeline.com"
                className={`w-full rounded-xl border ${
                  errors.email ? 'border-red-500 focus:ring-red-500' : 'border-[#0b4a6f]/20 focus:ring-[#ff6b5a]'
                } bg-transparent px-4 py-3 text-sm text-[#0b4a6f] placeholder:text-[#0b4a6f]/40 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-[#0b4a6f]">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-[#ff6b5a] hover:text-[#ff5a47] transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full rounded-xl border ${
                    errors.password ? 'border-red-500 focus:ring-red-500' : 'border-[#0b4a6f]/20 focus:ring-[#ff6b5a]'
                  } bg-transparent px-4 py-3 pr-16 text-sm text-[#0b4a6f] placeholder:text-[#0b4a6f]/40 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#0b4a6f]/60 hover:text-[#0b4a6f]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#ff6b5a] px-4 py-3.5 text-white font-semibold shadow-md shadow-[#ff6b5a]/30 hover:bg-[#ff5a47] hover:shadow-[#ff6b5a]/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 mt-2"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 mb-6 flex items-center">
            <div className="flex-1 h-px bg-[#0b4a6f]/10"></div>
            <span className="px-4 text-xs font-semibold text-[#0b4a6f]/40 uppercase tracking-wider">OR</span>
            <div className="flex-1 h-px bg-[#0b4a6f]/10"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => handleOAuth('google')}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#0b4a6f]/20 px-4 py-2.5 text-sm font-medium text-[#0b4a6f] hover:bg-[#eaf4fb] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button 
              type="button"
              onClick={() => handleOAuth('github')}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#0b4a6f]/20 px-4 py-2.5 text-sm font-medium text-[#0b4a6f] hover:bg-[#eaf4fb] transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-[#0b4a6f]/60">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-[#ff6b5a] hover:text-[#ff5a47] transition-colors">
              Sign up
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#eaf4fb]" />}>
      <LoginForm />
    </Suspense>
  )
}