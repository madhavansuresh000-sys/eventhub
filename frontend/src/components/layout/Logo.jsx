import { Link } from 'react-router-dom'

import { TicketIcon } from '../ui/icons'

export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
        <TicketIcon className="h-5 w-5" />
      </span>
      <span>
        Event<span className="text-brand-600 dark:text-brand-400">Hub</span>
      </span>
    </Link>
  )
}
