import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Job, Material } from '../types';
import { MapPin, Clock, Camera, Plus, Trash2, CheckCircle2, FileText, Upload, ArrowLeft, Navigation } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGpsTracking } from '../hooks/useGpsTracking';

interface FieldPortalProps {
  jobs: Job[];
  updateJob: (id: string, updates: Partial<Job>) => void;
}

export function FieldPortal({ jobs, updateJob }: FieldPortalProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const job = jobs.find(j => j.id === id);

  // Background GPS tracking — writes location to Firestore every 30s
  useGpsTracking({
    uid: user?.uid || '',
    enabled: !!user?.uid && !!job && ['DISPATCHED', 'EXECUTION'].includes(job?.status || ''),
    intervalMs: 30_000,
  });

  const [laborHours, setLaborHours] = useState<number | ''>(job?.laborHours || '');
  const [materials, setMaterials] = useState<Material[]>(job?.materials || []);
  const [photos, setPhotos] = useState<string[]>(job?.photos || []);
  const [siteNotes, setSiteNotes] = useState(job?.siteNotes || '');

  if (!job) {
    return <div className="p-8 text-center text-slate-500">Job not found.</div>;
  }

  const handleAddMaterial = () => {
    setMaterials([...materials, { id: Math.random().toString(36).substr(2, 9), name: '', quantity: 1, cost: 0 }]);
  };

  const handleUpdateMaterial = (id: string, field: keyof Material, value: any) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotos([...photos, URL.createObjectURL(file)]);
    }
  };

  const handleSubmit = () => {
    if (!laborHours || Number(laborHours) <= 0) {
      alert("⚠️ Required: Please enter your actual labor hours.");
      return;
    }
    if (photos.length === 0) {
      alert("⚠️ Required: Please upload at least one clear photo of the switchboard, the fix, or the smoke alarm location.");
      return;
    }
    if (!siteNotes.trim()) {
      alert("⚠️ Required: Please enter site notes (e.g., hazards found, recommendations for future work, or 'All clear').");
      return;
    }

    updateJob(job.id, {
      laborHours: Number(laborHours),
      materials,
      photos,
      siteNotes,
      status: 'REVIEW'
    });
    
    alert("Job submitted successfully! The office has been notified.");
    navigate('/');
  };

  return (
    <div className="bg-slate-50 pb-4">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
        {/* Back button */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {/* Job Info Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {job.status.replace('_', ' ')}
            </span>
            <span className="text-sm font-bold text-slate-400">{job.id}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{job.title}</h2>
          
          <div className="space-y-3 mt-4 text-sm">
            <div className="flex items-start gap-3 text-slate-600">
              <MapPin className="w-5 h-5 shrink-0 text-slate-400" />
              <span>{job.propertyAddress}</span>
            </div>
            {job.scheduledDate && (
              <div className="flex items-start gap-3 text-slate-600">
                <Clock className="w-5 h-5 shrink-0 text-slate-400" />
                <span>{new Date(job.scheduledDate).toLocaleString()}</span>
              </div>
            )}
            {job.accessCodes && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                <strong className="block text-xs uppercase tracking-wider mb-1">Access Instructions</strong>
                {job.accessCodes}
              </div>
            )}
            {job.workOrderUrl && (
              <a href={job.workOrderUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors">
                <FileText className="w-4 h-4" /> View Work Order PDF
              </a>
            )}

            {/* Navigate to job address via Google Maps */}
            {job.propertyAddress && job.propertyAddress !== 'See email body' && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.propertyAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md shadow-blue-600/20 active:scale-[0.98]"
              >
                <Navigation className="w-5 h-5" /> Navigate to Job
              </a>
            )}
          </div>
        </div>

        {job.status === 'DISPATCHED' && (
          <button 
            onClick={() => updateJob(job.id, { status: 'EXECUTION' })}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
          >
            Start Job (Check-In)
          </button>
        )}

        {['EXECUTION', 'REVIEW', 'CLOSED'].includes(job.status) && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">5</div>
              <h3 className="text-lg font-bold text-slate-900">Work Completion</h3>
            </div>

            {/* Labor */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Labor Hours <span className="text-rose-500">*</span>
              </label>
              <input 
                type="number" 
                step="0.5"
                min="0"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-lg font-medium"
                placeholder="Actual time spent (e.g. 2.5)"
                value={laborHours}
                onChange={e => setLaborHours(e.target.value ? Number(e.target.value) : '')}
                disabled={job.status !== 'EXECUTION'}
              />
            </div>

            {/* Materials */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-slate-700">Materials Used</label>
                {job.status === 'EXECUTION' && (
                  <button onClick={handleAddMaterial} className="text-blue-600 text-sm font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {materials.map((material, index) => (
                  <div key={material.id} className="flex gap-2 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text" placeholder="Part name/description" 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        value={material.name}
                        onChange={e => handleUpdateMaterial(material.id, 'name', e.target.value)}
                        disabled={job.status !== 'EXECUTION'}
                      />
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Qty:</span>
                          <input 
                            type="number" min="1"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            value={material.quantity}
                            onChange={e => handleUpdateMaterial(material.id, 'quantity', Number(e.target.value))}
                            disabled={job.status !== 'EXECUTION'}
                          />
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Cost $:</span>
                          <input 
                            type="number" min="0" step="0.01"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            value={material.cost}
                            onChange={e => handleUpdateMaterial(material.id, 'cost', Number(e.target.value))}
                            disabled={job.status !== 'EXECUTION'}
                          />
                        </div>
                      </div>
                    </div>
                    {job.status === 'EXECUTION' && (
                      <button onClick={() => handleRemoveMaterial(material.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg mt-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {materials.length === 0 && (
                  <p className="text-sm text-slate-500 italic">No materials added.</p>
                )}
              </div>
            </div>

            {/* Photos */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Site Photos <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-3">Clear shots of the switchboard, the fix, or the specific smoke alarm location.</p>
              <div className="grid grid-cols-3 gap-3">
                {photos.map((url, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-200 relative group">
                    <img src={url} alt="Site" className="w-full h-full object-cover" />
                  </div>
                ))}
                {job.status === 'EXECUTION' && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer">
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium">Add Photo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Site Notes / Recommendations <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-3">Any hazards found or recommendations for future work.</p>
              <textarea 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm min-h-[100px]"
                placeholder="Enter your site notes here..."
                value={siteNotes}
                onChange={e => setSiteNotes(e.target.value)}
                disabled={job.status !== 'EXECUTION'}
              />
            </div>

            {job.status === 'EXECUTION' && (
              <button 
                onClick={handleSubmit}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-6 h-6" />
                Submit Job to Office
              </button>
            )}
            
            {job.status === 'REVIEW' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-center font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Job submitted for Admin Review
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
