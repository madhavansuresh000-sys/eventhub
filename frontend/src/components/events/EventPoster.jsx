import { emojiFor, gradientFor } from '../../utils/format'

/** Colourful placeholder until events have real poster images. */
export default function EventPoster({ clubSlug, tags, className = 'h-40', emojiSize = 'text-5xl' }) {
  return (
    <div className={`grid place-items-center bg-gradient-to-br ${gradientFor(clubSlug)} ${className}`} aria-hidden="true">
      <span className={`${emojiSize} drop-shadow`}>{emojiFor(tags)}</span>
    </div>
  )
}
