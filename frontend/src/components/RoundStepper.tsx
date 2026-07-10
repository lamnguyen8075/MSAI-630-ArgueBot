interface Props {
  currentRound: number
  configuredRounds: number
}

const STEPS = [
  { num: 0, label: 'Intro' },
  { num: 1, label: 'Opening' },
  { num: 2, label: 'Evidence' },
  { num: 3, label: 'Rebuttals' },
  { num: 4, label: 'Cross-Exam' },
  { num: 5, label: 'Final Reb.' },
  { num: 6, label: 'Closing' },
]

export default function RoundStepper({ currentRound, configuredRounds }: Props) {
  const steps = STEPS.filter((s) => s.num <= configuredRounds)

  return (
    <div className="round-stepper">
      {steps.map((step, i) => {
        const done = currentRound > step.num
        const active = currentRound === step.num
        return (
          <div key={step.num} className={`step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
            <div className="step-dot">{done ? '✓' : step.num}</div>
            <span className="step-label">{step.label}</span>
            {i < steps.length - 1 && <div className="step-line" />}
          </div>
        )
      })}
    </div>
  )
}
