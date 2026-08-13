// ─────────────────────────────────────────────────────────────────────────────
// Unions
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | 'draft'
  | 'requirement-gathering'
  | 'planning'
  | 'in-progress'
  | 'on-hold'
  | 'testing'
  | 'completed'
  | 'cancelled'
  /** Not part of the visible lifecycle — set by the ⋮ Archive action, hidden from every tab. */
  | 'archived';

export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export type ProjectType =
  | 'website'
  | 'web-app'
  | 'mobile-app'
  | 'pwa'
  | 'ai-automation'
  | 'api'
  | 'design'
  | 'internal-tool'
  | 'other';

/** The three tabs on the Projects page. `null` means "visible in none". */
export type StatusGroup = 'pending' | 'ongoing' | 'completed';

export type PhaseStatus = 'not-started' | 'in-progress' | 'completed' | 'blocked';

export type PhaseKey = 'discovery' | 'design' | 'development' | 'testing';

export type DocumentKey =
  | 'proposal'
  | 'nda'
  | 'brd'
  | 'design'
  | 'contract'
  | 'invoice'
  | 'other';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectLinks {
  github?: string;
  figma?: string;
  production?: string;
  staging?: string;
  documentation?: string;
  drive?: string;
}

export interface ProjectPhase {
  status: PhaseStatus;
  startDate: string | null;
  endDate: string | null;
  /** 0–100. The overall project progress is recalculated from these. */
  progress: number;
  notes: string;
}

export type ProjectPhases = Record<PhaseKey, ProjectPhase>;

/**
 * A document is a link, not an upload. `fileName` is reserved so a stored file
 * can be attached later without a schema migration.
 */
export interface ProjectDocument {
  url: string;
  fileName?: string;
}

export type ProjectDocuments = Record<DocumentKey, ProjectDocument>;

export interface ProjectTeam {
  projectManager: string;
  teamLead: string;
  qa: string;
  developers: string[];
  designers: string[];
}

/** `pending` is derived (`final || estimated` minus `received`), never stored. */
export interface ProjectBudget {
  estimated: number | null;
  final: number | null;
  received: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// The record
// ─────────────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  title: string;
  client: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  type: ProjectType;
  progress: number; // 0–100

  // Point of contact
  pocName: string;
  pocPhone: string;

  // Scope
  shortDescription: string;
  requirements: string;
  deliverables: string;

  // Timeline
  startDate: string | null;
  dueDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  updatedAt: string;

  // Client
  clientCompany: string;
  clientGst: string;
  clientAddress: string;
  clientWebsite: string;
  clientNotes: string;

  // Delivery
  techStack: string[];
  modules: string[];
  phases: ProjectPhases;
  team: ProjectTeam;
  documents: ProjectDocuments;
  budget: ProjectBudget;
  links: ProjectLinks;

  // Notes
  notes: string;
  internalNotes: string;
  meetingNotes: string;
  tags: string[];

  syncStatus: 'synced' | 'pending' | 'conflict';
  deletedAt: string | null; // soft delete
}

export interface FilterState {
  priority: ProjectPriority | 'all';
  type: ProjectType | 'all';
  sortBy: 'newest' | 'oldest' | 'dueDate' | 'priority' | 'progress';
}

// ─────────────────────────────────────────────────────────────────────────────
// Display maps
//
// Every one of these is `Record<Union, …>` on purpose: adding a status, type or
// priority becomes a COMPILE ERROR until it's handled everywhere. Plain object
// literals here would fail silently at runtime instead.
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  'requirement-gathering': 'Requirements',
  planning: 'Planning',
  'in-progress': 'In Progress',
  'on-hold': 'On Hold',
  testing: 'Testing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

/**
 * Which tab each status appears under. `null` = shown in none.
 *
 * This replaces the old exact-equality match, which meant any status other than
 * the three tab names was invisible everywhere with no error.
 */
export const STATUS_GROUP: Record<ProjectStatus, StatusGroup | null> = {
  draft: 'pending',
  'requirement-gathering': 'pending',
  planning: 'pending',
  'in-progress': 'ongoing',
  'on-hold': 'ongoing',
  testing: 'ongoing',
  completed: 'completed',
  cancelled: 'completed',
  archived: null,
};

