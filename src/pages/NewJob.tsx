import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Job, JobType, Electrician } from '../types';
import { jobsApi } from '../services/api';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

interface NewJobProps {
  electricians: Electrician[];
}

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'GENERAL_REPAIR', label: 'General Repair / Electrical Fault' },
  { value: 'SMOKE_ALARM', label: 'Smoke Alarm Service' },
  { value: 'INSTALLATION', label: 'Installation' },
];

export function NewJob({ electricians }: NewJobProps) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    tenantName: '',
    tenantPhone: '',
    tenantEmail: '',
    propertyAddress: '',
    propertyManagerEmail: '',
    type: 'GENERAL_REPAIR' as JobType,
    urgency: 'Routine',
    description: '',
    accessCodes: '',
    assignedElectricianId: '',
    scheduledDate: '',
  });

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tenantName.trim() || !form.propertyAddress.trim()) {
      toast.error('Tenant name and property address are required.');
      return;
    }
    setSaving(true);
    try {
      const id = `WO-${Date.now()}`;
      const now = new Date().toISOString();
      const newJob: Job = {
        id,
        title: `${form.type.replace('_', ' ')} — ${form.propertyAddress}`,
        type: form.type,
        status: 'INTAKE',
        createdAt: now,
        tenantName: form.tenantName.trim(),
        tenantPhone: form.tenantPhone.trim(),
        tenantEmail: form.tenantEmail.trim(),
        propertyAddress: form.propertyAddress.trim(),
        propertyManagerEmail: form.propertyManagerEmail.trim() || undefined,
        contactAttempts: [],
        materials: [],
        photos: [],
        urgency: form.urgency || undefined,
        description: form.description.trim() || undefined,
        accessCodes: form.accessCodes.trim() || undefined,
        assignedElectricianId: form.assignedElectricianId || undefined,
        scheduledDate: form.scheduledDate ? new Date(form.scheduledDate).toISOString() : undefined,
        source: 'manual',
      };

      await jobsApi.create(newJob);
      toast.success(`Work order ${id} created`);
      navigate(`/jobs/${id}`);
    } catch (err: any) {
      toast.error(`Failed to create job: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">New Work Order</h1>
              <p className="text-sm text-slate-500">Fill in the details below to create a job</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">

          {/* Section: Tenant */}
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
              Tenant Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Property Address <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={form.propertyAddress}
                  onChange={e => set('propertyAddress', e.target.value)}
                  placeholder="123 Main St, Brisbane QLD 4000"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tenant Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={form.tenantName}
                  onChange={e => set('tenantName', e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tenant Phone</label>
                <input
                  type="tel"
                  value={form.tenantPhone}
                  onChange={e => set('tenantPhone', e.target.value)}
                  placeholder="0412 345 678"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tenant Email</label>
                <input
                  type="email"
                  value={form.tenantEmail}
                  onChange={e => set('tenantEmail', e.target.value)}
                  placeholder="tenant@email.com"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Property Manager Email</label>
                <input
                  type="email"
                  value={form.propertyManagerEmail}
                  onChange={e => set('propertyManagerEmail', e.target.value)}
                  placeholder="manager@agency.com.au"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Job Details */}
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">2</span>
              Job Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Job Type</label>
                <select
                  value={form.type}
                  onChange={e => set('type', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                >
                  {JOB_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Urgency</label>
                <select
                  value={form.urgency}
                  onChange={e => set('urgency', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                >
                  <option value="Routine">Routine — within 5–7 business days</option>
                  <option value="Urgent">Urgent — within 24–48 hours</option>
                  <option value="Emergency">Emergency — immediate response</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Description of Issue</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={3}
                  placeholder="Describe the issue in detail..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Access Codes / Instructions</label>
                <input
                  type="text"
                  value={form.accessCodes}
                  onChange={e => set('accessCodes', e.target.value)}
                  placeholder="e.g. Lockbox code 1234, key under mat..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Scheduling (optional) */}
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-[#E8862A] flex items-center justify-center text-xs font-bold">3</span>
              Scheduling <span className="text-xs font-normal text-slate-400 normal-case tracking-normal ml-1">(optional — can be set later)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Assign Technician</label>
                <select
                  value={form.assignedElectricianId}
                  onChange={e => set('assignedElectricianId', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                >
                  <option value="">Unassigned</option>
                  {electricians.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Preferred Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.scheduledDate}
                  onChange={e => set('scheduledDate', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none px-6 py-3 bg-slate-900 hover:bg-slate-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Work Order'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
