import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

// M44: the description is plain text and "View more" is its own link. It used to be one
// <Link> wrapping a <p> and a <button> (an interactive element nested inside a link, which is
// invalid HTML), with a 20px-high tap target and low-contrast green text.
const Title = ({ title, description, visibleButton = true, href = '' }) => {

    return (
        <div className='flex flex-col items-center'>
            <h2 className='text-2xl font-semibold text-slate-800'>{title}</h2>
            <div className='flex flex-wrap items-center justify-center gap-x-5 text-sm text-slate-600 mt-2'>
                <p className='max-w-lg text-center'>{description}</p>
                {visibleButton && href && (
                    <Link href={href} className='text-green-700 inline-flex items-center gap-1 min-h-11 px-1'>View more <ArrowRight size={14} /></Link>
                )}
            </div>
        </div>
    )
}

export default Title
