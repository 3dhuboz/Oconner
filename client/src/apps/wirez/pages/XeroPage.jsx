import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getJob, updateJob, getJobs } from '../firebase'
import { useToast } from '../App'

export default function XeroPage() {
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const preselectedJobId = location.state?.jobId
  const [selectedJobId, setSelectedJobId] = useState(preselectedJobId || '')
  const [job, setJob] = useState(location.state?.job || null)
  const [pendingJobs, setPendingJobs] = useState([])
  const [contactName, setContactName] = useState('')
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unitAmount: '', accountCode: '200' }])
  const [invoiceRef, setInvoiceRef] = useState('')

  useEffect(() => { loadPendingJobs() }, [])
  useEffect(() => {
    if (selectedJobId && !location.state?.job) { getJob(selectedJobId).then(j => { setJob(j); prefillFromJob(j) }) }
    else if (job) { prefillFromJob(job) }
  }, [selectedJobId])

  async function loadPendingJobs() {
    const jobs = await getJobs()
    setPendingJobs(jobs.filter(j => j.status === 'complete' && !j.xeroInvoiceId))
  }

  function prefillFromJob(j) {
    if (!j) return
    setContactName(j.property?.owner || j.property?.agent || '')
    setInvoiceRef(j.jobNumber || '')
    const items = []
    if (j.fieldData?.labourHours) {
      items.push({ description: 'Labour \u2013 ' + (j.description || 'Electrical work') + ' (' + j.fieldData.labourHours + ' hrs @ $' + (j.fieldData.labourRate || 120) + '/hr)', quantity: j.fieldData.labourHours, unitAmount: j.fieldData.labourRate || 120, accountCode: '200' })
    }
    if (j.fieldData?.materials?.length) {
      j.fieldData.materials.filter(m => m.description).forEach(m => {
        items.push({ description: m.description, quantity: parseFloat(m.qty) || 1, unitAmount: parseFloat(m.unitCost) || 0, accountCode: '300' })
      })
    }
    if (items.length) setLineItems(items)
  }

  function addLine() { setLineItems(prev => [...prev, { description: '', quantity: 1, unitAmount: '', accountCode: '200' }]) }
  function updateLine(i, field, value) { setLineItems(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l)) }
  function removeLine(i) { setLineItems(prev => prev.filter((_, idx) => idx !== i)) }

  const total = lineItems.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitAmount) || 0), 0)

  return (
    <>
      <div className="wz-page-header">
        <div><div className="wz-page-title">Xero Integration</div><div className="wz-page-subtitle">Create and manage invoices</div></div>
      </div>
      <div className="wz-page-body">
        <div className="wz-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Xero Connection</div>
              <div style={{ fontSize: 13, color: 'var(--wz-text2)', marginTop: 4 }}>
                Configure Xero in your desktop app or contact your admin to set up the web integration.
              </div>
            </div>
            <div style={{ padding: '6px 12px', background: 'rgba(251,191,36,0.12)', borderRadius: 'var(--wz-radius)', fontSize: 12, color: 'var(--wz-warning)' }}>
              Web Mode \u2013 Manual Export
            </div>
          </div>
        </div>

        {pendingJobs.length > 0 && (
          <div className="wz-card" style={{ marginBottom: 20, borderColor: 'rgba(251,191,36,0.3)' }}>
            <div className="wz-card-title" style={{ color: 'var(--wz-warning)' }}>{'\u26A0'} Awaiting Invoice ({pendingJobs.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingJobs.map(j => (
                <div key={j.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--wz-bg3)', borderRadius: 'var(--wz-radius)' }}>
                  <div><span style={{ color: 'var(--wz-accent)', fontFamily: 'monospace', fontWeight: 600, marginRight: 10 }}>{j.jobNumber}</span><span style={{ color: 'var(--wz-text2)', fontSize: 13 }}>{j.property?.address}</span></div>
                  <button className="wz-btn wz-btn-secondary wz-btn-sm" onClick={() => setSelectedJobId(j.id)}>Invoice {'\u2192'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="wz-card">
          <div className="wz-card-title">Create Invoice</div>
          <div className="wz-form-row" style={{ marginBottom: 16 }}>
            <div className="wz-form-group" style={{ marginBottom: 0 }}>
              <label className="wz-form-label">Link to Job</label>
              <select className="wz-form-select" value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}>
                <option value="">{'\u2014'} Select job (optional) {'\u2014'}</option>
                {pendingJobs.map(j => <option key={j.id} value={j.id}>{j.jobNumber} {'\u2013'} {j.property?.address}</option>)}
              </select>
            </div>
            <div className="wz-form-group" style={{ marginBottom: 0 }}>
              <label className="wz-form-label">Invoice Reference</label>
              <input className="wz-form-input" placeholder="e.g. WRU-20240601-123" value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} />
            </div>
          </div>
          <div className="wz-form-group">
            <label className="wz-form-label">Contact (Agent / Owner) *</label>
            <input className="wz-form-input" placeholder="Ray White Brisbane" value={contactName} onChange={e => setContactName(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="wz-form-label" style={{ marginBottom: 0 }}>Line Items *</div>
            <button className="wz-btn wz-btn-secondary wz-btn-sm" onClick={addLine}>+ Add Line</button>
          </div>
          <div className="wz-table-wrap">
            <table>
              <thead><tr><th style={{ width: '40%' }}>Description</th><th>Qty</th><th>Unit ($)</th><th>Account</th><th>Total</th><th /></tr></thead>
              <tbody>
                {lineItems.map((line, i) => (
                  <tr key={i} className="wz-materials-row">
                    <td><input placeholder="Labour / part description" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} /></td>
                    <td><input type="number" min="0" step="0.25" style={{ width: 70 }} value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} /></td>
                    <td><input type="number" min="0" step="0.01" style={{ width: 90 }} value={line.unitAmount} onChange={e => updateLine(i, 'unitAmount', e.target.value)} /></td>
                    <td>
                      <select style={{ background: 'var(--wz-bg3)', border: '1px solid var(--wz-border)', color: 'var(--wz-text)', borderRadius: 5, padding: '5px 6px', fontSize: 12 }} value={line.accountCode} onChange={e => updateLine(i, 'accountCode', e.target.value)}>
                        <option value="200">200 {'\u2013'} Sales</option><option value="300">300 {'\u2013'} Materials</option><option value="400">400 {'\u2013'} Other</option>
                      </select>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--wz-text2)' }}>${((parseFloat(line.quantity) || 0) * (parseFloat(line.unitAmount) || 0)).toFixed(2)}</td>
                    <td><button className="wz-btn wz-btn-danger wz-btn-sm wz-btn-icon" onClick={() => removeLine(i)}>{'\u2715'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--wz-text3)' }}>Subtotal (excl. GST)</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--wz-accent)' }}>${total.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: 'var(--wz-text3)' }}>+ GST ${(total * 0.1).toFixed(2)} = ${(total * 1.1).toFixed(2)} incl.</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--wz-text3)', marginBottom: 8 }}>Copy the line items above into Xero manually, or connect via the desktop app for one-click invoicing.</div>
              <button className="wz-btn wz-btn-primary" style={{ fontSize: 15, padding: '12px 24px' }} onClick={() => { if (selectedJobId) { updateJob(selectedJobId, { status: 'invoiced' }).then(() => { toast('Job marked as invoiced', 'success'); loadPendingJobs() }) } else { toast('Select a job first', 'error') } }}>
                {'\u2705'} Mark as Invoiced
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
