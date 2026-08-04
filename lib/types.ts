export type ProjectStatus = 'pending' | 'ongoing' | 'completed' | 'archived';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type ProjectType =
  | 'website'
  | 'web-app'
  | 'mobile-app'
  | 'ai-automation'
  | 'api'
  | 'internal-tool'
  | 'other';

export interface ProjectLinks {
  github?: string;
  figma?: string;
  production?: string;
  staging?: string;
  documentation?: string;
  drive?: string;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  type: ProjectType;
  progress: number; // 0–100
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  techStack: string[];
  modules: string[];
  links: ProjectLinks;
  notes: string;
  tags: string[];
  syncStatus: 'synced' | 'pending' | 'conflict';
  deletedAt: string | null; // soft delete
}

export interface FilterState {
  priority: ProjectPriority | 'all';
  type: ProjectType | 'all';
  sortBy: 'newest' | 'oldest' | 'dueDate' | 'priority' | 'progress';
}

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

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  website: 'Website',
  'web-app': 'Web App',
  'mobile-app': 'Mobile App',
  'ai-automation': 'AI Automation',
  api: 'API',
  'internal-tool': 'Internal Tool',
  other: 'Other',
};

export const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  low: 'text-green-400 bg-green-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  high: 'text-orange-400 bg-orange-400/10',
  critical: 'text-red-400 bg-red-400/10',
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10',
  ongoing: 'text-blue-400 bg-blue-400/10',
  completed: 'text-green-400 bg-green-400/10',
  archived: 'text-slate-400 bg-slate-400/10',
};

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
