import { exportUrl } from '../api/config'

interface Props {
  debateId: string
}

export default function ExportButtons({ debateId }: Props) {
  return (
    <div className="export-buttons">
      <a
        className="btn-export"
        href={exportUrl(debateId, 'markdown')}
        target="_blank"
        rel="noopener noreferrer"
      >
        Download Transcript (Markdown)
      </a>
      <a
        className="btn-export"
        href={exportUrl(debateId, 'json')}
        target="_blank"
        rel="noopener noreferrer"
      >
        Download Debate Record (JSON)
      </a>
    </div>
  )
}
