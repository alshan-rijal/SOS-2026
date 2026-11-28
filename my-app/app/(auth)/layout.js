import Logo from '@/components/Logo'
import AuthAside from './AuthAside'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 lg:flex lg:items-center lg:justify-center lg:p-8">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-ink/12 bg-white shadow-sm lg:flex">
        <AuthAside />

        <div className="w-full p-6 sm:p-8 lg:w-3/5 lg:p-12">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
