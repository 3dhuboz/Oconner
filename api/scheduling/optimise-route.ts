import type { AppRequest, AppResponse } from '../_handler';

interface JobInput {
  id: string;
  propertyAddress: string;
  type: string;
  scheduledDate?: string;
  assignedElectricianId?: string;
}

interface ScheduledSlot {
  jobId: string;
  address: string;
  suggestedTime: string; // ISO string
  durationMinutes: number;
  suburb: string;
  cluster: number;
}

// Extract suburb from Australian address (simple heuristic)
function extractSuburb(address: string): string {
  // Typical AU format: "123 Smith St, SUBURB QLD 4000" or "123 Smith St Suburb"
  const parts = address.split(',').map(s => s.trim());
  if (parts.length >= 2) {
    // Take the part after the first comma, strip postcode/state
    const suburbia = parts[1].replace(/\b(QLD|NSW|VIC|SA|WA|TAS|NT|ACT)\b/gi, '').replace(/\d{4}/, '').trim();
    return suburbia || parts[1];
  }
  // Fallback: take last 2 words before any 4-digit postcode
  const match = address.match(/([A-Za-z\s]+?)(?:\s+(?:QLD|NSW|VIC|SA|WA|TAS|NT|ACT))?\s*\d{4}$/i);
  if (match) return match[1].trim();
  return address.split(' ').slice(-2).join(' ');
}

// Simple string-based clustering by suburb
function clusterBySuburb(jobs: JobInput[]): Map<string, JobInput[]> {
  const clusters = new Map<string, JobInput[]>();
  for (const job of jobs) {
    const suburb = extractSuburb(job.propertyAddress).toLowerCase();
    if (!clusters.has(suburb)) clusters.set(suburb, []);
    clusters.get(suburb)!.push(job);
  }
  return clusters;
}

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jobs, date, technicianId, startHour = 7, endHour = 17 } = req.body as {
    jobs: JobInput[];
    date: string;       // ISO date string for the target day
    technicianId?: string;
    startHour?: number;
    endHour?: number;
  };

  if (!jobs?.length || !date) {
    return res.status(400).json({ error: 'Missing jobs array or date' });
  }

  // Filter to SA jobs if mixed
  const saJobs = jobs.filter(j => j.type === 'SMOKE_ALARM');
  const otherJobs = jobs.filter(j => j.type !== 'SMOKE_ALARM');

  // Cluster SA jobs by suburb
  const clusters = clusterBySuburb(saJobs);

  const schedule: ScheduledSlot[] = [];
  const baseDate = new Date(date);
  baseDate.setHours(startHour, 0, 0, 0);
  let currentTime = baseDate.getTime();
  let clusterIndex = 0;

  // Schedule SA jobs clustered by suburb (15min standard per job)
  for (const [suburb, clusterJobs] of clusters) {
    for (const job of clusterJobs) {
      if (new Date(currentTime).getHours() >= endHour) break;

      const duration = 15; // Standard SA check: 15 minutes
      schedule.push({
        jobId: job.id,
        address: job.propertyAddress,
        suggestedTime: new Date(currentTime).toISOString(),
        durationMinutes: duration,
        suburb: suburb.charAt(0).toUpperCase() + suburb.slice(1),
        cluster: clusterIndex,
      });
      currentTime += duration * 60 * 1000;
    }
    // Add 10 minute travel buffer between suburbs
    currentTime += 10 * 60 * 1000;
    clusterIndex++;
  }

  // Schedule non-SA jobs after SA jobs (30min each as they're typically faulty/repair)
  for (const job of otherJobs) {
    if (new Date(currentTime).getHours() >= endHour) break;

    const duration = 30; // Faulty/repair: 30 minutes
    const suburb = extractSuburb(job.propertyAddress);
    schedule.push({
      jobId: job.id,
      address: job.propertyAddress,
      suggestedTime: new Date(currentTime).toISOString(),
      durationMinutes: duration,
      suburb: suburb.charAt(0).toUpperCase() + suburb.slice(1),
      cluster: clusterIndex,
    });
    currentTime += duration * 60 * 1000;
  }

  const totalDuration = schedule.reduce((s, slot) => s + slot.durationMinutes, 0);
  const endTime = schedule.length > 0
    ? new Date(new Date(schedule[schedule.length - 1].suggestedTime).getTime() + schedule[schedule.length - 1].durationMinutes * 60000)
    : baseDate;

  return res.status(200).json({
    success: true,
    date,
    technicianId,
    totalJobs: schedule.length,
    totalSaJobs: saJobs.length,
    totalOtherJobs: otherJobs.length,
    totalDurationMinutes: totalDuration,
    estimatedEndTime: endTime.toISOString(),
    clusters: Array.from(clusters.entries()).map(([suburb, jobs]) => ({
      suburb: suburb.charAt(0).toUpperCase() + suburb.slice(1),
      count: jobs.length,
    })),
    schedule,
  });
}
