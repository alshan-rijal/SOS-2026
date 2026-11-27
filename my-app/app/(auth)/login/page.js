import { Suspense } from 'react'
import LoginForm from './form'

export const metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-ink/5" />}>
      <LoginForm />
    </Suspense>
  )
}
