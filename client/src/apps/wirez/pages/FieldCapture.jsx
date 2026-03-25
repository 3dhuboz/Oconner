import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJob, updateJob, uploadPhoto } from '../firebase'
import { useToast } from '../App'

export default function FieldCapture() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef(null)

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [labourHours, setLabourHours] = useState('')
  const [labourRate, setLabourRate] = useState('120')
  const [materials, setMaterials] = useState([{ description: '', qty: 1, unitCost: '' }])
  const [siteNotes, setSiteNotes] = useState('')
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    getJob(jobId).then(data => {
      setJob(data)
      if (data?.fieldData) {
        const fd = data.fieldData
        setLabourHours(fd.labourHours || '')
        setLabourRate(fd.labourRate || '120')
        setMaterials(fd.materials?.length ? fd.materials : [{ description: '', qty: 1, unitCost: '' }])
        setSiteNotes(fd.siteNotes || '')
        setPhotos(fd.photos?.map(url => ({ url, name: url.split('/').pop()?.split('?')[0] || 'photo' })) || [])
      }
      setLoading(false)
    })
  }, [jobId])

  function addMaterial() { setMaterials(prev => [...prev, { description: '', qty: 1, unitCost: '' }]) }
  function removeMaterial(i) { setMaterials(prev => prev.filter((_, idx) => idx !== i)) }
  function updateMaterial(i, field, value) { setMaterials(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m)) }

  async function handlePickPhotos() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const url = await uploadPhoto(jobId, file)
        setPhotos(prev => [...prev, { url, name: file.name }])
        toast('Uploaded: ' + file.name, 'success')
      }
    } catch (err) {
      toast('Upload failed: ' + err.message, 'error')
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleSave(markComplete = false) {
    setSaving(true)
    try {
      const fieldData = {
        labourHours: parseFloat(labourHours) || 0,
        labourRate: parseFloat(labourRate) || 120,
        materials: materials.filter(m => m.description.trim()),
        siteNotes,
        photos: photos.map(p => p.url),
      }
      const updates = { fieldData }
      if (markComplete) updates.status = 'complete'
      await updateJob(jobId, updates)
      toast(markComplete ? 'Job marked complete! Head to Xero to invoice.' : 'Field data saved', 'success')
      if (markComplete) navigate('/jobs/' + jobId)
    } catch (err) { toast(err.message, 'error') }
    setSaving(false)
  }

  if (loading) return <div className="wz-loading"><div className="wz-spinner" /> Loading...</div>
  if (!job) return <div className="wz-loading">Job not found</div>

  const labourTotal = (parseFloat(labourHours) || 0) * (parseFloat(labourRate) || 0)
  const materialsTotal = materials.reduce((sum, m) => sum + ((parseFloat(m.qty) || 0) * (parseFloat(m.unitCost) || 0)), 0)
  const total = labourTotal + materialsTotal

  return (
    <>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept="image/*" onChange={handleFileChange} />
      <div className="wz-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="wz-btn wz-btn-secondary wz-btn-sm" onClick={() => navigate('/jobs/' + jobId)}>{'\u2190'} Back</button>
            <div className="wz-page-title">Field Capture</div>
          </div>
          <div className="wz-page-subtitle">{job.jobNumber} {'\u00B7'} {job.property?.address}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="wz-btn wz-btn-secondary" onClick={() => handleSave(false)} disabled={saving}>{saving ? 'Saving...' : '\uD83D\uDCBE Save Draft'}</button>
          <button className="wz-btn wz-btn-success" onClick={() => handleSave(true)} disabled={saving}>{'\u2705'} Save & Complete</button>
        </div>
      </div>
      <div className="wz-page-body">
        <div className="wz-two-col" style={{ alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="wz-card">
              <div className="wz-card-title">Labour</div>
              <div className="wz-form-row">
                <div className="wz-form-group" style={{ marginBottom: 0 }}>
                  <label className="wz-form-label">Hours on Site</label>
                  <input className="wz-form-input" type="number" min="0" step="0.25" placeholder="2.5" value={labourHours} onChange={e => setLabourHours(e.target.value)} />
                </div>
                <div className="wz-form-group" style={{ marginBottom: 0 }}>
                  <label className="wz-form-label">Hourly Rate ($)</label>
                  <input className="wz-form-input" type="number" min="0" step="5" value={labourRate} onChange={e => setLabourRate(e.target.value)} />
                </div>
              </div>
              {labourHours && <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--wz-bg3)', borderRadius: 'var(--wz-radius)', fontSize: 13 }}>Labour subtotal: <strong style={{ color: 'var(--wz-accent)' }}>${labourTotal.toFixed(2)}</strong></div>}
            </div>
            <div className="wz-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="wz-card-title" style={{ marginBottom: 0 }}>Materials & Parts</div>
                <button className="wz-btn wz-btn-secondary wz-btn-sm" onClick={addMaterial}>+ Add Line</button>
              </div>
              <div className="wz-table-wrap">
                <table><thead><tr><th style={{ width: '50%' }}>Description</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th /></tr></thead>
                  <tbody>{materials.map((m, i) => (
                    <tr key={i} className="wz-materials-row">
                      <td><input placeholder="e.g. 20A Clipsal switch" value={m.description} onChange={e => updateMaterial(i, 'description', e.target.value)} /></td>
                      <td><input type="number" min="1" style={{ width: 60 }} value={m.qty} onChange={e => updateMaterial(i, 'qty', e.target.value)} /></td>
                      <td><input type="number" min="0" step="0.01" placeholder="0.00" style={{ width: 80 }} value={m.unitCost} onChange={e => updateMaterial(i, 'unitCost', e.target.value)} /></td>
                      <td style={{ color: 'var(--wz-text2)', fontFamily: 'monospace' }}>${((parseFloat(m.qty) || 0) * (parseFloat(m.unitCost) || 0)).toFixed(2)}</td>
                      <td><button className="wz-btn wz-btn-danger wz-btn-sm wz-btn-icon" onClick={() => removeMaterial(i)}>{'\u2715'}</button></td>
                    </tr>))}</tbody></table>
              </div>
              {materials.some(m => m.description) && <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--wz-bg3)', borderRadius: 'var(--wz-radius)', fontSize: 13 }}>Materials subtotal: <strong style={{ color: 'var(--wz-accent)' }}>${materialsTotal.toFixed(2)}</strong></div>}
            </div>
            {total > 0 && <div className="wz-card" style={{ borderColor: 'rgba(245,166,35,0.4)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 14, color: 'var(--wz-text2)' }}>Estimated Invoice Total (excl. GST)</div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--wz-accent)' }}>${total.toFixed(2)}</div></div></div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="wz-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="wz-card-title" style={{ marginBottom: 0 }}>Site Photos</div>
                <button className="wz-btn wz-btn-secondary wz-btn-sm" onClick={handlePickPhotos} disabled={uploading}>{uploading ? 'Uploading...' : '\uD83D\uDCF7 Add Photos'}</button>
              </div>
              {photos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px', border: '2px dashed var(--wz-border)', borderRadius: 'var(--wz-radius)', color: 'var(--wz-text3)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{'\uD83D\uDCF7'}</div><div>No photos yet</div><div style={{ fontSize: 12, marginTop: 4 }}>Switchboard, repairs, smoke alarm locations</div>
                </div>
              ) : (
                <div className="wz-photo-grid">{photos.map((p, i) => (<div key={i} className="wz-photo-thumb" onClick={() => window.open(p.url, '_blank')}><img src={p.url} alt={p.name} loading="lazy" /></div>))}</div>
              )}
            </div>
            <div className="wz-card">
              <div className="wz-card-title">Site Notes</div>
              <textarea className="wz-form-textarea" rows={6} placeholder="Hazards found, recommendations, access issues..." value={siteNotes} onChange={e => setSiteNotes(e.target.value)} />
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--wz-text3)' }}>These notes will be reviewed by admin before invoicing.</div>
            </div>
            <div className="wz-card">
              <div className="wz-card-title">Pre-Departure Checklist</div>
              {['Labour hours entered accurately', 'All materials and parts listed', 'Photos of switchboard uploaded', 'Photo of completed work uploaded', 'Smoke alarm locations photographed (if applicable)', 'Site notes completed'].map((item, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 5 ? '1px solid rgba(42,48,71,0.4)' : 'none', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--wz-accent)', width: 15, height: 15, cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: 'var(--wz-text2)' }}>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
