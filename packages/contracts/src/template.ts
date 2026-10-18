import { z } from 'zod';

export const CreateTemplateSchema = z.object({
  name: z.string().min(2).max(100).regex(/^[a-z0-9_-]+$/i, {
    message: 'Le nom du template doit contenir uniquement des lettres, chiffres, tirets et underscores',
  }),
  description: z.string().max(255).optional(),
  subject: z.string().min(1).max(500),
  htmlContent: z.string().min(1),
  textContent: z.string().optional(),
  variablesSchema: z.record(z.any()).optional(),
  sampleData: z.record(z.any()).optional(),
});

export type CreateTemplateRequest = z.infer<typeof CreateTemplateSchema>;

export const UpdateTemplateSchema = z.object({
  description: z.string().max(255).optional(),
  subject: z.string().min(1).max(500).optional(),
  htmlContent: z.string().min(1).optional(),
  textContent: z.string().optional(),
  variablesSchema: z.record(z.any()).optional(),
  sampleData: z.record(z.any()).optional(),
  changeLog: z.string().max(255).optional(),
});

export type UpdateTemplateRequest = z.infer<typeof UpdateTemplateSchema>;

export const PreviewTemplateSchema = z.object({
  variables: z.record(z.any()).default({}),
});

export type PreviewTemplateRequest = z.infer<typeof PreviewTemplateSchema>;

export const TemplateResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  currentVersion: z.number().int(),
  subject: z.string(),
  htmlContent: z.string(),
  textContent: z.string().nullable().optional(),
  variablesSchema: z.record(z.any()).nullable().optional(),
  sampleData: z.record(z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TemplateResponse = z.infer<typeof TemplateResponseSchema>;

export const PreviewTemplateResponseSchema = z.object({
  subject: z.string(),
  html: z.string(),
  text: z.string(),
  missingVariables: z.array(z.string()),
});

export type PreviewTemplateResponse = z.infer<typeof PreviewTemplateResponseSchema>;
