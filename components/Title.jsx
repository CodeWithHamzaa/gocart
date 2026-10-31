import Link from 'next/link'
import React from 'react'

// M44: the description is plain text and "View more" is its own link. It used to be one
// <Link> wrapping a <p> and a <button> (an interactive element nested inside a link, which is
// invalid HTML), with a 20px-high tap target and low-contrast green text.
// M61: the redesign's section header (800-weight heading, violet "View all" link).
// M101: 700-weight heading and an ink "View all" with a quiet underline (Mirza palette).
// M45a: a storefront section header — title and description on the left, "View all" on the
// right — instead of a centred block. `centered` keeps the old layout for explanatory sections.
// M101: the minimal look: a 600-weight heading with tight tracking, a muted description, and a plain
// green "View all" (no arrow). `id` lets a section point aria-labelledby at the heading; `linkLabel`
// renames the link.
const Title = ({ title, description = '', visibleButton = true, href = '', centered = false, id = '', linkLabel = 'View all' }) => {

    if (centered) {
        return (
            <div className='flex flex-col items-center text-center'>
                <h2 id={id || undefined} className='text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-4xl'>{title}</h2>
                {description && <p className='mt-2 max-w-lg text-[15px] text-muted'>{description}</p>}
            </div>
        )
    }

    return (
        <div className='flex items-end justify-between gap-4'>
            <div className='min-w-0'>
                <h2 id={id || undefined} className='text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-4xl'>{title}</h2>
                {description && <p className='mt-1 text-[15px] text-muted'>{description}</p>}
            </div>
            {visibleButton && href && (
                <Link href={href} className='inline-flex min-h-11 shrink-0 items-center text-[15px] font-semibold text-primary hover:underline hover:underline-offset-4'>{linkLabel}</Link>
            )}
        </div>
    )
}

export default Title
