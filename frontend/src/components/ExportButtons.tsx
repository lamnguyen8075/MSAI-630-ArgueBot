interface Props {
  debateId: string
}

export default function ExportButtons({ debateId }: Props) {
  return (
    <div className="export-buttons">
      <a
        className="btn-export"
        href={`/api/debates/${debateId}/export/markdown`}
        download="arguebot_transcript.md"
      >
        Download Transcript (Markdown)
      </a>
      <a
        className="btn-export"
        href={`/api/debates/${debateId}/export/json`}
        download="arguebot_debate.json"
      >
        Download Debate Record (JSON)
      </a>
    </div>
  )
}
