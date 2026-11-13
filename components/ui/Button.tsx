import Link from 'next/link'
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'

// M115: the one pill button. Before this, at least eight hand-written class strings drew the same
// three buttons. Variants (brand kit, "Shape, depth, actions"):
//   primary  violet fill, white text: the one main action on a screen
//   soft     violet tint, dark violet text: the secondary action beside a primary one
//   outline  white with a hairline: a quiet action (load more, pagination, "Browse all")
// Sizes: md = 44px tall (the touch minimum), lg = 48px (the product page), xl = 54px with 16px text
// (the checkout "Place order"). Text size lives in the size so callers never pass a conflicting one.
// `href` renders a next/link <Link>, otherwise a <button>. Behaviour (onClick, disabled, type, aria-*)
// is passed through untouched; this component only owns the look.
export type ButtonVariant = 'primary' | 'soft' | 'outline'
export type ButtonSize = 'md' | 'lg' | 'xl'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-dark disabled:hover:bg-primary',
  soft: 'bg-accent-soft text-primary-dark hover:bg-accent disabled:hover:bg-accent-soft',
  outline: 'border border-line-2 bg-surface text-ink hover:border-line-3 hover:bg-surface-muted disabled:hover:bg-surface',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-11 text-sm',
  lg: 'min-h-12 text-sm',
  xl: 'min-h-[54px] text-base',
}

export function buttonClasses({ variant = 'primary', size = 'md', className = '' }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim()
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; className?: string; children: ReactNode }
type AsLink = Common & Omit<ComponentProps<typeof Link>, 'className' | 'children'> & { href: ComponentProps<typeof Link>['href'] }
type AsButton = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { href?: undefined }

export default function Button(props: AsLink | AsButton) {
  if (props.href !== undefined) {
    const { variant, size, className, children, ...rest } = props
    return (
      <Link {...rest} className={buttonClasses({ variant, size, className })}>
        {children}
      </Link>
    )
  }
  const { variant, size, className, children, type = 'button', ...rest } = props
  return (
    <button {...rest} type={type} className={buttonClasses({ variant, size, className })}>
      {children}
    </button>
  )
}
