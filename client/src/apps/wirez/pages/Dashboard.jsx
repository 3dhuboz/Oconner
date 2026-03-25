import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJobs } from '../firebase'
import { format, isToday } from 'date-fns'

function statusBadge(status) {
  const map = {
    new: 'wz-badge-new',
    contact_attempted: 'wz-badge-new',
    entry_notice_sent: 'wz-badge-scheduled',
    scheduled: 'wz-badge-scheduled',
    dispatched: 'wz-badge-dispatched',
    in_progress: 'wz-badge-progress',
    complete: 'wz-badge-complete',
    invoiced: 'wz-badge-invoiced',
  }
  const label = status.replace(/_/g, ' ')
  return <span className={`wz-badge ${map[status] || 'wz-badge-new'}`}>{label}</span>
}

function typeBadge(type) {
  if (type === 'smoke_alarm') return <span className="wz-badge wz-badge-smoke">Smoke Alarm</span>
  return <span className="wz-badge wz-badge-repair">Repair</span>
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return isToday(d) ? `Today ${format(d, 'h:mm a')}` : format(d, 'd MMM yyyy')
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getJobs().then(data => { setJobs(data); setLoading(false) })
  }, [])

  const counts = {
    active: jobs.filter(j => !['complete', 'invoiced'].includes(j.status)).length,
    today: jobs.filter(j => j.scheduledDate && isToday(j.scheduledDate.toDate ? j.scheduledDate.toDate() : new Date(j.scheduledDate))).length,
    pending_invoice: jobs.filter(j => j.status === 'complete' && !j.xeroInvoiceId).length,
    complete: jobs.filter(j => j.status === 'invoiced').length,
  }

  const recent = [...jobs].slice(0, 10)

  return (
    <>
      <div className="wz-page-header">
        <div>
          <div className="wz-page-title">Dashboard</div>
          <div className="wz-page-subtitle">{format(new Date(), 'EEEE, d MMMM yyyy')}</div>
        </div>
        <button className="wz-btn wz-btn-primary" onClick={() => navigate('/jobs/new')}>
          + New Job
        </button>
      </div>

      <div className="wz-page-body">
        {/* Stats */}
        <div className="wz-stats-grid">
          <div className="wz-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="wz-stat-label">Active Jobs</div>
              <div className="wz-stat-icon">📋</div>
            </div>
            <div className="wz-stat-value" style={{ color: 'var(--wz-info)' }}>{counts.active}</div>
            <div className="wz-stat-delta">In pipeline</div>
          </div>
          <div className="wz-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="wz-stat-label">Scheduled Today</div>
              <div className="wz-stat-icon">📅</div>
            </div>
            <div className="wz-stat-value" style={{ color: 'var(--wz-accent)' }}>{counts.today}</div>
            <div className="wz-stat-delta">Jobs on the books</div>
          </div>
          <div className="wz-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="wz-stat-label">Awaiting Invoice</div>
              <div className="wz-stat-icon">💸</div>
            </div>
            <div className="wz-stat-value" style={{ color: counts.pending_invoice > 0 ? 'var(--wz-warning)' : 'var(--wz-text2)' }}>
              {counts.pending_invoice}
            </div>
            <div className="wz-stat-delta">Complete, not invoiced</div>
          </div>
          <div className="wz-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="wz-stat-label">Invoiced</div>
              <div className="wz-stat-icon">✅</div>
            </div>
            <div className="wz-stat-value" style={{ color: 'var(--wz-success)' }}>{counts.complete}</div>
            <div className="wz-stat-delta">All time</div>
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="wz-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="wz-card-title" style={{ marginBottom: 0 }}>Recent Jobs</div>
            <button className="wz-btn wz-btn-secondary wz-btn-sm" onClick={() => navigate('/jobs')}>View All →</button>
          </div>

          {loading ? (
            <div className="wz-loading"><div className="wz-spinner" /> Loading jobs…</div>
          ) : jobs.length === 0 ? (
            <div className="wz-empty-state">
              <div className="wz-empty-icon">📭</div>
              <p>No jobs yet. Create your first one!</p>
            </div>
          ) : (
            <div className="wz-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Job #</th>
                    <th>Property</th>
                    <th>Type</th>
                    <th>Assigned To</th>
                    <th>Scheduled</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(job => (
                    <tr key={job.id} className="wz-clickable-row" onClick={() => navigate(`/jobs/${job.id}`)}>
                      <td style={{ color: 'var(--wz-accent)', fontWeight: 600, fontFamily: 'monospace' }}>{job.jobNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{job.property?.address || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--wz-text2)' }}>{job.property?.agent || ''}</div>
                      </td>
                      <td>{typeBadge(job.jobType)}</td>
                      <td>{job.assignedTo || <span style={{ color: 'var(--wz-text3)' }}>Unassigned</span>}</td>
                      <td style={{ color: 'var(--wz-text2)' }}>{formatDate(job.scheduledDate)}</td>
                      <td>{statusBadge(job.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
