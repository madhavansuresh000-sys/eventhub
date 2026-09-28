import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <p className="text-7xl font-extrabold text-brand-600 dark:text-brand-400">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">This page is not on the guest list</h1>
      <p className="mt-2 max-w-md text-slate-600 dark:text-slate-400">
        The link may be wrong, or the event may have been removed.
      </p>
      <div className="mt-8 flex gap-3">
        <Button to="/">Go home</Button>
        <Button to="/events" variant="secondary">Browse events</Button>
      </div>
    </div>
  )
}
