import { AlertCircle } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'

export const inputClass =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink transition-colors placeholder:text-ink/40 focus:outline-none focus:ring-2'
export const inputIdle = 'border-ink/15 focus:border-accent focus:ring-accent/30'
export const inputInvalid = 'border-accent focus:border-accent focus:ring-accent/30'

export function inputStateClass(hasError) {
  return hasError ? inputInvalid : inputIdle
}

export function describedBy(id, error, hint) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

/** Label + control + inline error/hint. `children` is the control. */
export function Field({ id, label, required = false, optional = false, error, hint, children }) {
  const { t } = useLanguage()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required ? (
          <span className="ml-1 text-accent" aria-hidden="true">
            *
          </span>
        ) : null}
        {optional ? (
          <span className="ml-1.5 text-xs font-normal text-ink/45">{t('optional')}</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-ink">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink/50">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Convenience wrapper for a plain text/email/password input. */
export default function TextField({
  id,
  label,
  required = false,
  optional = false,
  error,
  hint,
  className = '',
  ...inputProps
}) {
  return (
    <Field id={id} label={label} required={required} optional={optional} error={error} hint={hint}>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        className={`${inputClass} ${inputStateClass(Boolean(error))} ${className}`}
        {...inputProps}
      />
    </Field>
  )
}