/** Statuses that count toward dashboard totals and averages. */
export const isActiveStatus = (status: ProjectStatus) =>
  status !== 'archived' && status !== 'cancelled';

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  draft: 'text-slate-400 bg-slate-400/10',
  'requirement-gathering': 'text-purple-400 bg-purple-400/10',
  planning: 'text-yellow-400 bg-yellow-400/10',
  'in-progress': 'text-blue-400 bg-blue-400/10',
  'on-hold': 'text-orange-400 bg-orange-400/10',
  testing: 'text-cyan-400 bg-cyan-400/10',
  completed: 'text-green-400 bg-green-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
  archived: 'text-slate-400 bg-slate-400/10',
};

export const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  low: 'text-green-400 bg-green-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  high: 'text-orange-400 bg-orange-400/10',
  critical: 'text-red-400 bg-red-400/10',
};

/** Sort order for `sortBy: 'priority'`. Lower sorts first. */
export const PRIORITY_RANK: Record<ProjectPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  website: 'Website',
  'web-app': 'Web App',
  'mobile-app': 'Mobile App',
  pwa: 'PWA',
  'ai-automation': 'AI',
  api: 'API',
  design: 'Design',
  'internal-tool': 'Internal Tool',
  other: 'Other',
};

export const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
  blocked: 'Blocked',
};

/** Phases in display order — the horizontal tracker renders from this. */
export const PHASE_FIELDS = [
  { key: 'discovery', label: 'Discovery' },
  { key: 'design', label: 'Design' },
  { key: 'development', label: 'Development' },
  { key: 'testing', label: 'Testing & Delivery' },
] as const satisfies ReadonlyArray<{ key: PhaseKey; label: string }>;

/** Document slots in display order. */
export const DOCUMENT_FIELDS = [
  { key: 'proposal', label: 'Proposal' },
  { key: 'nda', label: 'NDA' },
  { key: 'brd', label: 'BRD / PRD' },
  { key: 'design', label: 'Design Files' },
  { key: 'contract', label: 'Contract' },
  { key: 'invoice', label: 'Invoice' },
  { key: 'other', label: 'Other' },
] as const satisfies ReadonlyArray<{ key: DocumentKey; label: string }>;

export const TECH_STACK_OPTIONS = [
  'React',
  'Next.js',
  'Vue',
  'Angular',
  'Flutter',
  'React Native',
  'Supabase',
  'Firebase',
  'Node.js',
  'Python',
  'FastAPI',
  'Django',
  'PostgreSQL',
  'MongoDB',
  'Redis',
  'OpenAI',
  'Claude',
  'Gemini',
  'Stripe',
  'Tailwind CSS',
  'TypeScript',
  'GraphQL',
  'Docker',
  'Custom',
];

/**
 * Link fields in display order, with the icon each one uses.
 *
 * Icons are named rather than imported here so this module stays free of React
 * dependencies; consumers map the name to a lucide component.
 */
export const LINK_FIELDS = [
  { key: 'github', label: 'GitHub', icon: 'GitBranch', placeholder: 'https://github.com/...' },
  { key: 'figma', label: 'Figma', icon: 'Pen', placeholder: 'https://figma.com/...' },
  { key: 'production', label: 'Production', icon: 'Globe', placeholder: 'https://...' },
  { key: 'staging', label: 'Staging', icon: 'Server', placeholder: 'https://staging...' },
  { key: 'documentation', label: 'Docs', icon: 'BookOpen', placeholder: 'https://docs...' },
  { key: 'drive', label: 'Google Drive', icon: 'FolderOpen', placeholder: 'https://drive.google.com/...' },
] as const satisfies ReadonlyArray<{
  key: keyof ProjectLinks;
  label: string;
  icon: string;
  placeholder: string;
}>;

// ─────────────────────────────────────────────────────────────────────────────
// Defaults — the single source of truth for "a blank sub-shape"
//
// These are duplicated by necessity into the Dexie v2 backfill and addProject,
// because a Dexie upgrade never runs on a fresh install.
// ─────────────────────────────────────────────────────────────────────────────

export const emptyPhase = (): ProjectPhase => ({
  status: 'not-started',
  startDate: null,
  endDate: null,
  progress: 0,
  notes: '',
});

export const emptyPhases = (): ProjectPhases => ({
  discovery: emptyPhase(),
  design: emptyPhase(),
  development: emptyPhase(),
  testing: emptyPhase(),
});

