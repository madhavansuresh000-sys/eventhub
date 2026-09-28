const dayFormat = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const longDayFormat = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })

/** The API sends local times like "2026-10-12T10:00:00". */
const toDate = (iso) => new Date(iso)

/** "Mon, 12 Oct · 10:00 am" */
export const formatShortDate = (iso) => `${dayFormat.format(toDate(iso))} · ${timeFormat.format(toDate(iso))}`

/** "Monday, 12 October 2026" */
export const formatLongDate = (iso) => longDayFormat.format(toDate(iso))

/** "10:00 am" */
export const formatTime = (iso) => timeFormat.format(toDate(iso))

const shortDay = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

/** Same day: "10:00 am to 5:00 pm". Several days: "12 Oct, 10:00 am to 13 Oct, 5:00 pm". */
export function formatTimeRange(startIso, endIso) {
  const start = toDate(startIso)
  const end = toDate(endIso)
  if (start.toDateString() === end.toDateString()) {
    return `${timeFormat.format(start)} to ${timeFormat.format(end)}`
  }
  return `${shortDay.format(start)}, ${timeFormat.format(start)} to ${shortDay.format(end)}, ${timeFormat.format(end)}`
}

const rupees = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

/** 0 -> "Free", 100 -> "₹100", 32500 -> "₹32,500", 125000 -> "₹1,25,000" (Indian grouping) */
export function formatPrice(price) {
  const n = Number(price)
  if (n === 0) return 'Free'
  return `₹${rupees.format(n)}`
}

/** Colour and text for the seats badge. */
export function seatsInfo(available, total) {
  if (available === 0) return { color: 'red', text: 'FULL' }
  if (available <= Math.max(5, total * 0.1)) return { color: 'amber', text: `Only ${available} left` }
  return { color: 'green', text: `${available} seats left` }
}

/** One emoji per tag, used on the poster placeholder. */
const tagEmoji = {
  tech: '💻', coding: '👩‍💻', workshop: '🛠️', music: '🎵', dance: '💃', sports: '🏏',
  robotics: '🤖', career: '💼', arts: '🎨', competition: '🏆',
}
/** Most specific tags first, so an event always gets the same emoji whatever order its tags come in. */
const emojiPriority = ['dance', 'music', 'robotics', 'sports', 'arts', 'career', 'coding', 'workshop', 'tech', 'competition']
export function emojiFor(tags = []) {
  const best = emojiPriority.find((t) => tags.includes(t))
  return tagEmoji[best] ?? '🎟️'
}

/** A different gradient per club, so posters are easy to tell apart. Full class names for Tailwind. */
const clubGradients = {
  'coding-club': 'from-indigo-500 to-blue-600',
  'cultural-club': 'from-pink-500 to-rose-600',
  'sports-club': 'from-emerald-500 to-green-600',
  'robotics-club': 'from-amber-500 to-orange-600',
  'career-cell': 'from-sky-500 to-cyan-600',
}
export const gradientFor = (clubSlug) => clubGradients[clubSlug] ?? 'from-brand-500 to-brand-700'
