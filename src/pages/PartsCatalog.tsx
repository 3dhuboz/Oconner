import React, { useState } from 'react';
import { CatalogPart } from '../types';
import { Plus, Trash2, Package, Search, Edit2, Check, X } from 'lucide-react';
import { cn } from '../utils';

interface PartsCatalogProps {
  parts: CatalogPart[];
  setParts: React.Dispatch<React.SetStateAction<CatalogPart[]>>;
}

const DEFAULT_CATEGORIES = ['General', 'Cabling', 'Switchboard', 'Smoke Alarm', 'Lighting', 'Safety', 'Other'];

export function PartsCatalog({ parts, setParts }: PartsCatalogProps) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New part form
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState<number | ''>('');
  const [newCategory, setNewCategory] = useState('General');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editCost, setEditCost] = useState<number | ''>('');
  const [editCategory, setEditCategory] = useState('');

  const filteredParts = parts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(parts.map(p => p.category || 'General'))].sort();

  const handleAdd = () => {
    if (!newName.trim()) return;
    const part: CatalogPart = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName.trim(),
      defaultCost: Number(newCost) || 0,
      category: newCategory,
    };
    setParts(prev => [...prev, part]);
    setNewName('');
    setNewCost('');
    setNewCategory('General');
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this part from the catalog?')) {
      setParts(prev => prev.filter(p => p.id !== id));
    }
  };

  const startEdit = (part: CatalogPart) => {
    setEditingId(part.id);
    setEditName(part.name);
    setEditCost(part.defaultCost);
    setEditCategory(part.category || 'General');
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    setParts(prev => prev.map(p => p.id === editingId ? {
      ...p,
      name: editName.trim(),
      defaultCost: Number(editCost) || 0,
      category: editCategory,
    } : p));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" /> Parts Catalog
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {parts.length} part{parts.length !== 1 ? 's' : ''} &bull; Technicians can quick-add these on site
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" /> Add Part
        </button>
      </div>

      {/* Add Part Form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">New Part</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Part Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. 10A Circuit Breaker"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Default Cost ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newCost}
                onChange={e => setNewCost(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Catalog
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search parts..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </div>

      {/* Parts list by category */}
      {filteredParts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">{search ? 'No matching parts' : 'No parts yet'}</p>
          <p className="text-sm text-slate-400 mt-1">
            {search ? 'Try a different search' : 'Add parts that your technicians commonly use'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(search ? [''] : categories).map(cat => {
            const catParts = search
              ? filteredParts
              : filteredParts.filter(p => (p.category || 'General') === cat);
            if (catParts.length === 0) return null;

            return (
              <div key={cat || 'all'}>
                {!search && (
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">{cat}</h3>
                )}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                  {catParts.map(part => (
                    <div key={part.id} className="px-4 py-3 flex items-center gap-3">
                      {editingId === part.id ? (
                        /* Edit mode */
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editCost}
                              onChange={e => setEditCost(e.target.value ? Number(e.target.value) : '')}
                              className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
                            />
                          </div>
                          <select
                            value={editCategory}
                            onChange={e => setEditCategory(e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                          >
                            {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <div className="flex gap-1.5">
                            <button onClick={saveEdit} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Display mode */
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{part.name}</p>
                            {part.category && (
                              <p className="text-[10px] text-slate-400">{part.category}</p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-slate-700 shrink-0">
                            ${part.defaultCost.toFixed(2)}
                          </span>
                          <button
                            onClick={() => startEdit(part)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(part.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