export const emptyTeam = (): ProjectTeam => ({
  projectManager: '',
  teamLead: '',
  qa: '',
  developers: [],
  designers: [],
});

export const emptyDocuments = (): ProjectDocuments =>
  DOCUMENT_FIELDS.reduce((acc, { key }) => {
    acc[key] = { url: '' };
    return acc;
  }, {} as ProjectDocuments);

export const emptyBudget = (): ProjectBudget => ({
  estimated: null,
  final: null,
  received: null,
});

/** Outstanding amount. Derived so it can never drift from the other three. */
export const pendingAmount = (budget: ProjectBudget): number | null => {
  const total = budget.final ?? budget.estimated;
  if (total == null) return null;
  return total - (budget.received ?? 0);
};

/** Overall progress from the four phases — what the form writes into `progress`. */
export const progressFromPhases = (phases: ProjectPhases): number =>
  Math.round(
    PHASE_FIELDS.reduce((sum, { key }) => sum + (phases[key]?.progress ?? 0), 0) /
      PHASE_FIELDS.length
  );

/**
 * A complete blank `Project`, minus the identity/timestamp fields the store
 * stamps on.
 *
 * The form only edits a subset of the record, so `addProject` spreads the form
 * over this rather than over `{}` — otherwise every unedited field would be
 * `undefined`, and the UI reads things like `project.techStack.length` and
 * `project.phases[key]` with no guard.
 */
export const emptyProjectRecord = (): Omit<
  Project,
  'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'deletedAt'
> => ({
  title: '',
  client: '',
  description: '',
  status: 'draft',
  priority: 'medium',
  type: 'web-app',
  progress: 0,

  pocName: '',
  pocPhone: '',

  shortDescription: '',
  requirements: '',
  deliverables: '',

  startDate: null,
  dueDate: null,
  expectedEndDate: null,
  actualEndDate: null,

  clientCompany: '',
  clientGst: '',
  clientAddress: '',
  clientWebsite: '',
  clientNotes: '',

  techStack: [],
  modules: [],
  phases: emptyPhases(),
  team: emptyTeam(),
  documents: emptyDocuments(),
  budget: emptyBudget(),
  links: { github: '', figma: '', production: '', staging: '', documentation: '', drive: '' },

  notes: '',
  internalNotes: '',
  meetingNotes: '',
  tags: [],
});

/** True when a phase has been touched — used to hide the tracker when unused. */
export const hasPhaseData = (phases: ProjectPhases | undefined): boolean =>
  !!phases && PHASE_FIELDS.some(({ key }) => {
    const p = phases[key];
    return !!p && (p.progress > 0 || p.status !== 'not-started' || !!p.startDate || !!p.notes);
  });

// ─────────────────────────────────────────────────────────────────────────────
// Extra Working Hours
// ─────────────────────────────────────────────────────────────────────────────

export type WorkType = 'development' | 'meeting' | 'support' | 'deployment' | 'other';

export type EntryStatus = 'pending' | 'approved' | 'rejected';

export interface TimeEntry {
  id: string;
  /** 'YYYY-MM-DD' */
  date: string;
  /**
   * Not a hard foreign key. A pull can deliver an entry before its project, so
   * consumers must tolerate an id that doesn't resolve.
   */
  projectId: string | null;
  workType: WorkType;
  /** 'HH:MM', or null while a row is incomplete. */
  startTime: string | null;
  endTime: string | null;
  /** Computed from start/end on save. Stored so lists and totals never recompute. */
  minutes: number;
  reason: string;
  status: EntryStatus;

  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  deletedAt: string | null;
}

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  development: 'Development',
  meeting: 'Meeting',
  support: 'Support',
  deployment: 'Deployment',
  other: 'Other',
};

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const ENTRY_STATUS_COLORS: Record<EntryStatus, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10',
  approved: 'text-green-400 bg-green-400/10',
  rejected: 'text-red-400 bg-red-400/10',
};

export const emptyTimeEntry = (): Omit<
  TimeEntry,
  'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'deletedAt'
> => ({
  date: '',
  projectId: null,
  workType: 'development',
  startTime: null,
  endTime: null,
  minutes: 0,
  reason: '',
  status: 'pending',
});
