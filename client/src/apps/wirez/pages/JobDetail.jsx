import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJob, updateJob } from '../firebase'
import { useToast } from '../App'
import { format } from 'date-fns'

const STATUS_FLOW = [
  { key: 'new', label: 'New', icon: '📥' },
  { key: 'contact_attempted', label: 'Contact Attempted', icon: '📞' },
  { key: 'entry_notice_sent', label: 'Entry Notice Sent', icon: '📨' },
  { key: 'scheduled', label: 'Scheduled', icon: '📅' },
  { key: 'dispatched', label: 'Dispatched', icon: '🚐' },
  { key: 'in_progress', label: 'In Progress', icon: '🔧' },
  { key: 'complete', label: 'Complete', icon: '✅' },
  { key: 'invoiced', label: 'Invoiced', icon: '💰' },
]

function formatDate(ts) {
  if (!ts) return '\u2014'
  try { const d = ts.toDate ? ts.toDate() : new Date(ts); return format(d, 'd MMM yyyy, h:mm a') } catch { return '\u2014' }
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid rgba(42,48,71,0.4)' }}>
      <div style={{ width: 160, color: 'var(--wz-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>{label}</div>
      <div style={{ color: 'var(--wz-text)', fontSize: 13.5 }}>{value || '\u2014'}</div>
    </div>
  )
}

export default function JobDetail() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => { getJob(jobId).then(data => { setJob(data); setNotes(data?.adminNotes || ''); setLoading(false) }) }, [jobId])

  async function setStatus(status) { setUpdating(true); await updateJob(jobId, { status }); setJob(prev => ({ ...prev, status })); toast('Status updated to: ' + status.replace(/_/g, ' '), 'success'); setUpdating(false) }
  async function logContact() { const a = (job.contactAttempts||0)+1; const u = { contactAttempts: a }; if(a>=3&&job.status==='new') u.status='contact_attempted'; await updateJob(jobId,u); setJob(p=>({...p,...u})); toast('Contact attempt '+a+' logged'+(a>=3?' \u2014 consider Entry Notice':''),'success') }
  async function markEntryNoticeSent() { await updateJob(jobId,{entryNoticeSent:true,entryNoticeSentAt:new Date(),status:'entry_notice_sent'}); setJob(p=>({...p,entryNoticeSent:true,status:'entry_notice_sent'})); toast('Entry notice marked as sent','success') }
  async function saveNotes() { await updateJob(jobId,{adminNotes:notes}); toast('Notes saved','success') }

  if (loading) return <div className="wz-loading"><div className="wz-spinner" /> Loading job\u2026</div>
  if (!job) return <div className="wz-loading">Job not found</div>
  const currentStep = STATUS_FLOW.findIndex(s => s.key === job.status)

  return (
    <>
      <div className="wz-page-header">
        <div>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <button className="wz-btn wz-btn-secondary wz-btn-sm" onClick={()=>navigate('/jobs')}>\u2190 Back</button>
            <span style={{ color:'var(--wz-accent)',fontFamily:'monospace',fontWeight:700,fontSize:16 }}>{job.jobNumber}</span>
            <span className={'wz-badge wz-badge-'+(job.status==='in_progress'?'progress':job.status)}>{job.status.replace(/_/g,' ')}</span>
            {job.priority==='urgent'&&<span className="wz-badge" style={{background:'rgba(248,113,113,0.15)',color:'var(--wz-danger)'}}>URGENT</span>}
          </div>
          <div className="wz-page-subtitle" style={{marginTop:6}}>{job.property?.address}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="wz-btn wz-btn-secondary" onClick={()=>navigate('/jobs/'+jobId+'/field')}>📷 Field Capture</button>
          {job.status==='complete'&&!job.xeroInvoiceId&&<button className="wz-btn wz-btn-primary" onClick={()=>navigate('/xero',{state:{jobId,job}})}>💰 Create Xero Invoice</button>}
        </div>
      </div>
      <div className="wz-page-body">
        <div className="wz-card" style={{marginBottom:20}}>
          <div className="wz-card-title">Workflow Progress</div>
          <div style={{display:'flex',alignItems:'center',overflowX:'auto',paddingBottom:4}}>
            {STATUS_FLOW.map((step,i) => {
              const done=i<currentStep, active=i===currentStep, isLast=i===STATUS_FLOW.length-1
              return (<div key={step.key} style={{display:'flex',alignItems:'center',flexShrink:0}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'6px 8px',borderRadius:'var(--wz-radius)',cursor:done?'default':'pointer',background:active?'rgba(245,166,35,0.12)':'transparent'}} onClick={()=>!done&&!active&&setStatus(step.key)}>
                  <div style={{fontSize:18,filter:done||active?'none':'grayscale(1) opacity(0.4)'}}>{step.icon}</div>
                  <div style={{fontSize:10,fontWeight:600,color:active?'var(--wz-accent)':done?'var(--wz-success)':'var(--wz-text3)',textAlign:'center',maxWidth:70,lineHeight:1.3}}>{step.label}</div>
                </div>
                {!isLast&&<div style={{width:24,height:1,background:i<currentStep?'var(--wz-success)':'var(--wz-border)',flexShrink:0}}/>}
              </div>)
            })}
          </div>
          <div className="wz-divider"/>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {(job.status==='new'||job.status==='contact_attempted')&&<><button className="wz-btn wz-btn-secondary" onClick={logContact} disabled={updating}>📞 Log Contact ({job.contactAttempts||0}/3)</button>{(job.contactAttempts>=1||job.status==='contact_attempted')&&!job.entryNoticeSent&&<button className="wz-btn wz-btn-secondary" onClick={markEntryNoticeSent} disabled={updating}>📨 Entry Notice Sent</button>}</>}
            {job.status==='entry_notice_sent'&&<button className="wz-btn wz-btn-primary" onClick={()=>setStatus('scheduled')} disabled={updating}>\u2713 Move to Scheduled</button>}
            {job.status==='scheduled'&&<button className="wz-btn wz-btn-primary" onClick={()=>setStatus('dispatched')} disabled={updating}>🚐 Dispatch</button>}
            {job.status==='dispatched'&&<button className="wz-btn wz-btn-secondary" onClick={()=>setStatus('in_progress')} disabled={updating}>🔧 In Progress</button>}
            {job.status==='in_progress'&&<button className="wz-btn wz-btn-success" onClick={()=>setStatus('complete')} disabled={updating}>\u2705 Mark Complete</button>}
          </div>
        </div>
        <div className="wz-two-col" style={{alignItems:'start'}}>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="wz-card"><div className="wz-card-title">Property</div><InfoRow label="Address" value={job.property?.address}/><InfoRow label="Agent" value={job.property?.agent}/><InfoRow label="Owner" value={job.property?.owner}/>{job.gateCode&&<InfoRow label="Gate Code" value={<span style={{fontFamily:'monospace',color:'var(--wz-warning)'}}>{job.gateCode}</span>}/>}{job.accessNotes&&<InfoRow label="Access Notes" value={job.accessNotes}/>}</div>
            <div className="wz-card"><div className="wz-card-title">Tenant</div><InfoRow label="Name" value={job.tenant?.name}/><InfoRow label="Phone" value={job.tenant?.phone?<a href={'tel:'+job.tenant.phone} style={{color:'var(--wz-accent)'}}>{job.tenant.phone}</a>:null}/><InfoRow label="Email" value={job.tenant?.email?<a href={'mailto:'+job.tenant.email} style={{color:'var(--wz-accent)'}}>{job.tenant.email}</a>:null}/><InfoRow label="Contact Attempts" value={job.contactAttempts||0}/><InfoRow label="Entry Notice" value={job.entryNoticeSent?'Sent '+formatDate(job.entryNoticeSentAt):'Not sent'}/></div>
            {job.xeroInvoiceId&&<div className="wz-card" style={{borderColor:'rgba(245,166,35,0.4)'}}><div className="wz-card-title" style={{color:'var(--wz-accent)'}}>Xero Invoice</div><InfoRow label="Invoice #" value={job.xeroInvoiceNumber}/><InfoRow label="Invoice ID" value={<span style={{fontFamily:'monospace',fontSize:11}}>{job.xeroInvoiceId}</span>}/></div>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="wz-card"><div className="wz-card-title">Job Details</div><InfoRow label="Type" value={<span className={'wz-badge '+(job.jobType==='smoke_alarm'?'wz-badge-smoke':'wz-badge-repair')}>{job.jobType?.replace(/_/g,' ')}</span>}/><InfoRow label="Priority" value={job.priority}/><InfoRow label="Work Order Ref" value={job.workOrderRef}/><InfoRow label="Assigned To" value={job.assignedTo}/><InfoRow label="Scheduled" value={formatDate(job.scheduledDate)}/><InfoRow label="Est. Hours" value={job.estimatedHours?job.estimatedHours+' hrs':null}/><div style={{marginTop:12}}><div style={{fontSize:11,fontWeight:600,color:'var(--wz-text3)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Description</div><div style={{color:'var(--wz-text2)',lineHeight:1.6}}>{job.description}</div></div></div>
            <div className="wz-card"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><div className="wz-card-title" style={{marginBottom:0}}>Admin Notes</div><button className="wz-btn wz-btn-secondary wz-btn-sm" onClick={saveNotes}>Save</button></div><textarea className="wz-form-textarea" rows={5} placeholder="Internal notes, follow-ups\u2026" value={notes} onChange={e=>setNotes(e.target.value)}/></div>
            <div className="wz-card"><div className="wz-card-title">Timeline</div><InfoRow label="Created" value={formatDate(job.createdAt)}/><InfoRow label="Last Updated" value={formatDate(job.updatedAt)}/></div>
          </div>
        </div>
      </div>
    </>
  )
}
