import Link from 'next/link'
import Image from 'next/image'
import frameImg from './Frame.png'

export default function Home() {
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
            Lifeline
          </Link>

          <nav className="md:ml-auto flex flex-wrap items-center gap-6 text-sm font-medium">
            <Link
              href="/"
              className="text-[#0b4a6f]/70 hover:text-[#0b4a6f] transition-colors duration-200"
            >
              Home
            </Link>
            <Link
              href="/resources"
              className="text-[#0b4a6f]/70 hover:text-[#0b4a6f] transition-colors duration-200"
            >
              Resources
            </Link>
            <Link
              href="/volunteer"
              className="text-[#0b4a6f]/70 hover:text-[#0b4a6f] transition-colors duration-200"
            >
              Volunteer
            </Link>
            <Link
              href="/about"
              className="text-[#0b4a6f]/70 hover:text-[#0b4a6f] transition-colors duration-200"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-[#0b4a6f]/70 hover:text-[#0b4a6f] transition-colors duration-200"
            >
              Contact
            </Link>
            <Link
              href="/get-help"
              className="inline-flex items-center justify-center rounded-full bg-[#ff6b5a] px-6 py-2.5 text-white font-semibold shadow-md shadow-[#ff6b5a]/30 hover:bg-[#ff5a47] hover:shadow-[#ff6b5a]/40 transition-all duration-200"
            >
              Get Help Now
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
                You Are Not Alone
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-[#0b4a6f] mb-6">
                Real people. <span className="text-[#ff6b5a]">Real support.</span>{' '}
                Anytime you need it.
              </h1>
              <p className="text-base md:text-lg leading-relaxed text-[#0b4a6f]/70 mb-8">
                Lifeline connects you with trained volunteers and professional
                counselors who listen without judgment. Whether you're facing a
                crisis or just need someone to talk to — we're here, 24/7.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/get-help"
                  className="inline-flex items-center justify-center rounded-full bg-[#ff6b5a] px-7 py-3 text-white font-semibold shadow-lg shadow-[#ff6b5a]/30 hover:bg-[#ff5a47] hover:shadow-[#ff6b5a]/40 transition-all duration-200"
                >
                  Talk to Someone Now
                </Link>
                <Link
                  href="/volunteer"
                  className="inline-flex items-center justify-center rounded-full border-2 border-[#0b4a6f]/20 px-7 py-3 text-[#0b4a6f] font-semibold hover:border-[#0b4a6f] hover:bg-[#0b4a6f]/5 transition-all duration-200"
                >
                  Become a Volunteer
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-[#0b4a6f]/60">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ff6b5a]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>100% Confidential</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ff6b5a]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Free Forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ff6b5a]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>24/7 Available</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-[#0b4a6f]/5 blur-2xl" />
              <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-[#0b4a6f]/15 ring-1 ring-[#0b4a6f]/10">
                <Image
                  src={frameImg}
                  alt="Lifeline community support preview"
                  className="w-full h-auto"
                  priority
                />
              </div>

              {/* Floating stat card */}
              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-white p-5 shadow-xl shadow-[#0b4a6f]/10 ring-1 ring-[#0b4a6f]/10 hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#ff6b5a]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#ff6b5a]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#0b4a6f]">50,000+</p>
                    <p className="text-xs text-[#0b4a6f]/60">Lives touched</p>
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
                { value: '24/7', label: 'Always Available' },
                { value: '500+', label: 'Trained Volunteers' },
                { value: '50K+', label: 'Conversations' },
                { value: '98%', label: 'Feel Heard' },
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
              Getting help is simple
            </h2>
            <p className="text-base md:text-lg text-[#0b4a6f]/70 leading-relaxed">
              Three steps to connect with someone who truly cares. No forms, no
              waiting rooms, no judgment.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-[#0b4a6f]/10" />

            {[
              {
                step: '01',
                title: 'Reach Out',
                desc: 'Call, text, or chat with us. Choose the channel that feels most comfortable for you.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                ),
              },
              {
                step: '02',
                title: 'Connect',
                desc: 'Get matched with a trained volunteer or counselor who listens and understands.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                ),
              },
              {
                step: '03',
                title: 'Heal Together',
                desc: 'Continue with ongoing support, resources, and a community that has your back.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                ),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl bg-white p-8 shadow-md shadow-[#0b4a6f]/5 ring-1 ring-[#0b4a6f]/5 text-center"
              >
                <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-[#ff6b5a]/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#ff6b5a]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                </div>
                <span className="text-xs font-bold text-[#ff6b5a] uppercase tracking-widest">
                  Step {item.step}
                </span>
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

        {/* Features / Why Choose Us */}
        <section className="bg-white/50">
          <div className="container mx-auto px-6 md:px-10 py-20 md:py-24">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-block rounded-full bg-[#0b4a6f]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#ff6b5a] mb-4">
                Why Lifeline
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0b4a6f] mb-4">
                Built for real human connection
              </h2>
              <p className="text-base md:text-lg text-[#0b4a6f]/70 leading-relaxed">
                Every detail is designed to make reaching out feel safe, simple,
                and stigma-free.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Always Available',
                  desc: 'Day or night, weekday or weekend — trained listeners are on standby whenever you need them.',
                },
                {
                  title: 'Completely Anonymous',
                  desc: 'Share only what you are comfortable with. No real name required, no records kept.',
                },
                {
                  title: 'Trained Volunteers',
                  desc: 'Every listener completes 40+ hours of empathetic listening and crisis-support training.',
                },
                {
                  title: 'Multiple Channels',
                  desc: 'Call, text, live chat, or email. Reach out in the way that feels most natural to you.',
                },
                {
                  title: 'Local Resources',
                  desc: 'Connect to nearby counselors, support groups, and community programs in your area.',
                },
                {
                  title: 'Follow-Up Care',
                  desc: 'We don\'t just listen and leave. Optional check-ins keep you supported over time.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl bg-white p-6 md:p-8 shadow-md shadow-[#0b4a6f]/5 ring-1 ring-[#0b4a6f]/5 hover:shadow-lg hover:shadow-[#0b4a6f]/10 transition-shadow duration-300"
                >
                  <div className="mb-4 h-10 w-10 rounded-xl bg-[#ff6b5a]/10 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-[#ff6b5a]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0b4a6f] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#0b4a6f]/60">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="container mx-auto px-6 md:px-10 py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block rounded-full bg-[#0b4a6f]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#ff6b5a] mb-4">
              Stories
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0b4a6f] mb-4">
              Voices from our community
            </h2>
            <p className="text-base md:text-lg text-[#0b4a6f]/70 leading-relaxed">
              Real people, real moments of connection. Names changed for privacy.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  'I called at 3am thinking no one would answer. A volunteer picked up in two rings and just... listened. That conversation changed my night.',
                name: 'A.M.',
                role: 'Caller, 2024',
              },
              {
                quote:
                  'Volunteering here has taught me that the smallest act of presence can be life-changing. I have grown as much as the people I talk to.',
                name: 'Sarah K.',
                role: 'Volunteer, 3 years',
              },
              {
                quote:
                  'The follow-up text the next day meant everything. It made me feel like a person, not just a call ticket. I am still here because of this community.',
                name: 'J.R.',
                role: 'Community member',
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-2xl bg-white p-6 md:p-8 shadow-md shadow-[#0b4a6f]/5 ring-1 ring-[#0b4a6f]/5 flex flex-col"
              >
                <svg className="w-8 h-8 text-[#ff6b5a]/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-sm leading-relaxed text-[#0b4a6f]/70 mb-6 flex-1">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-[#0b4a6f]/5">
                  <div className="h-10 w-10 rounded-full bg-[#0b4a6f]/10 flex items-center justify-center text-sm font-bold text-[#0b4a6f]">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0b4a6f]">{t.name}</p>
                    <p className="text-xs text-[#0b4a6f]/50">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Emergency Banner */}
        <section className="container mx-auto px-6 md:px-10 pb-20">
          <div className="rounded-3xl bg-[#ff6b5a] p-8 md:p-12 text-white relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/10" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
                    In Crisis Right Now?
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-2">
                  You don't have to face this alone.
                </h3>
                <p className="text-white/80 text-sm md:text-base leading-relaxed">
                  If you or someone you know is in immediate danger, please call
                  your local emergency services. For emotional support, our
                  helpline is always open.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <a
                  href="tel:988"
                  className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-[#ff6b5a] font-semibold shadow-lg hover:bg-[#eaf4fb] transition-colors duration-200"
                >
                  Call 988
                </a>
                <Link
                  href="/get-help"
                  className="inline-flex items-center justify-center rounded-full border-2 border-white/40 px-7 py-3 text-white font-semibold hover:bg-white/10 transition-colors duration-200"
                >
                  Chat With Us
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Volunteer CTA */}
        <section className="container mx-auto px-6 md:px-10 pb-20">
          <div className="rounded-3xl bg-white p-8 md:p-12 shadow-lg shadow-[#0b4a6f]/5 ring-1 ring-[#0b4a6f]/5 grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <span className="inline-block rounded-full bg-[#0b4a6f]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#ff6b5a] mb-4">
                Join the Team
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0b4a6f] mb-4">
                Become the person who answers.
              </h2>
              <p className="text-base md:text-lg text-[#0b4a6f]/70 leading-relaxed mb-6">
                Our volunteers are everyday people — students, parents,
                retirees — who believe in the power of listening. We provide
                all the training, tools, and ongoing support you need.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'No prior experience required — full training provided',
                  'Flexible shifts that fit around your life',
                  'Ongoing supervision and peer support',
                  'Make a tangible difference in your community',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[#0b4a6f]/70">
                    <svg className="w-5 h-5 text-[#ff6b5a] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/volunteer/apply"
                  className="inline-flex items-center justify-center rounded-full bg-[#ff6b5a] px-7 py-3 text-white font-semibold shadow-lg shadow-[#ff6b5a]/30 hover:bg-[#ff5a47] transition-all duration-200"
                >
                  Apply to Volunteer
                </Link>
                <Link
                  href="/volunteer/faq"
                  className="inline-flex items-center justify-center rounded-full border-2 border-[#0b4a6f]/20 px-7 py-3 text-[#0b4a6f] font-semibold hover:border-[#0b4a6f] hover:bg-[#0b4a6f]/5 transition-all duration-200"
                >
                  Learn More
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '500+', label: 'Active volunteers' },
                { value: '40hr', label: 'Training program' },
                { value: '12', label: 'Cities served' },
                { value: '3x', label: 'Support multiplier' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-[#eaf4fb] p-6 text-center ring-1 ring-[#0b4a6f]/5"
                >
                  <p className="text-2xl md:text-3xl font-bold text-[#ff6b5a] mb-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-[#0b4a6f]/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Resources Preview */}
        <section className="bg-[#0b4a6f]/5">
          <div className="container mx-auto px-6 md:px-10 py-20 md:py-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="max-w-xl">
                <span className="inline-block rounded-full bg-[#0b4a6f]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#ff6b5a] mb-4">
                  Resources
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0b4a6f] mb-4">
                  Tools for your journey
                </h2>
                <p className="text-base md:text-lg text-[#0b4a6f]/70 leading-relaxed">
                  Guides, worksheets, and community wisdom — free for everyone.
                </p>
              </div>
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff6b5a] hover:text-[#ff5a47] transition-colors"
              >
                Browse all resources
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  category: 'Guide',
                  title: 'Understanding Anxiety: A Gentle Introduction',
                  desc: 'Learn what anxiety is, why it happens, and simple grounding techniques you can use today.',
                  readTime: '8 min read',
                },
                {
                  category: 'Worksheet',
                  title: 'Daily Check-In Journal',
                  desc: 'A printable one-page journal to track your mood, energy, and gratitude each morning.',
                  readTime: '5 min read',
                },
                {
                  category: 'Community',
                  title: 'How to Support a Friend in Crisis',
                  desc: "Practical dos and don'ts for showing up for someone who is struggling.",
                  readTime: '10 min read',
                },
              ].map((r) => (
                <Link
                  key={r.title}
                  href="/resources"
                  className="group rounded-2xl bg-white p-6 md:p-8 shadow-md shadow-[#0b4a6f]/5 ring-1 ring-[#0b4a6f]/5 hover:shadow-lg hover:shadow-[#0b4a6f]/10 transition-all duration-300"
                >
                  <span className="inline-block rounded-full bg-[#ff6b5a]/10 px-3 py-1 text-xs font-semibold text-[#ff6b5a] mb-4">
                    {r.category}
                  </span>
                  <h3 className="text-lg font-bold text-[#0b4a6f] mb-2 group-hover:text-[#ff6b5a] transition-colors">
                    {r.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#0b4a6f]/60 mb-4">
                    {r.desc}
                  </p>
                  <span className="text-xs text-[#0b4a6f]/40">{r.readTime}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto px-6 md:px-10 py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block rounded-full bg-[#0b4a6f]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#ff6b5a] mb-4">
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0b4a6f] mb-4">
              Questions, answered
            </h2>
            <p className="text-base md:text-lg text-[#0b4a6f]/70 leading-relaxed">
              Everything you might be wondering before reaching out.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: 'Is this really anonymous?',
                a: 'Yes. We do not require your real name, phone number, or any identifying information. Conversations are not recorded and are deleted after the session ends. You share only what you are comfortable with.',
              },
              {
                q: 'Who will I be talking to?',
                a: 'You will be connected with a trained volunteer listener or, for more complex situations, a licensed counselor. All volunteers complete a 40-hour training program in empathetic listening and crisis support.',
              },
              {
                q: 'Is it really free?',
                a: 'Completely free, always. Lifeline is funded by community donations and grants. There are no hidden fees, subscriptions, or premium tiers.',
              },
              {
                q: 'What if I am in immediate danger?',
                a: 'If you or someone else is in immediate physical danger, please call your local emergency number (911 in the US) right away. Our helpline is for emotional support and is not a substitute for emergency services.',
              },
              {
                q: 'Can I volunteer if I have no experience?',
                a: 'Absolutely. We provide all the training you need. What matters most is your willingness to listen with empathy and without judgment. We welcome volunteers from all backgrounds and walks of life.',
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl bg-white ring-1 ring-[#0b4a6f]/5 shadow-sm overflow-hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer p-5 md:p-6 list-none">
                  <span className="font-semibold text-[#0b4a6f] pr-4">
                    {faq.q}
                  </span>
                  <svg
                    className="w-5 h-5 text-[#ff6b5a] shrink-0 transition-transform duration-200 group-open:rotate-45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </summary>
                <div className="px-5 md:px-6 pb-5 md:pb-6 -mt-1">
                  <p className="text-sm leading-relaxed text-[#0b4a6f]/60">
                    {faq.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-6 md:px-10 pb-20">
          <div className="rounded-3xl bg-[#0b4a6f] p-8 md:p-16 text-center relative overflow-hidden">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#ff6b5a]/10 blur-2xl" />
            <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-[#ff6b5a]/10 blur-2xl" />
            <div className="relative max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#eaf4fb] mb-4">
                Your first step is <span className="text-[#ff6b5a]">one message away.</span>
              </h2>
              <p className="text-base md:text-lg text-[#eaf4fb]/70 leading-relaxed mb-8">
                Whether you need support or want to give it, there is a place
                for you here. Reach out today — we are ready when you are.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/get-help"
                  className="inline-flex items-center justify-center rounded-full bg-[#ff6b5a] px-8 py-3.5 text-white font-semibold shadow-lg shadow-[#ff6b5a]/30 hover:bg-[#ff5a47] hover:shadow-[#ff6b5a]/40 transition-all duration-200"
                >
                  Get Help Now
                </Link>
                <Link
                  href="/volunteer"
                  className="inline-flex items-center justify-center rounded-full border-2 border-[#eaf4fb]/30 px-8 py-3.5 text-[#eaf4fb] font-semibold hover:bg-[#eaf4fb]/10 transition-all duration-200"
                >
                  Become a Volunteer
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#0b4a6f]/10 bg-[#0b4a6f] text-[#eaf4fb]">
        <div className="container mx-auto px-6 md:px-10 py-16">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-7 w-7 rounded-full bg-[#ff6b5a]" />
                <span className="text-base font-semibold tracking-tight">
                  Lifeline
                </span>
              </div>
              <p className="text-sm text-[#eaf4fb]/60 leading-relaxed mb-4">
                A community helpline platform connecting people with trained
                listeners and professional support — 24/7, free, and
                confidential.
              </p>
              <div className="flex gap-3">
                {['Twitter', 'Instagram', 'LinkedIn'].map((social) => (
                  <a
                    key={social}
                    href="#"
                    aria-label={social}
                    className="h-9 w-9 rounded-full bg-[#eaf4fb]/10 flex items-center justify-center text-xs font-bold text-[#eaf4fb]/70 hover:bg-[#ff6b5a] hover:text-white transition-colors duration-200"
                  >
                    {social.charAt(0)}
                  </a>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <h3 className="text-sm font-semibold text-[#eaf4fb] mb-4 uppercase tracking-wider">
                Platform
              </h3>
              <ul className="space-y-3 text-sm">
                {['Get Help', 'Resources', 'Volunteer', 'About', 'Contact'].map((item) => (
                  <li key={item}>
                    <Link
                      href={`/${item.toLowerCase().replace(' ', '-')}`}
                      className="text-[#eaf4fb]/60 hover:text-[#eaf4fb] transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-semibold text-[#eaf4fb] mb-4 uppercase tracking-wider">
                Support
              </h3>
              <ul className="space-y-3 text-sm">
                {[
                  'Crisis Resources',
                  'FAQ',
                  'Privacy Policy',
                  'Terms of Service',
                  'Accessibility',
                ].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-[#eaf4fb]/60 hover:text-[#eaf4fb] transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Emergency */}
            <div>
              <h3 className="text-sm font-semibold text-[#eaf4fb] mb-4 uppercase tracking-wider">
                In Crisis?
              </h3>
              <p className="text-sm text-[#eaf4fb]/60 leading-relaxed mb-4">
                If you are in immediate danger, call your local emergency
                services.
              </p>
              <a
                href="tel:988"
                className="inline-flex items-center justify-center rounded-full bg-[#ff6b5a] px-5 py-2.5 text-white text-sm font-semibold shadow-md shadow-[#ff6b5a]/30 hover:bg-[#ff5a47] transition-colors duration-200"
              >
                Call 988 Lifeline
              </a>
            </div>
          </div>

          <div className="pt-8 border-t border-[#eaf4fb]/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#eaf4fb]/50">
              © {new Date().getFullYear()} Lifeline. All rights reserved.
            </p>
            <p className="text-xs text-[#eaf4fb]/50">
              Made with care for our community.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}