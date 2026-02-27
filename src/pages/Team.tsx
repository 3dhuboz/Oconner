import React, { useState } from 'react';
import { Electrician } from '../types';
import { Users, Plus, Edit2, Save, X, Phone, Mail, Trash2 } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface TeamProps {
  electricians: Electrician[];
  setElectricians: React.Dispatch<React.SetStateAction<Electrician[]>>;
}

export function Team({ electricians, setElectricians }: TeamProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Electrician>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleEdit = (electrician: Electrician) => {
    setEditingId(electrician.id);
    setEditForm(electrician);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!editForm.name?.trim() || !editForm.phone?.trim()) {
      toast.error('Name and phone are required.');
      return;
    }
    if (!db) { toast.error('Database not connected'); return; }

    setSaving(true);
    try {
      if (isAdding) {
        const newElectrician: Electrician = {
          id: `e${Date.now()}`,
          name: editForm.name.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email?.trim() || '',
        };
        await setDoc(doc(db, 'electricians', newElectrician.id), newElectrician);
        toast.success(`${newElectrician.name} added to team`);
        setIsAdding(false);
      } else if (editingId) {
        const updated = { name: editForm.name.trim(), phone: editForm.phone.trim(), email: editForm.email?.trim() || '' };
        await updateDoc(doc(db, 'electricians', editingId), updated);
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
    if (!db) { toast.error('Database not connected'); return; }
    if (!window.confirm(`Remove ${electrician.name} from the team? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'electricians', electrician.id));
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
    setEditForm({ name: '', phone: '', email: '' });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-500 mt-1">Manage your electricians and dispatch contacts.</p>
        </div>
        <button 
          onClick={startAdd}
          disabled={isAdding}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add Electrician
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-slate-200">
          {isAdding && (
            <div className="p-6 bg-slate-50 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                <input 
                  type="text" placeholder="Full Name" 
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-full"
                  value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})}
                />
                <input 
                  type="text" placeholder="Phone Number (for SMS)" 
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-full"
                  value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                />
                <input 
                  type="email" placeholder="Email Address" 
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-full"
                  value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})}
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={handleSave} disabled={saving} className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors disabled:opacity-50"><Save className="w-5 h-5" /></button>
                <button onClick={handleCancel} className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>
          )}

          {electricians.map(electrician => (
            <div key={electrician.id} className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-slate-50 transition-colors">
              {editingId === electrician.id ? (
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                  <input 
                    type="text" 
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-full"
                    value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})}
                  />
                  <input 
                    type="text" 
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-full"
                    value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  />
                  <input 
                    type="email" 
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-full"
                    value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{electrician.name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {electrician.phone}</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {electrician.email}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 shrink-0">
                {editingId === electrician.id ? (
                  <>
                    <button onClick={handleSave} disabled={saving} className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors disabled:opacity-50"><Save className="w-5 h-5" /></button>
                    <button onClick={handleCancel} className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEdit(electrician)} className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(electrician)} className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          
          {electricians.length === 0 && !isAdding && (
            <div className="p-8 text-center text-slate-500">
              No electricians added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
