import * as React from 'react'
import { cn } from '~/lib/utils'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'min-h-24 w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5 text-sm text-fg shadow-sm transition-colors duration-150',
          'placeholder:text-fg-subtle',
          'focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
          'disabled:cursor-not-allowed disabled:opacity-55',
          'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-[var(--color-danger-soft)]',
          className,
        )}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
