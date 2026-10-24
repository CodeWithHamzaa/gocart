import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

// M44: the description is plain text and "View more" is its own link. It used to be one
// <Link> wrapping a <p> and a <button> (an interactive element nested inside a link, which is
// invalid HTML), with a 20px-high tap target and low-contrast green text.
// M61: the redesign's section header (800-weight heading, violet "View all" link).
// M45a: a storefront section header — title and description on the left, "View all" on the
// right — instead of a centred block. `centered` keeps the old layout for explanatory sections.
const Title = ({ title, description, visibleButton = true, href = '', centered = false }) => {

    if (centered) {
        return (
            <div className='flex flex-col items-center text-center'>
                <h2 className='text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-[28px]'>{title}</h2>
                {description && <p className='mt-2 max-w-lg text-sm text-muted'>{description}</p>}
            </div>
        )
    }

    return (
        <div className='flex items-end justify-between gap-4'>
            <div className='min-w-0'>
                <h2 className='text-xl font-extrabold tracking-[-0.02em] text-ink sm:text-[28px]'>{title}</h2>
                {description && <p className='mt-1 text-sm text-muted'>{description}</p>}
            </div>
            {visibleButton && href && (
                <Link href={href} className='inline-flex shrink-0 items-center gap-1 min-h-11 text-sm font-semibold text-primary hover:text-primary-dark'>View all <ArrowRight size={15} aria-hidden='true' /></Link>
            )}
        </div>
    )
}

export default Title
