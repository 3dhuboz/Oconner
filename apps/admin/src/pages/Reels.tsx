import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import { Plus, X, Pencil, Trash2, Film, GripVertical, ExternalLink } from 'lucide-react';
import { toast } from '../lib/toast';

interface Reel {
  id: string;
  title: string;
  subtitle: string;
  fbUrl: string;
  thumbnailUrl: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: number;
}

const EMPTY = { title: '', subtitle: '', fbUrl: '', thumbnailUrl: '' };

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<typeof EMPTY & { id?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Reel | null>(null);

  const load = () => {
    setLoading(true);
    api.get<Reel[]>('/api/reels/admin')
      .then(setReels)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing || !editing.title || !editing.fbUrl) {
      toast('Title and Facebook URL are required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await api.patch(`/api/reels/${editing.id}`, {
          title: editing.title,
          subtitle: editing.subtitle,
          fbUrl: editing.fbUrl,
          thumbnailUrl: editing.thumbnailUrl || null,
        });
        toast('Reel updated');
      } else {
        await api.post('/api/reels', {
          title: editing.title,
          subtitle: editing.subtitle,
          fbUrl: editing.fbUrl,
          thumbnailUrl: editing.thumbnailUrl || null,
          displayOrder: reels.length,
        });
        toast('Reel added');
      }
      setEditing(null);
      load();
    } catch {
      toast('Failed to save reel', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/api/reels/${deleteConfirm.id}`);
      setReels((prev) => prev.filter((r) => r.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      toast('Reel deleted');
    } catch {
      toast('Failed to delete reel', 'error');
    }
  };

  const toggleActive = async (reel: Reel) => {
    try {
      await api.patch(`/api/reels/${reel.id}`, { active: !reel.active });
      setReels((prev) => prev.map((r) => r.id === reel.id ? { ...r, active: !r.active } : r));
    } catch {
      toast('Failed to update', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand flex items-center gap-2">
            <Film className="h-6 w-6" /> Reels
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage Facebook reels shown on the homepage.</p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Reel
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Film className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No reels yet</p>
            <p className="text-sm mt-1">Add a Facebook reel URL to show on the homepage.</p>
          </div>
        ) : (
          <div className="divide-y">
            {reels.map((reel) => (
              <div key={reel.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                {reel.thumbnailUrl ? (
                  <img src={reel.thumbnailUrl} alt={reel.title} className="w-16 h-24 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                ) : (
                  <div className="w-16 h-24 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Film className="h-6 w-6 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{reel.title}</p>
                  {reel.subtitle && <p className="text-xs text-gray-400">{reel.subtitle}</p>}
                  <a href={reel.fbUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                    <ExternalLink className="h-3 w-3" /> View on Facebook
                  </a>
                </div>
                <button
                  onClick={() => toggleActive(reel)}
                  className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${reel.active ? 'bg-brand' : 'bg-gray-300'}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${reel.active ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditing({ id: reel.id, title: reel.title, subtitle: reel.subtitle, fbUrl: reel.fbUrl, thumbnailUrl: reel.thumbnailUrl ?? '' })}
                    className="p-1.5 text-gray-400 hover:text-brand rounded-lg hover:bg-brand/5" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirm(reel)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
        <p className="font-medium mb-1">How to add a reel:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-blue-600">
          <li>Go to your O'Connor Agriculture Facebook page</li>
          <li>Find the reel you want to share</li>
          <li>Copy the reel URL (e.g. https://www.facebook.com/reel/123456789)</li>
          <li>Paste it here with a title</li>
        </ol>
      </div>

      {/* Edit/Add Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">{editing.id ? 'Edit Reel' : 'Add Reel'}</h2>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Title *</label>
                <input value={editing.title} onChange={(e) => setEditing((p) => p ? { ...p, title: e.target.value } : p)}
                  placeholder="e.g. Life on the Farm" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Subtitle</label>
                <input value={editing.subtitle} onChange={(e) => setEditing((p) => p ? { ...p, subtitle: e.target.value } : p)}
                  placeholder="e.g. Boyne Valley, QLD" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Facebook Reel URL *</label>
                <input value={editing.fbUrl} onChange={(e) => setEditing((p) => p ? { ...p, fbUrl: e.target.value } : p)}
                  placeholder="https://www.facebook.com/reel/123456789" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Thumbnail URL (optional)</label>
                <input value={editing.thumbnailUrl} onChange={(e) => setEditing((p) => p ? { ...p, thumbnailUrl: e.target.value } : p)}
                  placeholder="https://..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                <p className="text-xs text-gray-400 mt-1">Leave blank to show a default thumbnail</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditing(null)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : editing.id ? 'Save Changes' : 'Add Reel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="font-semibold text-lg mb-2">Delete Reel?</h2>
            <p className="text-sm text-gray-500 mb-5">Remove <strong>{deleteConfirm.title}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
