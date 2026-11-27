import { initialsOf } from '@/lib/reports'

/** Circular avatar: the uploaded image, or initials on a navy disc. */
export default function Avatar({ src, name, size = 40, className = '' }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) }

  if (src) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL */
      <img
        src={src}
        alt=""
        style={style}
        className={`shrink-0 rounded-full object-cover ring-1 ring-ink/10 ${className}`}
      />
    )
  }

  return (
    <span
      style={style}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-white ${className}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  )
}
