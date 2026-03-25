import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJobs } from '../firebase'
import { format } from 'date-fns'

const COLUMNS = [
  { key: 'new', label: 'New / Intake', color: 'var(--wz-status-new)', statuses: ['new', 'contact_attempted'] },
  { key: 'entry', label: 'Entry Notice', color: 'var(--wz-status-scheduled)', statuses: ['entry_notice_sent'] },
  { key: 'scheduled', label: 'Scheduled', color: '#a78bfa', statuses: ['scheduled'] },
  { key: 'dispatched', label: 'Dispatched', color: 'var(--wz-status-dispatched)', statuses: ['dispatched', 'in_progress'] },
  { key: 'complete', label: 'Complete', color: 'var(--wz-status-complete)', statuses: ['complete'] },
  { key: 'invoiced', label: 'Invoiced', color: 'var(--wz-status-invoiced)', statuses: ['invoiced'] },
]

function formatDate(ts) {
  if (!ts) return null
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return format(d, 'd MMM')
  } catch { return null }
}

function JobCard({ job, onClick }) {
  const typeIcon = job.jobType === 'smoke_alarm' ? '🔴' : job.jobType === 'compliance' ? '📋' : '🔧'
  const dateStr = formatDate(job.scheduledDate)
  return (
    <div className="wz-job-card" onClick={onClick}>
      <div className="wz-job-card-number">{job.jobNumber}</div>
      <div className="wz-job-card-address">{job.property?.streetAddress || job.property?.address || '—'}</div>
      <div className="wz-job-card-meta">
        {typeIcon} {job.jobType?.replace(/_/g, ' ')}
        {job.property?.suburb ? ` · ${job.property.suburb}` : ''}
      </div>
      {(dateStr || job.assignedTo) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--wz-text3)' }}>
          {dateStr ? <span>📅 {dateStr}</span> : <span />}
          {job.assignedTo ? <span>👷 {job.assignedTo.split(' ')[0]}</span> : <span />}
        </div>
      )}
      {job.priority === 'urgent' && (
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--wz-danger)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          ⚠ URGENT
        </div>
      )}
    </div>
  )
}

export default function JobsBoard() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('board')
  const [filter, setFilter] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getJobs().then(data => { setJobs(data); setLoading(false) })
  }, [])

  const filtered = filter
    ? jobs.filter(j =>
        j.jobNumber?.toLowerCase().includes(filter.toLowerCase()) ||
        j.property?.address?.toLowerCase().includes(filter.toLowerCase()) ||
        j.assignedTo?.toLowerCase().includes(filter.toLowerCase())
      )
    : jobs

  if (loading) {
    return (
      <>
        <div className="wz-page-header"><div className="wz-page-title">Jobs Board</div></div>
        <div className="wz-loading"><div className="wz-spinner" /> Loading jobs…</div>
      </>
    )
  }

  return (
    <>
      <div className="wz-page-header">
        <div>
          <div className="wz-page-title">Jobs Board</div>
          <div className="wz-page-subtitle">{jobs.length} total jobs</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="wz-form-input" style={{ width: 220 }} placeholder="Search jobs…" value={filter} onChange={e => setFilter(e.target.value)} />
          <div style={{ display: 'flex', background: 'var(--wz-bg3)', borderRadius: 'var(--wz-radius)', border: '1px solid var(--wz-border)', padding: 3, gap: 2 }}>
            {['board', 'list'].map(v => (
              <button key={v} className={`wz-btn wz-btn-sm ${view === v ? 'wz-btn-primary' : ''}`}
                style={{ background: view === v ? 'var(--wz-accent)' : 'transparent', color: view === v ? '#000' : 'var(--wz-text2)', border: 'none' }}
                onClick={() => setView(v)}>
                {v === 'board' ? '⊞ Board' : '≡ List'}
              </button>
            ))}
          </div>
          <button className="wz-btn wz-btn-primary" onClick={() => navigate('/jobs/new')}>+ New Job</button>
        </div>
      </div>

      <div className="wz-page-body" style={{ overflow: 'hidden', padding: view === 'board' ? '16px 20px' : '24px 28px' }}>
        {view === 'board' ? (
          <div className="wz-board-wrap">
            {COLUMNS.map(col => {
              const colJobs = filtered.filter(j => col.statuses.includes(j.status))
              return (
                <div key={col.key} className="wz-board-col">
                  <div className="wz-board-col-header">
                    <span style={{ color: col.color }}>{col.label}</span>
                    <span style={{ background: 'var(--wz-bg)', borderRadius: 10, padding: '2px 7px', fontSize: 11, color: 'var(--wz-text3)' }}>{colJobs.length}</span>
                  </div>
                  <div className="wz-board-col-body">
                    {colJobs.length === 0 ? (
                      <div style={{ color: 'var(--wz-text3)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Empty</div>
                    ) : (
                      colJobs.map(job => <JobCard key={job.id} job={job} onClick={() => navigate(`/jobs/${job.id}`)} />)
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="wz-card">
            {filtered.length === 0 ? (
              <div className="wz-empty-state"><div className="wz-empty-icon">🔍</div><p>No jobs found</p></div>
            ) : (
              <div className="wz-table-wrap">
                <table>
                  <thead><tr><th>Job #</th><th>Address</th><th>Type</th><th>Assigned</th><th>Scheduled</th><th>Status</th></tr></thead>
                  <tbody>
                    {filtered.map(job => (
                      <tr key={job.id} className="wz-clickable-row" onClick={() => navigate(`/jobs/${job.id}`)}>
                        <td style={{ color: 'var(--wz-accent)', fontWeight: 600, fontFamily: 'monospace' }}>{job.jobNumber}</td>
                        <td><div style={{ fontWeight: 600 }}>{job.property?.address || '—'}</div></td>
                        <td><span className={`wz-badge ${job.jobType === 'smoke_alarm' ? 'wz-badge-smoke' : 'wz-badge-repair'}`}>{job.jobType?.replace(/_/g, ' ')}</span></td>
                        <td style={{ color: 'var(--wz-text2)' }}>{job.assignedTo || '—'}</td>
                        <td style={{ color: 'var(--wz-text2)' }}>{formatDate(job.scheduledDate) || '—'}</td>
                        <td><span className={`wz-badge wz-badge-${job.status === 'in_progress' ? 'progress' : job.status}`}>{job.status?.replace(/_/g, ' ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
