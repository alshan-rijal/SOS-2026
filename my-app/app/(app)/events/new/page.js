import { Suspense } from 'react'
import EventForm from '@/components/EventForm'

export const metadata = { title: 'Organise an event' }

function FormFallback() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="h-5 w-52 animate-pulse rounded bg-ink/10" />
      <div className="h-8 w-72 animate-pulse rounded bg-ink/10" />
      <div className="card h-[32rem] w-full animate-pulse" />
    </div>
  )
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<FormFallback />}>
      <EventForm />
    </Suspense>
  )
}
