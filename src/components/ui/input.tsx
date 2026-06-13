import * as React from 'react'
import { cn } from '~/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'h-11 w-full rounded-[var(--radius)] border border-border bg-surface px-3 text-sm text-fg shadow-sm transition-colors duration-150',
          'placeholder:text-fg-subtle',
          'focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
          'disabled:cursor-not-allowed disabled:opacity-55',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-[var(--color-danger-soft)]',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
