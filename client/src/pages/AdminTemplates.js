import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Rocket, RefreshCw, Loader2, ExternalLink, GitBranch,
  Users, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Edit,
  Globe, Zap, Sparkles, Palette, Clock, Send
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import './Admin.css';

const APP_META = {
  'foodtruc':         { icon: Zap,      color: '#f59e0b', label: 'Food Truck',       desc: 'Mobile ordering, menu, loyalty & admin' },
  'social-ai-studio': { icon: Sparkles, color: '#a855f7', label: 'SocialAI Studio',  desc: 'AI-driven social media content & scheduling' },
  'simple-website':   { icon: Globe,    color: '#10b981', label: 'SimpleWebsite',     desc: 'White-label e-commerce storefront' },
  'wirez':            { icon: Zap,      color: '#f97316', label: 'Wirez',             desc: 'Electrician job & workflow management' },
  'autohue':          { icon: Palette,  color: '#06b6d4', label: 'AutoHue',           desc: 'AI vehicle photo colour sorter' },
};

const LS_KEY = 'pw_local_project_root';

const AdminTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState({});
  const [pushing, setPushing]     = useState({});
  const [updateLogs, setUpdateLogs] = useState({});
  const [localRoot, setLocalRoot] = useState(() => localStorage.getItem(LS_KEY) || '');
  const [showPathModal, setShowPathModal] = useState(false);
  const [pathInput, setPathInput] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/scaffold/templates/list');
      setTemplates(res.data);
    } catch (err) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const buildWindsurfUri = (localPath) => {
    if (!localPath) return null;
    const normalized = localPath.replace(/\\/g, '/');
    const encoded = normalized.split('/').map(s => encodeURIComponent(s)).join('/');
    return 'windsurf://file/' + encoded;
  };

  const saveLocalRoot = (val) => {
    const trimmed = val.trim();
    localStorage.setItem(LS_KEY, trimmed);
    setLocalRoot(trimmed);
    setShowPathModal(false);
    return trimmed;
  };

  const openTemplate = (slug) => {
    const root = localRoot || localStorage.getItem(LS_KEY) || '';
    if (!root) {
      setPathInput('');
      setShowPathModal(true);
      return;
    }
    // All templates are pennywise-module — they all live in the monorepo root
    const uri = buildWindsurfUri(root);
    if (uri) {
      window.location.href = uri;
    } else {
      toast.error('Could not build Windsurf URI — check the saved path in settings.');
    }
  };

  const pushUpdate = async (slug) => {
    const tpl = templates.find(t => t.slug === slug);
    if (!tpl) return;
    if (!window.confirm(
      `Push "${APP_META[slug]?.label || slug}" template updates to ${tpl.scaffoldedCount} client project(s)?\n\n` +
      `This will:\n• Fetch latest code from the template repo\n• Safe-merge into each client's project\n` +
      `• Preserve all client env files, branding & custom scripts\n• Push to each client's remote (if configured)\n\nContinue?`
    )) return;

    setPushing(prev => ({ ...prev, [slug]: true }));
    setUpdateLogs(prev => ({ ...prev, [slug]: null }));
    try {
      const res = await api.post(`/scaffold/push-update/${slug}`);
      setUpdateLogs(prev => ({ ...prev, [slug]: res.data }));
      const success = res.data.results?.filter(r => r.status === 'success').length || 0;
      const total   = res.data.results?.length || 0;
      if (success === total && total > 0) {
        toast.success(`✓ Updated ${success}/${total} clients!`);
      } else if (success > 0) {
        toast.success(`Updated ${success}/${total} clients (${total - success} had issues — check log)`);
      } else {
        toast.error(res.data.message || 'No clients updated');
      }
      load();
    } catch (err) {
      const msg = err.response?.data?.message || 'Push update failed';
      if (msg.includes('locally')) {
        toast.error('Push Update requires the local server. Run "npm run server" on your machine, then visit localhost:5000/admin/templates to push updates.', { duration: 8000 });
      } else {
        toast.error(msg);
      }
    } finally {
      setPushing(prev => ({ ...prev, [slug]: false }));
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} className="spin" style={{ color: '#7c3aed' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#e2e8f0', padding: '2rem 1.5rem' }}>

      {/* ── Local path modal ── */}
      {showPathModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 14, padding: '1.75rem', width: '100%', maxWidth: 520 }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700 }}>Set Your Local Project Root</h3>
            <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginBottom: '1rem', lineHeight: 1.6 }}>
              Enter the full path to the folder where you keep your cloned repos on this machine.
              This is saved in your browser only — never sent to the server.
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem', fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
              Example:&nbsp; C:/Users/steve/OneDrive/Desktop/Business Folders/Pennywise/App/CascadeProjects/windsurf-project
            </p>
            <input
              autoFocus
              value={pathInput}
              onChange={e => setPathInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pathInput.trim() && saveLocalRoot(pathInput)}
              placeholder="C:/Users/steve/..."
              style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '0.625rem 0.875rem', color: 'white', fontSize: '0.875rem', fontFamily: 'monospace', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPathModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: 7, fontSize: '0.8125rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={() => pathInput.trim() && saveLocalRoot(pathInput)}
                disabled={!pathInput.trim()}
                style={{ padding: '0.5rem 1.25rem', borderRadius: 7, fontSize: '0.8125rem', fontWeight: 700, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white', border: 'none', cursor: 'pointer', opacity: pathInput.trim() ? 1 : 0.4 }}
              >Save &amp; Open</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <Link to="/admin" style={{ color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <ArrowLeft size={16} /> Admin
          </Link>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: 0 }}>
            <GitBranch size={28} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: '#7c3aed' }} />
            App Template Management
          </h1>
          <p style={{ color: '#9ca3af', marginTop: '0.5rem', marginBottom: 0 }}>
            Edit the master white-label apps in Windsurf and push updates to all client deployments safely.
          </p>
        </div>

        {/* How it works banner */}
        <div style={{ padding: '1rem 1.25rem', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 10, marginBottom: '0.75rem', fontSize: '0.8125rem', color: '#c4b5fd' }}>
          <strong style={{ color: '#a78bfa' }}>Workflow:</strong>{' '}
          Click <em>Edit in Windsurf</em> to open the master app code → make improvements → save &amp; commit →
          come back here and click <em>Push Update to Clients</em>. Client env files, branding, and custom scripts are
          <strong> always preserved</strong> — only app logic is updated.
        </div>

        {/* Local path status */}
        <div style={{ padding: '0.625rem 1rem', background: localRoot ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.08)', border: `1px solid ${localRoot ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.25)'}`, borderRadius: 8, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: localRoot ? '#34d399' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {localRoot ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            <strong>Local Windsurf Path:</strong>
          </span>
          {localRoot ? (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{localRoot}</span>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>Not set — click “Edit in Windsurf” on any template to configure</span>
          )}
          <button
            onClick={() => { setPathInput(localRoot); setShowPathModal(true); }}
            style={{ padding: '0.25rem 0.625rem', borderRadius: 5, fontSize: '0.6875rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#9ca3af', cursor: 'pointer', flexShrink: 0 }}
          >
            {localRoot ? 'Change Path' : 'Set Path'}
          </button>
        </div>

        {/* Internal-only notice */}
        <div style={{ padding: '0.875rem 1.25rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, marginBottom: '2rem', fontSize: '0.8125rem', color: '#fca5a5', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🔒</span>
          <div>
            <strong style={{ color: '#f87171' }}>Pennywise IT is the internal platform — it is never offered to clients.</strong>
            {' '}When you scaffold a client project, they receive <em>only</em> the white-label apps they paid for
            (controlled by <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 0.3em', borderRadius: 3 }}>ENABLED_APPS</code> in their{' '}
            <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 0.3em', borderRadius: 3 }}>.env</code>).
            The full Pennywise admin dashboard, client management, marketplace and invoicing tools
            are <strong>not accessible</strong> in any client deployment.
          </div>
        </div>

        {/* Template cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {templates.map(tpl => {
            const meta    = APP_META[tpl.slug] || {};
            const Icon    = meta.icon || GitBranch;
            const color   = meta.color || '#7c3aed';
            const isOpen  = expanded[tpl.slug];
            const log     = updateLogs[tpl.slug];
            const isPennywiseModule = tpl.type === 'pennywise-module';

            return (
              <div key={tpl.slug} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>

                {/* Card header */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={22} style={{ color }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700 }}>{meta.label || tpl.slug}</h3>
                      <span style={{ padding: '0.125rem 0.625rem', borderRadius: 20, fontSize: '0.6875rem', fontWeight: 600, background: isPennywiseModule ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.15)', color: isPennywiseModule ? '#a78bfa' : '#6ee7b7' }}>
                        {isPennywiseModule ? 'Pennywise Module' : 'Standalone'}
                      </span>
                      {isPennywiseModule && (
                        <span style={{ padding: '0.125rem 0.625rem', borderRadius: 20, fontSize: '0.6875rem', fontWeight: 600, background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}
                          title="Clients only receive the specific apps they paid for via ENABLED_APPS — not the full Pennywise IT system">
                          🔒 Internal Template
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: '#9ca3af' }}>{meta.desc || tpl.description}</p>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.375rem', fontWeight: 800, color }}>{tpl.clientCount || 0}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>clients</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#10b981' }}>{tpl.scaffoldedCount || 0}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>scaffolded</div>
                    </div>
                  </div>
                </div>

                {/* Action bar */}
                <div style={{ padding: '0 1.5rem 1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Edit in Windsurf — all templates now have standalone repos */}
                  <button
                    onClick={() => openTemplate(tpl.slug)}
                    style={{ padding: '0.5rem 1rem', borderRadius: 7, fontSize: '0.8125rem', fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Edit size={14} /> Edit in Windsurf
                  </button>

                  {/* Push update button */}
                  <button
                    onClick={() => pushUpdate(tpl.slug)}
                    disabled={pushing[tpl.slug] || (tpl.scaffoldedCount || 0) === 0}
                    style={{ padding: '0.5rem 1rem', borderRadius: 7, fontSize: '0.8125rem', fontWeight: 700, background: pushing[tpl.slug] ? 'rgba(16,185,129,0.08)' : 'linear-gradient(135deg, #10b981, #059669)', color: pushing[tpl.slug] ? '#6ee7b7' : '#fff', border: pushing[tpl.slug] ? '1px solid rgba(16,185,129,0.3)' : 'none', cursor: (tpl.scaffoldedCount || 0) === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (tpl.scaffoldedCount || 0) === 0 ? 0.4 : 1 }}>
                    {pushing[tpl.slug] ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                    {pushing[tpl.slug] ? 'Pushing...' : `Push Update to ${tpl.scaffoldedCount || 0} Client${(tpl.scaffoldedCount || 0) !== 1 ? 's' : ''}`}
                  </button>

                  {/* Template repo link */}
                  <a
                    href={tpl.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}>
                    <GitBranch size={12} />
                    {tpl.repo.replace('https://github.com/', '')}
                  </a>

                  {/* Toggle clients */}
                  {(tpl.clientCount || 0) > 0 && (
                    <button
                      onClick={() => setExpanded(prev => ({ ...prev, [tpl.slug]: !isOpen }))}
                      style={{ padding: '0.375rem 0.625rem', borderRadius: 6, fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Users size={12} /> {isOpen ? 'Hide' : 'View'} clients {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>

                {/* Client list */}
                {isOpen && tpl.clients?.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {tpl.clients.map(client => (
                        <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 7, background: 'rgba(255,255,255,0.03)' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: client.localProjectPath ? '#10b981' : '#4b5563', flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600 }}>{client.name}</span>
                          {client.localProjectPath ? (
                            <>
                              <span style={{ fontSize: '0.6875rem', color: '#6b7280', fontFamily: 'monospace', flex: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {client.localProjectPath}
                              </span>
                              <a
                                href={buildWindsurfUri(client.localProjectPath)}
                                style={{ fontSize: '0.75rem', fontWeight: 600, color: '#93c5fd', background: 'rgba(59,130,246,0.1)', padding: '0.2rem 0.5rem', borderRadius: 5, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                                <Edit size={11} /> Open
                              </a>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#4b5563', fontStyle: 'italic' }}>Not scaffolded</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Update log */}
                {log && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <Clock size={14} style={{ color: '#9ca3af' }} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#e2e8f0' }}>Update Log — {log.message}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {log.results?.map((r, i) => (
                        <div key={i} style={{ padding: '0.75rem', borderRadius: 7, background: r.status === 'success' ? 'rgba(16,185,129,0.06)' : r.status === 'error' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${r.status === 'success' ? 'rgba(16,185,129,0.2)' : r.status === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                            {r.status === 'success' ? <CheckCircle size={14} style={{ color: '#10b981' }} /> : <AlertCircle size={14} style={{ color: '#ef4444' }} />}
                            <strong style={{ fontSize: '0.8125rem' }}>{r.clientName}</strong>
                            {r.pushed && <span style={{ fontSize: '0.6875rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>pushed live</span>}
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                            {r.messages?.map((m, j) => <li key={j}>{m}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Safety notes */}
        <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, fontSize: '0.8125rem', color: '#fcd34d' }}>
          <strong>Safe merge rules:</strong> Client <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 0.3em', borderRadius: 3 }}>.env</code>,
          {' '}<code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 0.3em', borderRadius: 3 }}>README.md</code>,
          {' '}<code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 0.3em', borderRadius: 3 }}>scripts/</code>,
          {' '}<code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 0.3em', borderRadius: 3 }}>.vscode/</code>,
          {' '}<code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 0.3em', borderRadius: 3 }}>.pennywise.json</code>{' '}
          are <strong>always preserved</strong>. A backup branch is created before every update.
          On merge conflicts, the client's version always wins — only new/changed app logic is pulled in.
        </div>
      </div>
    </div>
  );
};

export default AdminTemplates;
