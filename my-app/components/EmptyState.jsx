export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink/20 bg-white px-6 py-14 text-center">
      {Icon ? (
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ink/5 text-ink/50">
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-ink/60">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
