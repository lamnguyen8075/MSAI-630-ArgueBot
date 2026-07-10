import type { AgentRole } from './types'

/** Agent turn order for a 6-round debate (matches backend orchestrator). */
export const TURN_SEQUENCE: AgentRole[] = [
  'Moderator',
  'Proponent',
  'Opponent',
  'Judge',
  'Proponent',
  'Opponent',
  'Judge',
  'Proponent',
  'Opponent',
  'Judge',
  'Proponent',
  'Opponent',
  'Judge',
  'Moderator',
  'Proponent',
  'Opponent',
  'Judge',
  'Proponent',
  'Opponent',
  'Judge',
  'Proponent',
  'Opponent',
  'Judge',
]

export function getNextAgent(messageCount: number): AgentRole | null {
  if (messageCount >= TURN_SEQUENCE.length) return null
  return TURN_SEQUENCE[messageCount]
}
