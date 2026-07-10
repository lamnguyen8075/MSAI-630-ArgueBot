export type AgentRole = 'Proponent' | 'Opponent' | 'Moderator' | 'Judge'

export type DebateStatus = 'pending' | 'running' | 'completed' | 'stopped' | 'error'

export interface DebateMessage {
  round_number: number
  round_name: string
  agent: AgentRole
  timestamp: string
  content: string
  role_check_passed: boolean
  is_retry: boolean
}

export interface AgentScore {
  logical_reasoning: number
  evidence_support: number
  relevance_responsiveness: number
  rebuttal_quality: number
  consistency_role_adherence: number
  clarity_organization: number
  weighted_total: number
  strengths: string[]
  weaknesses: string[]
}

export interface RoundScore {
  round_number: number
  proponent: AgentScore
  opponent: AgentScore
  round_leader: string
  judge_commentary: string
  confidence: number
}

export interface FinalVerdict {
  winner: string
  proponent_final_score: number
  opponent_final_score: number
  decision_summary: string
  decisive_factors: string[]
  proponent_best_argument: string
  opponent_best_argument: string
  major_limitations: string[]
  role_violations: string[]
  confidence: number
}

export interface RoleViolation {
  agent: AgentRole
  round_number: number
  violation_type: string
  excerpt: string
  corrective_action: string
  retry_attempted: boolean
  retry_succeeded: boolean | null
}

export interface DebateState {
  debate_id: string
  topic: string
  background_context: string
  style: string
  configured_rounds: number
  response_length: string
  current_round: number
  status: DebateStatus
  messages: DebateMessage[]
  round_scores: RoundScore[]
  cumulative_scores: {
    proponent: number
    opponent: number
    rounds_scored: number
  }
  violations: RoleViolation[]
  final_verdict: FinalVerdict | null
}

export interface HealthResponse {
  status: string
  has_api_key: boolean
  model: string
}

export interface StartDebateRequest {
  topic: string
  background_context: string
  style: string
  configured_rounds: number
  response_length: string
  stress_test: boolean
}

export interface WsEvent {
  type: 'started' | 'update' | 'completed' | 'stopped' | 'error'
  debate_id: string
  state?: DebateState
  error?: string
}

export const AGENT_META: Record<AgentRole, { icon: string; color: string; border: string }> = {
  Proponent: { icon: 'P', color: '#0d3320', border: '#22c55e' },
  Opponent: { icon: 'O', color: '#3b1219', border: '#ef4444' },
  Moderator: { icon: 'M', color: '#0c2340', border: '#3b82f6' },
  Judge: { icon: 'J', color: '#3b2f0c', border: '#f59e0b' },
}

export const ROUND_LABELS = [
  'Intro',
  'Opening',
  'Evidence',
  'Rebuttals',
  'Cross-Exam',
  'Final Reb.',
  'Closing',
]
