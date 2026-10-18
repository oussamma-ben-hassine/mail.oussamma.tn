import { PrismaClient } from '@prisma/client';
import { Worker, Job } from 'bullmq';
import { EmailDeliveryProcessor } from './processors/email-delivery.processor.js';

const prisma = new PrismaClient();
const processor = new EmailDeliveryProcessor(prisma);

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

let isShuttingDown = false;

async function bootstrap() {
  console.log('[Mail Worker] Initialisation du worker de livraison de messages...');

  try {
    const worker = new Worker(
      'email-delivery',
      async (job: Job) => {
        console.log(`[Mail Worker] Traitement du travail: ${job.id} (MailJob: ${job.data?.jobId})`);
        return processor.processJob(job.data?.jobId);
      },
      {
        connection: {
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          maxRetriesPerRequest: null,
        },
        concurrency: 5,
      }
    );

    worker.on('completed', (job: Job) => {
      console.log(`[Mail Worker] Travail ${job.id} complété avec succès.`);
    });

    worker.on('failed', (job: Job | undefined, err: Error) => {
      console.error(`[Mail Worker] Échec du travail ${job?.id}: ${err.message}`);
    });

    console.log(`[Mail Worker] Connecté à Redis (${redisHost}:${redisPort}) sur la file 'email-delivery'.`);
  } catch (err: any) {
    console.warn(`[Mail Worker] Redis indisponible (${err.message}). Bascule en mode boucle d'interrogation autonome.`);
    startStandalonePollingLoop();
  }
}

/**
 * Fallback autonome si Redis n'est pas encore démarré en local
 */
async function startStandalonePollingLoop() {
  setInterval(async () => {
    if (isShuttingDown) return;
    try {
      const pendingJobs = await prisma.mailJob.findMany({
        where: { status: 'QUEUED' },
        take: 10,
        orderBy: { createdAt: 'asc' },
      });

      for (const job of pendingJobs) {
        await processor.processJob(job.id);
      }
    } catch {
      // Attente prochaine itération
    }
  }, 5000);
}

const gracefulShutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('[Mail Worker] Arrêt gracieux en cours...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

bootstrap();
