import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createJob } from '../firebase'
import { useToast } from '../App'

export default function NewJob() {
  const navigate = useNavigate()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    source: 'email',
    workOrderRef: '',
    address: '',
    suburb: '',
    state: 'QLD',
    postcode: '',
    agent: '',
    owner: '',
    tenantName: '',
    tenantPhone: '',
    tenantEmail: '',
    jobType: 'repair',
    description: '',
    priority: 'normal',
    estimatedHours: '',
    scheduledDate: '',
    scheduledTime: '',
    assignedTo: '',
    accessNotes: '',
    gateCode: '',
  })

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.address || !form.description) {
      toast('Property address and job description are required', 'error')
      return
    }
    setSaving(true)
    try {
      const { id, jobNumber } = await createJob({
        source: form.source,
        workOrderRef: form.workOrderRef,
        property: {
          address: `${form.address}, ${form.suburb} ${form.state} ${form.postcode}`.trim(),
          streetAddress: form.address,
          suburb: form.suburb,
          state: form.state,
          postcode: form.postcode,
          agent: form.agent,
          owner: form.owner,
        },
        tenant: {
          name: form.tenantName,
          phone: form.tenantPhone,
          email: form.tenantEmail,
        },
        jobType: form.jobType,
        description: form.description,
        priority: form.priority,
        estimatedHours: parseFloat(form.estimatedHours) || null,
        scheduledDate: form.scheduledDate ? new Date(`${form.scheduledDate}T${form.scheduledTime || '08:00'}`) : null,
        assignedTo: form.assignedTo,
        accessNotes: form.accessNotes,
        gateCode: form.gateCode,
        contactAttempts: 0,
        entryNoticeSent: false,
      })
      toast(`Job ${jobNumber} created!`, 'success')
      navigate(`/jobs/${id}`)
    } catch (err) {
      toast(err.message, 'error')
      setSaving(false)
    }
  }

  return (
    <>
      <div className="wz-page-header">
        <div>
          <div className="wz-page-title">New Job</div>
          <div className="wz-page-subtitle">Log incoming work order</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="wz-btn wz-btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button className="wz-btn wz-btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <><span className="wz-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Saving…</> : '✓ Create Job'}
          </button>
        </div>
      </div>

      <div className="wz-page-body">
        <form onSubmit={handleSubmit}>
          <div className="wz-two-col" style={{ alignItems: 'start', gap: 24 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Source */}
              <div className="wz-card">
                <div className="wz-card-title">Work Order Source</div>
                <div className="wz-form-row">
                  <div className="wz-form-group" style={{ marginBottom: 0 }}>
                    <label className="wz-form-label">Received Via</label>
                    <select className="wz-form-select" value={form.source} onChange={e => set('source', e.target.value)}>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="portal">Agent Portal</option>
                      <option value="direct">Direct Client</option>
                    </select>
                  </div>
                  <div className="wz-form-group" style={{ marginBottom: 0 }}>
                    <label className="wz-form-label">Work Order Ref #</label>
                    <input className="wz-form-input" placeholder="e.g. WO-12345" value={form.workOrderRef} onChange={e => set('workOrderRef', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Property */}
              <div className="wz-card">
                <div className="wz-card-title">Property Details</div>
                <div className="wz-form-group">
                  <label className="wz-form-label">Street Address *</label>
                  <input className="wz-form-input" placeholder="123 Smith Street" value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
                <div className="wz-form-row-3">
                  <div className="wz-form-group" style={{ marginBottom: 0 }}>
                    <label className="wz-form-label">Suburb</label>
                    <input className="wz-form-input" placeholder="Brisbane" value={form.suburb} onChange={e => set('suburb', e.target.value)} />
                  </div>
                  <div className="wz-form-group" style={{ marginBottom: 0 }}>
                    <label className="wz-form-label">State</label>
                    <select className="wz-form-select" value={form.state} onChange={e => set('state', e.target.value)}>
                      {['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="wz-form-group" style={{ marginBottom: 0 }}>
                    <label className="wz-form-label">Postcode</label>
                    <input className="wz-form-input" placeholder="4000" maxLength={4} value={form.postcode} onChange={e => set('postcode', e.target.value)} />
                  </div>
                </div>
                <div className="wz-divider" style={{ margin: '16px 0' }} />
                <div className="wz-form-row">
                  <div className="wz-form-group" style={{ marginBottom: 0 }}>
                    <label className="wz-form-label">Property Manager / Agent</label>
                    <input className="wz-form-input" placeholder="Ray White Brisbane" value={form.agent} onChange={e => set('agent', e.target.value)} />
                  </div>
                  <div className="wz-form-group" style={{ marginBottom: 0 }}>
                    <label className="wz-form-label">Owner (for Xero)</label>
                    <input className="wz-form-input" placeholder="John Smith" value={form.owner} onChange={e => set('owner', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Tenant */}
              <div className="wz-card">
                <div className="wz-card-title">Tenant Contact</div>
                <div className="wz-form-group">
                  <label className="wz-form-label">Full Name</label>
                  <input className="wz-form-input" placeholder="Jane Doe" value={form.tenantName} onChange={e => set('tenantName', e.target.value)} />
                </div>
                <div className="wz-form-row">
                  <div className="wz-form-group" style={{ marginBottom: 0 }}>
                    <label className="wz-form-label">Phone</label>
                    <input className="wz-form-input" type="tel" placeholder="04XX XXX XXX" value={form.tenantPhone} onChange={e => set('tenantPhone', e.target.value)} />
                  </div>
                  <div className="wz-form-group" style={{ marginBottom: 0 }}>
                    <label className="wz-form-label">Email</label>
                    <input className="wz-form-input" type="email" placeholder="tenant@email.com" value={form.tenantEmail} onChange={e => set('tenantEmail', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Job details */}
              <div className="wz-card">
                <div className="wz-card-title">Job Details</div>
                <div className="wz-form-row">
                  <div className="wz-form-group">
                    <label className="wz-form-label">Job Type</label>
                    <select className="wz-form-select" value={form.jobType} onChange={e => set('jobType', e.target.value)}>
                      <option value="repair">General Repair</option>
                      <option value="smoke_alarm">Smoke Alarm</option>
                      <option value="compliance">Compliance Check</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="wz-form-group">
                    <label className="wz-form-label">Priority</label>
                    <select className="wz-form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="wz-form-group">
                  <label className="wz-form-label">Description *</label>
                  <textarea
                    className="wz-form-textarea"
                    rows={4}
                    placeholder="Describe the fault or work required…"
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                  />
                </div>
                <div className="wz-form-group" style={{ marginBottom: 0 }}>
                  <label className="wz-form-label">Estimated Hours</label>
                  <input className="wz-form-input" type="number" min="0.5" step="0.5" placeholder="2.0" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)} />
                </div>
              </div>

              {/* Scheduling */}
              <div className="wz-card">
                <div className="wz-card-title">Scheduling & Dispatch</div>
                <div className="wz-form-row">
                  <div className="wz-form-group">
                    <label className="wz-form-label">Date</label>
                    <input className="wz-form-input" type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)} />
                  </div>
                  <div className="wz-form-group">
                    <label className="wz-form-label">Time</label>
                    <input className="wz-form-input" type="time" value={form.scheduledTime} onChange={e => set('scheduledTime', e.target.value)} />
                  </div>
                </div>
                <div className="wz-form-group" style={{ marginBottom: 0 }}>
                  <label className="wz-form-label">Assign To</label>
                  <input className="wz-form-input" placeholder="Electrician name or email" value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} />
                </div>
              </div>

              {/* Access */}
              <div className="wz-card">
                <div className="wz-card-title">Access Notes</div>
                <div className="wz-form-group">
                  <label className="wz-form-label">Gate / Lock-box Code</label>
                  <input className="wz-form-input" placeholder="e.g. 1234#" value={form.gateCode} onChange={e => set('gateCode', e.target.value)} />
                </div>
                <div className="wz-form-group" style={{ marginBottom: 0 }}>
                  <label className="wz-form-label">Additional Access Notes</label>
                  <textarea className="wz-form-textarea" rows={2} placeholder="e.g. Park on street, use side gate…" value={form.accessNotes} onChange={e => set('accessNotes', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}
