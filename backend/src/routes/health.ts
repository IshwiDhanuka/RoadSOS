import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  /** Returns 200 OK with server uptime and current timestamp. Used by Render.com for
   *  health checks and cron-job.org for keep-alive pings to prevent cold starts. */
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
