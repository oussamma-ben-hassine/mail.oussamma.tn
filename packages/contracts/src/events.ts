import { z } from 'zod';

export const SupervisorEventActorSchema = z.object({
  issuer: z.string().default('https://sso-a.oussamma.tn'),
  sub: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
});

export const SupervisorEventResourceSchema = z.object({
  type: z.string().default('email'),
  id: z.string(),
  name: z.string().optional(),
  mime_type: z.string().optional(),
  size_bytes: z.number().int().optional(),
});

export const SupervisorEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.enum([
    'mail.message.received',
    'mail.message.sent',
    'mail.message.failed',
    'mail.message.bounced',
    'mail.message.flagged_urgent',
    'mail.mailbox.quota_warning',
    'mail.infrastructure.unhealthy',
  ]),
  event_version: z.literal(1),
  application: z.literal('mail'),
  actor: SupervisorEventActorSchema,
  occurred_at: z.string().datetime(),
  resource: SupervisorEventResourceSchema,
  outcome: z.enum(['success', 'failure', 'warning']),
  metadata: z.record(z.any()).default({}),
  correlation_id: z.string(),
});

export type SupervisorEvent = z.infer<typeof SupervisorEventSchema>;

export const WebhookPayloadSchema = z.object({
  id: z.string().uuid(),
  event: z.string(),
  timestamp: z.string(),
  data: z.record(z.any()),
  signature: z.string().optional(),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
