import { useState } from 'react'
import type { RoleViolation } from '../types'

interface Props {
  violations: RoleViolation[]
}

export default function FailureAnalysis({ violations }: Props) {
  const [open, setOpen] = useState(false)
  if (!violations.length) return null

  return (
    <div className="failure-analysis">
      <button className="failure-toggle" onClick={() => setOpen(!open)}>
        🔍 Failure Analysis — {violations.length} role violation{violations.length !== 1 ? 's' : ''}
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="failure-list">
          {violations.map((v, i) => (
            <div key={i} className="failure-item">
              <div className="failure-header">
                <strong>{v.agent}</strong>
                <span>Round {v.round_number}</span>
                <code>{v.violation_type}</code>
              </div>
              <p className="failure-excerpt">"{v.excerpt}"</p>
              <p className="failure-action">Corrective: {v.corrective_action}</p>
              {v.retry_attempted && (
                <p className="failure-retry">
                  Retry: {v.retry_succeeded ? 'Succeeded ✓' : 'Failed ✗'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
