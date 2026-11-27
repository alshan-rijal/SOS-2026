import Link from 'next/link'
import Image from 'next/image'
import FrameImg from './business-images/Frame.png'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#eaf4fb] text-[#0b4a6f]">
      {/* Header */}
      <header className="border-b border-[#0b4a6f]/10 sticky top-0 z-50 bg-[#eaf4fb]/80 backdrop-blur-md">
        <div className="container mx-auto flex flex-wrap px-6 py-5 md:px-10 md:py-6 flex-col md:flex-row items-center">
          <Link
            href="/"
            className="flex font-semibold items-center text-[#0b4a6f] mb-4 md:mb-0 text-base tracking-tight"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="#ff6b5a"
              className="w-6 h-6 mr-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v18m9-9H3"
              />
            </svg>
            Sajha Pahal
          </Link>

          <nav className="md:ml-auto flex flex-wrap items-center gap-6 text-sm font-medium">
            <Link
              href="/dashboard"
              className="text-[#0b4a6f]/70 hover:text-[#0b4a6f] transition-colors duration-200"
            >
              Home
            </Link>
            <Link
              href="/map"
              className="text-[#0b4a6f]/70 hover:text-[#0b4a6f] transition-colors duration-200"
            >
              Severity Map
            </Link>
            <Link
              href="/login"
              className="text-[#0b4a6f]/70 hover:text-[#0b4a6f] transition-colors duration-200"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="text-[#0b4a6f]/70 hover:text-[#0b4a6f] transition-colors duration-200"
            >
              Sign Up
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-[#ff6b5a] px-6 py-2.5 text-white font-semibold shadow-md shadow-[#ff6b5a]/30 hover:bg-[#ff5a47] hover:shadow-[#ff6b5a]/40 transition-all duration-200"
            >
              Open Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto px-6 md:px-10 py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="max-w-lg">
              <span className="inline-block rounded-full bg-[#ff6b5a]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#ff6b5a] mb-6">
                Civic Action Together
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-[#0b4a6f] mb-6">
                Local voices. <span className="text-[#ff6b5a]">Verified action.</span>{' '}
                Stronger neighborhoods.
              </h1>
              <p className="text-base md:text-lg leading-relaxed text-[#0b4a6f]/70 mb-8">
                Sajha Pahal empowers citizens to report infrastructure hazards,
                visualize severity across wards, and verify neighborhood issues
                together in real time.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-[#ff6b5a] px-7 py-3 text-white font-semibold shadow-lg shadow-[#ff6b5a]/30 hover:bg-[#ff5a47] hover:shadow-[#ff6b5a]/40 transition-all duration-200"
                >
                  Explore Live Issues
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full border-2 border-[#0b4a6f]/20 px-7 py-3 text-[#0b4a6f] font-semibold hover:border-[#0b4a6f] hover:bg-[#0b4a6f]/5 transition-all duration-200"
                >
                  Join as Citizen
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-[#0b4a6f]/60">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ff6b5a]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Peer Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ff6b5a]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Severity Mapped</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ff6b5a]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Real-Time Signals</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-[#0b4a6f]/5 blur-2xl" />
              <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-[#0b4a6f]/15 ring-1 ring-[#0b4a6f]/10">
                <Image
                  src={FrameImg}
                  alt="Sajha Pahal community reporting preview"
                  className="w-full h-auto"
                  priority
                />
              </div>

              {/* Floating stat card */}
              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-white p-5 shadow-xl shadow-[#0b4a6f]/10 ring-1 ring-[#0b4a6f]/10 hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#ff6b5a]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#ff6b5a]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#0b4a6f]">1,200+</p>
                    <p className="text-xs text-[#0b4a6f]/60">Issues verified</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-[#0b4a6f] text-[#eaf4fb]">
          <div className="container mx-auto px-6 md:px-10 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: '24/7', label: 'Live Reporting' },
                { value: '20+', label: 'Wards Covered' },
                { value: '3x', label: 'Faster Verification' },
                { value: '100%', label: 'Community Driven' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl md:text-4xl font-bold text-[#ff6b5a] mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-[#eaf4fb]/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-6 md:px-10 py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block rounded-full bg-[#0b4a6f]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#ff6b5a] mb-4">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0b4a6f] mb-4">
              Three steps to visible civic change
            </h2>
            <p className="text-base md:text-lg text-[#0b4a6f]/70 leading-relaxed">
              Spot an issue, pin its severity, and let neighbors confirm it so
              urgent problems rise to the top.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 relative">
            <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-[#0b4a6f]/10" />

            {[
              {
                step: '01',
                title: 'Pin & Report',
                desc: 'Submit a photo, severity level, and ward location for potholes, drainage, waste, or utility issues.',
              },
              {
                step: '02',
                title: 'Community Verify',
                desc: 'Nearby citizens confirm active reports with one click to validate urgency and prevent duplicates.',
              },
              {
                step: '03',
                title: 'Trigger Signals',
                desc: 'When 3 or more similar reports cluster together, an automatic priority signal alerts the community.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl bg-white p-8 shadow-md shadow-[#0b4a6f]/5 ring-1 ring-[#0b4a6f]/5 text-center"
              >
                <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-[#ff6b5a]/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-[#ff6b5a]">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-[#0b4a6f] mt-2 mb-3">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#0b4a6f]/60">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-6 md:px-10 pb-20">
          <div className="rounded-3xl bg-[#0b4a6f] p-8 md:p-16 text-center relative overflow-hidden">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#ff6b5a]/10 blur-2xl" />
            <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-[#ff6b5a]/10 blur-2xl" />
            <div className="relative max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to inspect your neighborhood?
              </h2>
              <p className="text-base md:text-lg text-[#eaf4fb]/75 mb-8">
                Jump straight into the live dashboard to view active severity pins,
                verify reports, or log a new issue.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-[#ff6b5a] px-8 py-3.5 text-white font-semibold shadow-lg shadow-[#ff6b5a]/30 hover:bg-[#ff5a47] transition-all"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center rounded-full border-2 border-white/25 px-8 py-3.5 text-white font-semibold hover:bg-white/10 transition-all"
                >
                  Open Full Map
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
