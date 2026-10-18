import crypto from 'node:crypto';
import { SupervisorEvent } from '@mail/contracts';

export interface SupervisorConfig {
  baseUrl: string;
  supervisorKey: string;
  mockMode?: boolean;
}

export class SupervisorAdapter {
  private baseUrl: string;
  private supervisorKey: string;
  private mockMode: boolean;
  private eventBuffer: SupervisorEvent[] = [];

  constructor(config: SupervisorConfig) {
    this.baseUrl = (config.baseUrl || 'https://supervisor.oussamma.tn').replace(/\/+$/, '');
    this.supervisorKey = config.supervisorKey || '';
    this.mockMode = Boolean(config.mockMode || !config.supervisorKey);
  }

  /**
   * Track an event conforming to the common v1 catalog specification
   */
  public async trackEvent(
    eventType: SupervisorEvent['event_type'],
    actorSub: string,
    actorEmail: string | undefined,
    resourceId: string,
    outcome: 'success' | 'failure' | 'warning',
    metadata: Record<string, any> = {},
    correlationId?: string
  ): Promise<boolean> {
    // Sanitisation: Ne JAMAIS transmettre le corps ou sujet intégral de l'email
    const sanitizedMeta = { ...metadata };
    delete sanitizedMeta.body;
    delete sanitizedMeta.html;
    delete sanitizedMeta.text;
    delete sanitizedMeta.content;

    const event: SupervisorEvent = {
      event_id: crypto.randomUUID(),
      event_type: eventType,
      event_version: 1,
      application: 'mail',
      actor: {
        issuer: 'https://sso-a.oussamma.tn',
        sub: actorSub,
        email: actorEmail,
      },
      occurred_at: new Date().toISOString(),
      resource: {
        type: 'email',
        id: resourceId,
        size_bytes: metadata.sizeBytes,
      },
      outcome,
      metadata: sanitizedMeta,
      correlation_id: correlationId || `corr-${crypto.randomBytes(8).toString('hex')}`,
    };

    if (this.mockMode) {
      this.eventBuffer.push(event);
      return true;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/events/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Supervisor-Key': this.supervisorKey,
        },
        body: JSON.stringify({ events: [event] }),
      });

      return res.ok;
    } catch {
      // Les pannes de supervision ne doivent pas bloquer le flux principal d'envoi d'email
      return false;
    }
  }

  public getMockEventBuffer(): SupervisorEvent[] {
    return [...this.eventBuffer];
  }

  public clearMockBuffer() {
    this.eventBuffer = [];
  }
}
