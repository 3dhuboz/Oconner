import type { AppRequest, AppResponse } from '../_handler';
import sendTenantHandler from '../notifications/send-tenant';
import { getDb, safeJson } from '../_db';

/**
 * Running-late detection endpoint.
 * Called periodically (e.g. via cron or from the client) to check if any
 * EXECUTION-status jobs have overrun their scheduled window and auto-send
 * a "running late" notification to the tenant.
 *
 * POST /api/scheduling/running-late-check
 * Body: { jobs: JobInput[] }   — active execution jobs with schedule info
 *
 * For each overrunning job it calls the tenant notification endpoint.
 */

interface JobInput {
  id: string;
  status: string;
  type: string;
  scheduledDate?: string;        // ISO datetime when job was scheduled to start
  assignedElectricianId?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  propertyAddress?: string;
  laborHours?: number;           // hours already worked (from timeLog)
  runningLateNotified?: boolean; // already sent running-late notification
}

interface OverrunResult {
  jobId: string;
  address: string;
  scheduledStart: string;
  expectedDurationMin: number;
  elapsedMin: number;
  overrunMin: number;
  notificationSent: boolean;
}

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jobs, autoNotify = true } = req.body as {
    jobs: JobInput[];
    autoNotify?: boolean;
  };

  if (!jobs?.length) {
    return res.status(200).json({ overruns: [], message: 'No jobs to check' });
  }

  const now = Date.now();
  const overruns: OverrunResult[] = [];

  for (const job of jobs) {
    if (job.status !== 'EXECUTION' || !job.scheduledDate) continue;

    const scheduledStart = new Date(job.scheduledDate).getTime();
    if (isNaN(scheduledStart)) continue;

    // Expected duration: SA = 15min, faulty/other = 60min, default 60min
    const expectedMin = job.type === 'SMOKE_ALARM' ? 15 : 60;

    // Buffer before we consider it "late": 10 minutes grace
    const graceMin = 10;
    const expectedEndMs = scheduledStart + (expectedMin + graceMin) * 60_000;

    if (now <= expectedEndMs) continue; // Not overrunning yet

    const elapsedMin = Math.round((now - scheduledStart) / 60_000);
    const overrunMin = Math.round((now - expectedEndMs) / 60_000);

    const result: OverrunResult = {
      jobId: job.id,
      address: job.propertyAddress || '',
      scheduledStart: new Date(scheduledStart).toISOString(),
      expectedDurationMin: expectedMin,
      elapsedMin,
      overrunMin,
      notificationSent: false,
    };

    // Send running-late notification if not already sent
    if (autoNotify && !job.runningLateNotified && (job.tenantPhone || job.tenantEmail)) {
      try {
        // Call the notification handler directly (avoids self-referential HTTP + JWT issues)
        let notifOk = false;
        const notifBody = {
          type: 'running_late',
          tenantName: job.tenantName || 'Tenant',
          tenantPhone: job.tenantPhone,
          tenantEmail: job.tenantEmail,
          propertyAddress: job.propertyAddress,
          jobId: job.id,
          scheduledDate: new Date(scheduledStart).toLocaleDateString('en-AU'),
          scheduledTime: new Date(scheduledStart).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
          delayMinutes: overrunMin,
        };
        const mockReq: AppRequest = { method: 'POST', headers: { get: () => null }, body: notifBody, query: {}, url: '', env: req.env };
        const mockRes: AppResponse = {
          status(code) { return this; },
          json(data) { notifOk = true; },
          send(data) { notifOk = true; },
          setHeader() {},
          end() {},
        };
        await sendTenantHandler(mockReq, mockRes);
        result.notificationSent = notifOk;

        // Persist runningLateNotified:true to D1 so next cron cycle doesn't re-send
        if (notifOk && req.env?.DB) {
          try {
            const db = getDb(req.env);
            const row = await db.prepare('SELECT data FROM jobs WHERE id = ?').bind(job.id).first<{ data: string }>();
            if (row) {
              const updated = { ...safeJson(row.data), runningLateNotified: true, updatedAt: new Date().toISOString() };
              await db.prepare('UPDATE jobs SET data = ?, updated_at = ? WHERE id = ?')
                .bind(JSON.stringify(updated), new Date().toISOString(), job.id).run();
            }
          } catch (dbErr: any) {
            console.error(`Failed to mark runningLateNotified for job ${job.id}:`, dbErr.message);
          }
        }
      } catch (err) {
        console.error(`Failed to send running-late notification for job ${job.id}:`, err);
        result.notificationSent = false;
      }
    }

    overruns.push(result);
  }

  return res.status(200).json({
    checkedAt: new Date().toISOString(),
    totalChecked: jobs.filter(j => j.status === 'EXECUTION').length,
    overruns,
    overrunCount: overruns.length,
  });
}
