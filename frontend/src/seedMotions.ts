export interface SeedMotion {
  label: string
  topic: string
}

/** Academic debate motions — suitable for university classroom demos. */
export const SEED_MOTIONS: SeedMotion[] = [
  {
    label: 'AI in coursework',
    topic: 'Universities should permit students to use generative AI tools for graded assignments.',
  },
  {
    label: 'Open textbooks',
    topic: 'Universities should require faculty to adopt open educational resources instead of commercial textbooks.',
  },
  {
    label: 'Attendance policy',
    topic: 'Universities should require mandatory in-person attendance for undergraduate lecture courses.',
  },
  {
    label: 'Liberal arts core',
    topic: 'All undergraduate students should complete a required liberal arts core curriculum regardless of major.',
  },
  {
    label: 'Pass/fail grading',
    topic: 'Introductory-level university courses should use pass/fail grading instead of letter grades.',
  },
  {
    label: 'Flipped classroom',
    topic: 'Universities should adopt the flipped classroom model as the default for large introductory courses.',
  },
]
