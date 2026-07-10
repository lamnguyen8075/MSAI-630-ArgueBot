import { useState } from 'react'

export default function RulesPanel() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rules-panel">
      <button className="rules-toggle" onClick={() => setOpen(!open)}>
        📜 Debate Rules & Format {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="rules-content">
          <ol>
            <li>The <strong>Proponent</strong> defends the motion; the <strong>Opponent</strong> challenges it.</li>
            <li>The <strong>Moderator</strong> manages process and remains neutral.</li>
            <li>The <strong>Judge</strong> evaluates arguments and assigns scores at checkpoints.</li>
            <li>Agents must stay in role throughout all rounds.</li>
            <li>Acknowledgments must be immediately followed by rebuttal.</li>
            <li>No fabricated citations or statistics.</li>
            <li>Scoring uses a 100-point weighted rubric.</li>
            <li>The orchestrator controls turn order.</li>
          </ol>
        </div>
      )}
    </div>
  )
}
