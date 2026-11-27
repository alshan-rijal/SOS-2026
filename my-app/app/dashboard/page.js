'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { INITIAL_REPORTS, SEVERITY_CONFIG, ITAHARI_CENTER } from '../../lib/reports'

const ItahariMap = dynamic(() => import('../../components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-[#eaf4fb]" />,
})

export default function DashboardPage() {
  const [reports, setReports] = useState(INITIAL_REPORTS)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [selectedId, setSelectedId] = useState(INITIAL_REPORTS[0].id)
  const [showReportModal, setShowReportModal] = useState(false)

  // New report form state
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Road & Potholes')
  const [newSeverity, setNewSeverity] = useState('high')
  const [newLocation, setNewLocation] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCoords, setNewCoords] = useState(ITAHARI_CENTER)

  // Detect active signals (3 or more reports in the same category)
  const categoryCounts = reports.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1
    return acc
  }, {})
  const activeSignals = Object.entries(categoryCounts).filter(([, count]) => count >= 3)

  const filteredReports = reports.filter((r) => {
    const matchesSeverity = severityFilter === 'all' || r.severity === severityFilter
    const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter
    return matchesSeverity && matchesCategory
  })

  const selectedReport =
    filteredReports.find((r) => r.id === selectedId) || filteredReports[0] || null

  function handleVerify(id) {
    setReports((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const nextVerified = !item.verifiedByMe
        return {
          ...item,
          verifiedByMe: nextVerified,
          verifications: nextVerified ? item.verifications + 1 : item.verifications - 1,
        }
      })
    )
  }

  function handleCreateReport(e) {
    e.preventDefault()
    if (!newTitle.trim() || !newLocation.trim()) return

    const created = {
      id: `rep-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      severity: newSeverity,
      location: newLocation.trim(),
      coords: newCoords,
      time: 'Just now',
      author: 'You',
      verifications: 1,
      verifiedByMe: true,
      description: newDescription.trim() || 'Community reported issue.',
    }

    setReports([created, ...reports])
    setSelectedId(created.id)
    setSeverityFilter('all')
    setCategoryFilter('All')
    setNewTitle('')
    setNewLocation('')
    setNewDescription('')
    setNewCoords(ITAHARI_CENTER)
    setShowReportModal(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#eaf4fb] text-[#0b4a6f]">
      {/* Header */}
      <header className="border-b border-[#0b4a6f]/10 sticky top-0 z-40 bg-[#eaf4fb]/90 backdrop-blur-md">
        <div className="container mx-auto flex flex-wrap px-6 py-4 md:px-10 flex-col md:flex-row items-center">
          <Link
            href="/"
            className="flex font-bold items-center text-[#0b4a6f] mb-3 md:mb-0 text-lg tracking-tight"
          >
            <span className="h-8 w-8 rounded-xl bg-[#ff6b5a] text-white flex items-center justify-center mr-2.5 shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </span>
            Sajha Pahal
          </Link>

          <nav className="md:ml-auto flex flex-wrap items-center gap-5 text-sm font-medium">
            <Link
              href="/dashboard"
              className="text-[#0b4a6f] font-semibold border-b-2 border-[#ff6b5a] pb-0.5"
            >
              Home
            </Link>
            <Link
              href="/map"
              className="text-[#0b4a6f]/70 hover:text-[#0b4a6f] transition-colors"
            >
              Full Map
            </Link>
            <Link
              href="/login"
              className="text-[#0b4a6f]/70 hover:text-[#0b4a6f] transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="text-[#0b4a6f]/70 hover:text-[#0b4a6f] transition-colors"
            >
              Sign Up
            </Link>
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center justify-center rounded-full bg-[#ff6b5a] px-5 py-2 text-white font-semibold shadow-md shadow-[#ff6b5a]/30 hover:bg-[#ff5a47] transition-all cursor-pointer"
            >
              + Report Issue
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 md:px-10 py-8">
        {/* Top Summary & Filter Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <span className="inline-block rounded-full bg-[#ff6b5a]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#ff6b5a] mb-2">
              Community Civic Dashboard
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0b4a6f]">
              Live Local Issue Feed & Severity Map
            </h1>
          </div>

          {/* Category + Severity Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#0b4a6f] ring-1 ring-[#0b4a6f]/15 focus:outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Road & Potholes">Road & Potholes</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Electricity">Electricity</option>
              <option value="Waste Management">Waste Management</option>
              <option value="Drainage">Drainage</option>
            </select>

            {['all', 'critical', 'high', 'medium', 'low'].map((level) => {
              const active = severityFilter === level
              return (
                <button
                  key={level}
                  onClick={() => setSeverityFilter(level)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0b4a6f] text-white shadow-sm'
                      : 'bg-white text-[#0b4a6f]/70 hover:text-[#0b4a6f] ring-1 ring-[#0b4a6f]/10'
                  }`}
                >
                  {level}
                </button>
              )
            })}
          </div>
        </div>

        {/* Active Signal Banner (Triggered when >= 3 similar reports exist) */}
        {activeSignals.length > 0 && (
          <div className="mb-6 rounded-2xl bg-[#0b4a6f] text-white p-4 md:p-5 shadow-lg shadow-[#0b4a6f]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <span className="flex h-3 w-3 mt-1.5 sm:mt-0 shrink-0 rounded-full bg-[#ff6b5a] animate-ping" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#ff6b5a]">
                  Community Signal Detected
                </p>
                <p className="text-sm md:text-base font-medium text-[#eaf4fb]">
                  {activeSignals.map(([cat, count]) => (
                    <span key={cat} className="mr-3">
                      <strong>{count} similar reports</strong> clustered under{' '}
                      <strong>{cat}</strong> — high priority verification active.
                    </span>
                  ))}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCategoryFilter(activeSignals[0][0])}
              className="inline-flex items-center rounded-full bg-[#ff6b5a] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#ff5a47] shrink-0 cursor-pointer"
            >
              Filter Signal ({reports.length} Total)
            </button>
          </div>
        )}

        {/* Main Split Layout: Interactive Severity Map + Issue List */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Interactive Severity Map (Left - 7 Cols) */}
          <div className="lg:col-span-7 rounded-3xl bg-white p-5 shadow-md shadow-[#0b4a6f]/5 ring-1 ring-[#0b4a6f]/10">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#0b4a6f]">
                  Neighborhood Severity Map
                </h2>
                <p className="text-xs text-[#0b4a6f]/60">
                  Click any pin to inspect details and community verifications
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#0b4a6f]/70">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e11d48]" /> Critical
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b5a]" /> High
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#d97706]" /> Medium
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7]" /> Low
                </span>
              </div>
            </div>

            {/* Interactive Leaflet Severity Map */}
            <div className="h-[380px] md:h-[440px]">
              <ItahariMap
                reports={filteredReports}
                selectedId={selectedReport?.id}
                onSelect={setSelectedId}
              />
            </div>

            {/* Selected Pin Preview Bar */}
            {selectedReport && (
              <div className="mt-4 rounded-2xl bg-[#eaf4fb]/70 p-4 border border-[#0b4a6f]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                        SEVERITY_CONFIG[selectedReport.severity].badgeBg
                      }`}
                    >
                      {SEVERITY_CONFIG[selectedReport.severity].label}
                    </span>
                    <span className="text-xs font-medium text-[#0b4a6f]/60">
                      {selectedReport.location} • {selectedReport.time}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0b4a6f]">
                    {selectedReport.title}
                  </h3>
                </div>

                <button
                  onClick={() => handleVerify(selectedReport.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    selectedReport.verifiedByMe
                      ? 'bg-[#0b4a6f] text-white'
                      : 'bg-white text-[#0b4a6f] ring-1 ring-[#0b4a6f]/20 hover:bg-[#0b4a6f]/5'
                  }`}
                >
                  {selectedReport.verifiedByMe
                    ? `✓ Verified (${selectedReport.verifications})`
                    : `Verify Issue (${selectedReport.verifications})`}
                </button>
              </div>
            )}
          </div>

          {/* Community Issue List (Right - 5 Cols) */}
          <div className="lg:col-span-5 space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredReports.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-[#0b4a6f]/10">
                <p className="text-sm font-semibold text-[#0b4a6f] mb-2">
                  No reports match this filter
                </p>
                <button
                  onClick={() => {
                    setSeverityFilter('all')
                    setCategoryFilter('All')
                  }}
                  className="text-xs font-semibold text-[#ff6b5a] hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredReports.map((item) => {
                const cfg = SEVERITY_CONFIG[item.severity]
                const isSelected = selectedReport?.id === item.id
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`rounded-2xl bg-white p-5 transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-[#ff6b5a] shadow-lg shadow-[#0b4a6f]/10'
                        : 'ring-1 ring-[#0b4a6f]/10 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cfg.badgeBg}`}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-xs text-[#0b4a6f]/50">{item.time}</span>
                    </div>

                    <h3 className="text-base font-bold text-[#0b4a6f] mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs font-medium text-[#ff6b5a] mb-2">
                      {item.category} • {item.location}
                    </p>
                    <p className="text-sm text-[#0b4a6f]/70 leading-relaxed mb-4">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-[#0b4a6f]/10">
                      <span className="text-xs text-[#0b4a6f]/60">
                        Reported by <strong>{item.author}</strong>
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleVerify(item.id)
                        }}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          item.verifiedByMe
                            ? 'bg-[#0b4a6f] text-white'
                            : 'bg-[#eaf4fb] text-[#0b4a6f] hover:bg-[#0b4a6f]/10'
                        }`}
                      >
                        {item.verifiedByMe
                          ? `✓ Verified (${item.verifications})`
                          : `Verify (${item.verifications})`}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>

      {/* Report Issue Modal with Click-to-Pin Mini Map */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-[#0b4a6f]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-[#0b4a6f]">
                Report a Community Issue
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-sm font-semibold text-[#0b4a6f]/50 hover:text-[#0b4a6f] cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b4a6f]/70 mb-1">
                  Issue Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Blocked drainage pipe near Ward 4"
                  className="w-full rounded-xl border border-[#0b4a6f]/20 px-3.5 py-2.5 text-sm text-[#0b4a6f] focus:outline-none focus:border-[#ff6b5a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b4a6f]/70 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border border-[#0b4a6f]/20 px-3 py-2.5 text-sm text-[#0b4a6f] bg-white"
                  >
                    <option>Road & Potholes</option>
                    <option>Water Supply</option>
                    <option>Electricity</option>
                    <option>Waste Management</option>
                    <option>Drainage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b4a6f]/70 mb-1">
                    Severity
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="w-full rounded-xl border border-[#0b4a6f]/20 px-3 py-2.5 text-sm text-[#0b4a6f] bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b4a6f]/70 mb-1">
                  Location / Landmark
                </label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g., Ward 5, Near Bus Park"
                  className="w-full rounded-xl border border-[#0b4a6f]/20 px-3.5 py-2.5 text-sm text-[#0b4a6f] focus:outline-none focus:border-[#ff6b5a]"
                />
              </div>

              {/* Interactive Pin Location Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b4a6f]/70">
                    Tap Map to Set Pin Location
                  </label>
                  <span className="text-[11px] text-[#0b4a6f]/60">
                    {newCoords.lat.toFixed(5)}, {newCoords.lng.toFixed(5)}
                  </span>
                </div>
                <div className="h-44">
                  <ItahariMap onPick={setNewCoords} picked={newCoords} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b4a6f]/70 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the problem so neighbors can verify it..."
                  className="w-full rounded-xl border border-[#0b4a6f]/20 px-3.5 py-2.5 text-sm text-[#0b4a6f] focus:outline-none focus:border-[#ff6b5a]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#0b4a6f]/70 hover:bg-[#0b4a6f]/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#ff6b5a] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#ff6b5a]/30 hover:bg-[#ff5a47] cursor-pointer"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
