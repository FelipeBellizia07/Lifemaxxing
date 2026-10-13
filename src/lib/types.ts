// LifeMaxxing data model. Everything here is user-entered; nothing is seeded.

export type Area = 'physique' | 'looks' | 'wealth' | 'mind' | 'social' | 'lab'
export const AREAS: Area[] = ['physique', 'looks', 'wealth', 'mind', 'social', 'lab']

export type Energy = 'low' | 'medium' | 'high'
export type Accent = 'lime' | 'violet' | 'cobalt'
export type MotionMode = 'cinematic' | 'calm'

export type MetricKey =
  | 'weight' | 'workouts' | 'sleep' | 'hydration' | 'nutrition'
  | 'skincare' | 'photos'
  | 'income' | 'expenses' | 'savings'
  | 'focus' | 'reading' | 'social'

export interface Profile {
  name: string
  motto: string
  objective30: string
  goals: string[]
  areas: Area[] // ordered by priority, first = most important
  dailyMinutes: number
  accent: Accent
  motion: MotionMode
  metrics: MetricKey[]
  heroPhotoId?: string
  currency: string
  createdAt: string
}

export interface Step { id: string; text: string; done: boolean }

export interface Task {
  id: string
  title: string
  area: Area
  importance: 1 | 2 | 3
  firstAction: string
  firstActionMin: number // 5–15
  estimateMin?: number
  deadline?: string // YYYY-MM-DD
  steps: Step[]
  status: 'open' | 'done'
  postponed: number
  snoozedUntil?: string
  projectId?: string
  origin: 'user' | 'suggested'
  createdAt: string
  doneAt?: string
}

export type BlockerKind = 'phone' | 'unclear' | 'too-big' | 'tired' | 'environment' | 'perfectionism' | 'other'

export interface Interruption { at: string; kind: BlockerKind; note: string }

export interface FocusSession {
  id: string
  label: string
  area: Area
  taskId?: string
  plannedMin: number
  startedAt: string
  endedAt?: string
  actualMin: number
  interruptions: Interruption[]
  blocker?: BlockerKind
}

export interface DailyLog {
  date: string
  weightKg?: number
  sleepH?: number
  waterL?: number
  proteinG?: number
  kcal?: number
}

export interface Workout { id: string; date: string; type: string; durationMin: number; notes: string }

export interface Routine { id: string; name: string; kind: 'skin' | 'hair' | 'grooming'; steps: string; cadence: 'daily' | 'weekly' }
export interface RoutineCheck { routineId: string; date: string }

export interface EvolutionEntry {
  id: string
  date: string
  area: Area
  title: string
  description: string
  observation: string // subjective
  result: string // measurable, optional
  photoId?: string
  angle?: 'front' | 'side' | 'back' | 'detail' | 'other'
}

export interface Transaction { id: string; date: string; kind: 'income' | 'expense'; amount: number; category: string; note: string }
export interface Forecast { id: string; label: string; kind: 'income' | 'expense'; monthly: number }
export interface BalanceSnapshot { id: string; date: string; amount: number }
export interface Skill { id: string; name: string; level: number; notes: string }

export interface ReadingLog { id: string; date: string; title: string; minutes: number; pages: number; note: string }

export interface SocialChallenge { id: string; title: string; why: string; status: 'active' | 'done'; createdAt: string; doneAt?: string }
export interface Interaction { id: string; date: string; kind: 'conversation' | 'reconnect' | 'event' | 'ask' | 'other'; initiated: boolean; note: string; reflection: string }

export type ProjectStage = 'idea' | 'prototype' | 'active' | 'shipped' | 'archived'
export interface Milestone { id: string; text: string; done: boolean; doneAt?: string }
export interface Blocker { id: string; text: string; resolved: boolean }
export interface Note { id: string; date: string; text: string }
export interface Experiment { id: string; date: string; hypothesis: string; result: string }

export interface Project {
  id: string
  title: string
  pitch: string
  stage: ProjectStage
  stack: string
  milestones: Milestone[]
  blockers: Blocker[]
  notes: Note[]
  experiments: Experiment[]
  incomeGoal?: number // monthly, a forecast — not actual money
  createdAt: string
  promotedAt?: string
}

export interface PersonalMilestone { id: string; title: string; area: Area; targetDate?: string; doneAt?: string }

export interface WeeklyReview { week: string; wins: string; friction: string; nextFocus: string; createdAt: string }

export interface FinanceSettings { monthlyExpensesTarget: number; withdrawalRate: number }

export interface State {
  schemaVersion: number
  profile: Profile | null
  energy: { date: string; level: Energy; minutes: number } | null
  tasks: Task[]
  sessions: FocusSession[]
  activeSessionId?: string
  daily: DailyLog[]
  workouts: Workout[]
  routines: Routine[]
  routineChecks: RoutineCheck[]
  evolution: EvolutionEntry[]
  transactions: Transaction[]
  forecasts: Forecast[]
  balances: BalanceSnapshot[]
  skills: Skill[]
  finance: FinanceSettings
  reading: ReadingLog[]
  challenges: SocialChallenge[]
  interactions: Interaction[]
  projects: Project[]
  milestones: PersonalMilestone[]
  reviews: WeeklyReview[]
}

export const SCHEMA_VERSION = 1

export const emptyState = (): State => ({
  schemaVersion: SCHEMA_VERSION,
  profile: null,
  energy: null,
  tasks: [],
  sessions: [],
  daily: [],
  workouts: [],
  routines: [],
  routineChecks: [],
  evolution: [],
  transactions: [],
  forecasts: [],
  balances: [],
  skills: [],
  finance: { monthlyExpensesTarget: 0, withdrawalRate: 4 },
  reading: [],
  challenges: [],
  interactions: [],
  projects: [],
  milestones: [],
  reviews: [],
})

export const AREA_META: Record<Area, { label: string; code: string; tagline: string }> = {
  physique: { label: 'PhysiqueMaxxing', code: '01', tagline: 'Train. Eat. Sleep. Repeat without drama.' },
  looks: { label: 'LooksMaxxing', code: '02', tagline: 'Routines and honest, dated evidence.' },
  wealth: { label: 'WealthMaxxing', code: '03', tagline: 'Real money, separated from projections.' },
  mind: { label: 'MindMaxxing', code: '04', tagline: 'Start smaller than feels serious.' },
  social: { label: 'SocialMaxxing', code: '05', tagline: 'Initiative you control. Nothing else.' },
  lab: { label: 'Project Lab', code: '06', tagline: 'Ideas become prototypes become proof.' },
}
