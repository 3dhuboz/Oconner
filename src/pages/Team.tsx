import React, { useState } from 'react';
import { Electrician } from '../types';
import { Users, Plus, Save, X, Phone, Mail, Trash2, ChevronDown, ChevronUp, Car, Shield, Contact, FileText } from 'lucide-react';
import { electriciansApi } from '../services/api';
import toast from 'react-hot-toast';

interface TeamProps {
  electricians: Electrician[];
  setElectricians: React.Dispatch<React.SetStateAction<Electrician[]>>;
}

export function Team({ electricians, setElectricians }: TeamProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Electrician>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const normalisePhone = (raw: string): string => {
    const digits = raw.replace(/[\s\-().+]/g, '');
    if (raw.startsWith('+')) return raw.replace(/\s/g, '');
    if (digits.startsWith('61') && digits.length === 11) return `+${digits}`;
    if (digits.startsWith('0') && digits.length === 10) return `+61${digits.slice(1)}`;
    return raw.trim();
  };

  const handleSave = async () => {
    if (!editForm.name?.trim() || !editForm.phone?.trim()) {
      toast.error('Name and phone are required.');
      return;
    }
    const normalisedPhone = normalisePhone(editForm.phone);
    setSaving(true);
    try {
      const data = {
        ...editForm,
        name: editForm.name.trim(),
        phone: normalisedPhone,
        email: editForm.email?.trim() || '',
      };
      if (isAdding) {
        const newElectrician: Electrician = { id: `e${Date.now()}`, ...data } as Electrician;
        await electriciansApi.create(newElectrician);
        setElectricians(prev => [...prev, newElectrician]);
        toast.success(`${newElectrician.name} added`);
        setIsAdding(false);
      } else if (editingId) {
        await electriciansApi.update(editingId, data);
        setElectricians(prev => prev.map(e => e.id === editingId ? { ...e, ...data } : e));
        toast.success('Technician updated');
        setEditingId(null);
      }
      setEditForm({});
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (electrician: Electrician) => {
    if (!window.confirm(`Remove ${electrician.name} from the team?`)) return;
    try {
      await electriciansApi.delete(electrician.id);
      setElectricians(prev => prev.filter(e => e.id !== electrician.id));
      toast.success(`${electrician.name} removed`);
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({});
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setEditForm({ name: '', phone: '', email: '', licenceNumber: '', carMake: '', carModel: '', carRego: '', driversLicence: '' });
  };

  const startEdit = (e: Electrician) => {
    setEditingId(e.id);
    setIsAdding(false);
    setEditForm({ ...e });
    setExpandedId(e.id);
  };

  const inputCls = 'px-3 py-2 border border-slate-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
  const labelCls = 'text-xs font-medium text-slate-500 mb-1';

  const renderForm = () => (
    <div className="space-y-4">
      {/* Row 1: Basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Full Name *</label>
          <input type="text" placeholder="e.g. John Smith" className={inputCls}
            value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
        </div>
        <div>
          <label className={labelCls}>Phone (for SMS) *</label>
          <input type="text" placeholder="04XX XXX XXX" className={inputCls}
            value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" placeholder="john@example.com" className={inputCls}
            value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
        </div>
      </div>

      {/* Row 2: Licence info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Electrical Licence #</label>
          <input type="text" placeholder="e.g. 12345678" className={inputCls}
            value={editForm.licenceNumber || ''} onChange={e => setEditForm({...editForm, licenceNumber: e.target.value})} />
        </div>
        <div>
          <label className={labelCls}>Licence Expiry</label>
          <input type="date" className={inputCls}
            value={editForm.licenceExpiry || ''} onChange={e => setEditForm({...editForm, licenceExpiry: e.target.value})} />
        </div>
        <div>
          <label className={labelCls}>Drivers Licence #</label>
          <input type="text" placeholder="e.g. DL123456" className={inputCls}
            value={editForm.driversLicence || ''} onChange={e => setEditForm({...editForm, driversLicence: e.target.value})} />
        </div>
      </div>

      {/* Row 3: Vehicle info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Car Make</label>
          <input type="text" placeholder="e.g. Toyota" className={inputCls}
            value={editForm.carMake || ''} onChange={e => setEditForm({...editForm, carMake: e.target.value})} />
        </div>
        <div>
          <label className={labelCls}>Car Model</label>
          <input type="text" placeholder="e.g. HiLux" className={inputCls}
            value={editForm.carModel || ''} onChange={e => setEditForm({...editForm, carModel: e.target.value})} />
        </div>
        <div>
          <label className={labelCls}>Registration</label>
          <input type="text" placeholder="e.g. ABC123" className={inputCls}
            value={editForm.carRego || ''} onChange={e => setEditForm({...editForm, carRego: e.target.value})} />
        </div>
      </div>

      {/* Row 4: Emergency contact + notes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Emergency Contact Name</label>
          <input type="text" placeholder="e.g. Jane Smith" className={inputCls}
            value={editForm.emergencyContactName || ''} onChange={e => setEditForm({...editForm, emergencyContactName: e.target.value})} />
        </div>
        <div>
          <label className={labelCls}>Emergency Contact Phone</label>
          <input type="text" placeholder="04XX XXX XXX" className={inputCls}
            value={editForm.emergencyContactPhone || ''} onChange={e => setEditForm({...editForm, emergencyContactPhone: e.target.value})} />
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <input type="text" placeholder="Any notes..." className={inputCls}
            value={editForm.notes || ''} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={handleCancel}
          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-500 mt-1">Manage your electricians, licences, and vehicles.</p>
        </div>
        <button onClick={startAdd} disabled={isAdding}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50">
          <Plus className="w-4 h-4" /> Add Electrician
        </button>
      </div>

      <div className="space-y-4">
        {isAdding && (
          <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">New Electrician</h3>
            {renderForm()}
          </div>
        )}

        {electricians.map(elec => {
          const isEditing = editingId === elec.id;
          const isExpanded = expandedId === elec.id;

          return (
            <div key={elec.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Header row */}
              <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => !isEditing && setExpandedId(isExpanded ? null : elec.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{elec.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {elec.phone}</span>
                      {elec.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {elec.email}</span>}
                      {elec.licenceNumber && <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Lic: {elec.licenceNumber}</span>}
                      {elec.carRego && <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {elec.carMake} {elec.carModel} ({elec.carRego})</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); startEdit(elec); }}
                        className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm">
                        Edit
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(elec); }}
                        className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </>
                  )}
                </div>
              </div>

              {/* Expanded detail / edit form */}
              {(isExpanded || isEditing) && (
                <div className="border-t border-slate-100 p-5 bg-slate-50">
                  {isEditing ? renderForm() : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                      <div>
                        <h4 className="font-semibold text-slate-700 flex items-center gap-1 mb-2"><Shield className="w-4 h-4" /> Licences</h4>
                        <div className="space-y-1 text-slate-600">
                          <p>Electrical: {elec.licenceNumber || '—'}</p>
                          <p>Expiry: {elec.licenceExpiry || '—'}</p>
                          <p>Drivers: {elec.driversLicence || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-700 flex items-center gap-1 mb-2"><Car className="w-4 h-4" /> Vehicle</h4>
                        <div className="space-y-1 text-slate-600">
                          <p>{elec.carMake || '—'} {elec.carModel || ''}</p>
                          <p>Rego: {elec.carRego || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-700 flex items-center gap-1 mb-2"><Contact className="w-4 h-4" /> Emergency Contact</h4>
                        <div className="space-y-1 text-slate-600">
                          <p>{elec.emergencyContactName || '—'}</p>
                          <p>{elec.emergencyContactPhone || '—'}</p>
                        </div>
                        {elec.notes && (
                          <div className="mt-3">
                            <h4 className="font-semibold text-slate-700 flex items-center gap-1 mb-1"><FileText className="w-4 h-4" /> Notes</h4>
                            <p className="text-slate-600">{elec.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {electricians.length === 0 && !isAdding && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            No electricians added yet. Click "Add Electrician" to get started.
          </div>
        )}
      </div>
    </div>
  );
}
