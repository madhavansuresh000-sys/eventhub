import Badge from '../ui/Badge'

const styles = {
  HELD: { color: 'amber', text: 'WAITING FOR PAYMENT' },
  CONFIRMED: { color: 'green', text: 'CONFIRMED' },
  EXPIRED: { color: 'gray', text: 'EXPIRED' },
  ATTENDED: { color: 'brand', text: 'ATTENDED' },
  CANCELLED: { color: 'gray', text: 'CANCELLED' },
}

export default function TicketStatusBadge({ status }) {
  const s = styles[status] ?? styles.CONFIRMED
  return <Badge color={s.color}>{s.text}</Badge>
}
