import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from './cn';

/**
 * Tags, not pills: 4px radius, soft tinted background, strong ink. Status tones are
 * reserved for meaning (never decoration); `outline` is the neutral label.
 */
export const badgeVariants = cva(
  'inline-flex h-5 items-center gap-1 rounded-sm border px-1.5 text-2xs font-medium whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      tone: {
        neutral: 'border-transparent bg-muted text-fg-2',
        primary: 'border-transparent bg-primary-soft text-primary',
        success: 'border-transparent bg-success-soft text-success',
        warning: 'border-transparent bg-warning-soft text-warning',
        danger: 'border-transparent bg-danger-soft text-danger',
        info: 'border-transparent bg-info-soft text-info',
        outline: 'border-border bg-transparent text-fg-2',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
