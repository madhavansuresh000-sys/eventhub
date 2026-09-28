import Badge from '../ui/Badge'

const styles = {
  DRAFT: { color: 'gray', text: 'Draft' },
  PENDING_APPROVAL: { color: 'amber', text: 'Waiting for approval' },
  PUBLISHED: { color: 'green', text: 'Published' },
}

export default function EventStatusBadge({ status, sentBack = false }) {
  if (sentBack) return <Badge color="red">Sent back</Badge>
  const s = styles[status] ?? styles.DRAFT
  return <Badge color={s.color}>{s.text}</Badge>
}
