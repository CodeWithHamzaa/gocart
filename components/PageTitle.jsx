import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

const PageTitle = ({ heading, text, path = "/", linkText }) => {
    return (
        <div className="my-6">
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-ink">{heading}</h1>
            <div className="flex items-center gap-3">
                <p className="text-muted">{text}</p>
                <Link href={path} className="inline-flex items-center gap-1 min-h-11 px-1 text-primary hover:text-primary-dark text-sm font-semibold">
                    {linkText} <ArrowRightIcon size={14} />
                </Link>
            </div>
        </div>
    )
}

export default PageTitle