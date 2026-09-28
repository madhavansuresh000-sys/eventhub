import Badge from '../ui/Badge'

const styles = {
  CONFIRMED: { color: 'green', text: 'CONFIRMED' },
  ATTENDED: { color: 'brand', text: 'ATTENDED' },
  CANCELLED: { color: 'gray', text: 'CANCELLED' },
}

export default function TicketStatusBadge({ status }) {
  const s = styles[status] ?? styles.CONFIRMED
  return <Badge color={s.color}>{s.text}</Badge>
}
