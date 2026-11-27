import AppHeader from '@/components/AppHeader'
import SiteFooter from '@/components/SiteFooter'

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content 
      </a>

      <AppHeader />

      <main id="main" className="flex-1">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>

      <SiteFooter />
    </div>
  )
}
