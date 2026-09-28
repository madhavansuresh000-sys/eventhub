import Card from '../components/ui/Card'

export default function AboutPage() {
  return (
    <Card className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">About EventHub</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        EventHub is like BookMyShow for your college: clubs publish events, students book seats,
        volunteers scan QR tickets at the gate, and attendees download certificates.
      </p>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        Built as a practice project with React, Spring Boot and MySQL.
      </p>
    </Card>
  )
}
