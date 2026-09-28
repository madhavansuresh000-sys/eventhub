import Button from '../components/ui/Button'

/** Temporary home page; the full version (upcoming + trending events) comes in Step 4. */
export default function HomePage() {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-16 text-center text-white sm:px-12">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Find and book college events</h1>
      <p className="mx-auto mt-4 max-w-xl text-brand-100">
        Tech fests, hackathons, dance nights and workshops from every club, in one place.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button to="/events" size="lg" variant="light">Browse events</Button>
      </div>
    </section>
  )
}
