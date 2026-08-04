import { z } from 'zod';

export const projectLinksSchema = z.object({
  github: z.string().default(''),
  figma: z.string().default(''),
  production: z.string().default(''),
  staging: z.string().default(''),
  documentation: z.string().default(''),
  drive: z.string().default(''),
});

export const projectSchema = z.object({
  title: z.string().min(1, 'Project name is required').max(100, 'Too long'),
  client: z.string().max(100, 'Too long').default(''),
  description: z.string().max(2000, 'Too long').default(''),
  status: z.enum(['pending', 'ongoing', 'completed', 'archived']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  type: z
    .enum(['website', 'web-app', 'mobile-app', 'ai-automation', 'api', 'internal-tool', 'other'])
    .default('web-app'),
  progress: z.number().min(0).max(100).default(0),
  startDate: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  techStack: z.array(z.string()).default([]),
  modules: z.array(z.string()).default([]),
  links: projectLinksSchema.default({ github: '', figma: '', production: '', staging: '', documentation: '', drive: '' }),
  notes: z.string().default(''),
  tags: z.array(z.string()).default([]),
});

export type ProjectFormData = z.infer<typeof projectSchema>;
