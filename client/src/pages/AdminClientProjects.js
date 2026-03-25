import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Search, FolderKanban, Globe, Rocket, CheckCircle,
  Circle, ChevronDown, ChevronUp, ExternalLink, Trash2, Save, Edit,
  Users, DollarSign, Server, Palette, ClipboardList, XCircle, AlertCircle,
  RefreshCw, Loader2, FolderOpen, GitMerge, Bell, X
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import './Admin.css';

const STATUS_COLORS = {
  setup: { bg: '#fef3c7', color: '#92400e', label: 'Setup' },
  active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
  suspended: { bg: '#fee2e2', color: '#991b1b', label: 'Suspended' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' }
};

const DEPLOY_COLORS = {
  not_started: { bg: '#f3f4f6', color: '#6b7280', label: 'Not Started' },
  deploying: { bg: '#dbeafe', color: '#1e40af', label: 'Deploying' },
  live: { bg: '#dcfce7', color: '#166534', label: 'Live' },
  failed: { bg: '#fee2e2', color: '#991b1b', label: 'Failed' },
  suspended: { bg: '#fef3c7', color: '#92400e', label: 'Suspended' }
};

const AdminClientProjects = () => {
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [editingLocalPath, setEditingLocalPath] = useState({});
  const [localPathDraft, setLocalPathDraft] = useState({});
  const [scaffolding, setScaffolding] = useState({});
  const [syncing, setSyncing] = useState({});
  const [pendingScaffolds, setPendingScaffolds] = useState([]);
  const [scaffoldModal, setScaffoldModal] = useState(null); // { projectId, projectName, defaultPath, apps }
  const [createForm, setCreateForm] = useState({
    clientId: '', projectName: '', businessName: '', contactName: '',
    contactEmail: '', contactPhone: '', appSlugs: [], notes: ''
  });

  const loadAll = useCallback(async () => {
    try {
      const [projRes, custRes, appsRes, statsRes, pendingRes] = await Promise.all([
        api.get('/client-projects'),
        api.get('/customers'),
        api.get('/marketplace/admin/apps').catch(() => ({ data: [] })),
        api.get('/client-projects/stats/summary').catch(() => ({ data: null })),
        api.get('/scaffold/pending').catch(() => ({ data: [] }))
      ]);
      setProjects(projRes.data);
      setCustomers(custRes.data);
      setApps(appsRes.data);
      setPendingScaffolds(pendingRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      toast.error('Failed to load projects');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh deploy status for any projects stuck in 'deploying' (poll every 30s)
  useEffect(() => {
    if (!projects.length) return;
    const deploying = projects.filter(p => p.deployment?.deployStatus === 'deploying');
    if (!deploying.length) return;
    const check = () => {
      deploying.forEach(p => {
        api.get(`/client-projects/${p._id}/deploy-status`).then(res => {
          if (res.data.status !== 'deploying') loadAll();
        }).catch(() => {});
      });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [projects.length]);

  const filtered = projects.filter(p =>
    `${p.projectName} ${p.businessName} ${p.client?.firstName} ${p.client?.lastName} ${p.client?.email}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.clientId || !createForm.projectName) {
      return toast.error('Customer and project name are required');
    }
    try {
      await api.post('/client-projects', createForm);
      toast.success('Project created! Follow the setup checklist.');
      setShowCreateModal(false);
      setCreateForm({ clientId: '', projectName: '', businessName: '', contactName: '', contactEmail: '', contactPhone: '', appSlugs: [], notes: '' });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    }
  };

  const toggleChecklist = async (projectId, stepIndex, currentVal) => {
    try {
      const res = await api.put(`/client-projects/${projectId}/checklist/${stepIndex}`, { completed: !currentVal });
      setProjects(prev => prev.map(p => p._id === projectId ? { ...p, setupChecklist: res.data.setupChecklist, status: res.data.status } : p));
    } catch (err) {
      toast.error('Failed to update checklist');
    }
  };

  // Redeploy state
  const [redeploying, setRedeploying] = useState({});
  const [redeployingAll, setRedeployingAll] = useState(false);

  const redeployProject = async (projectId, projectName) => {
    if (!window.confirm(`Redeploy ${projectName}? This triggers a fresh build from the latest code.`)) return;
    setRedeploying(prev => ({ ...prev, [projectId]: true }));
    try {
      const res = await api.post(`/client-projects/${projectId}/redeploy`);
      toast.success(res.data.message || 'Redeployment triggered');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Redeploy failed');
    }
    setRedeploying(prev => ({ ...prev, [projectId]: false }));
  };

  const redeployAll = async () => {
    if (!window.confirm('Redeploy ALL active client services? This will trigger a rebuild for every deployed project.')) return;
    setRedeployingAll(true);
    try {
      const res = await api.post('/client-projects/actions/redeploy-all');
      const { results } = res.data;
      const ok = results?.filter(r => r.success).length || 0;
      const fail = results?.filter(r => !r.success).length || 0;
      toast.success(`Redeployed ${ok} service${ok !== 1 ? 's' : ''}${fail ? `, ${fail} failed` : ''}`);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Redeploy all failed');
    }
    setRedeployingAll(false);
  };

  const checkDeployStatus = async (projectId) => {
    try {
      const res = await api.get(`/client-projects/${projectId}/deploy-status`);
      toast.success(`Status: ${res.data.status}`);
      loadAll();
    } catch (err) {
      toast.error('Failed to check status');
    }
  };

  const workLocally = async (projectId, projectName) => {
    try {
      toast.loading('Fetching env config from Render...', { id: 'local-env' });
      const res = await api.get(`/client-projects/${projectId}/local-env`);
      const { filename, envContent, runCommand, serviceUrl } = res.data;

      // Create downloadable file
      const blob = new Blob([envContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      // Copy run command to clipboard
      try { await navigator.clipboard.writeText(runCommand); } catch (e) { /* ignore */ }

      toast.success(
        `Config saved as ${filename}!\n\nRun command copied to clipboard:\n${runCommand}`,
        { id: 'local-env', duration: 8000 }
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate local config', { id: 'local-env' });
    }
  };

  // One-click deploy state
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployProject, setDeployProject] = useState(null);
  const [deployPassword, setDeployPassword] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);

  const openDeploy = (project) => {
    setDeployProject(project);
    setDeployPassword('');
    setDeployResult(null);
    setShowDeployModal(true);
  };

  const handleDeploy = async () => {
    if (!deployProject) return;
    setDeploying(true);
    try {
      const res = await api.post(`/client-projects/${deployProject._id}/deploy`, {
        adminPassword: deployPassword || undefined
      });
      setDeployResult(res.data);
      toast.success('Deployment started on Render!');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deployment failed');
      setDeployResult({ error: err.response?.data?.message || err.message });
    }
    setDeploying(false);
  };

  const updateDeployment = async (projectId, deployment) => {
    try {
      await api.put(`/client-projects/${projectId}`, { deployment });
      toast.success('Deployment info updated');
      loadAll();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const saveLocalPath = async (projectId) => {
    try {
      await api.put(`/client-projects/${projectId}`, { localProjectPath: localPathDraft[projectId] || '' });
      toast.success('Local project path saved');
      setEditingLocalPath(prev => ({ ...prev, [projectId]: false }));
      loadAll();
    } catch (err) {
      toast.error('Failed to save path');
    }
  };

  const buildWindsurfUri = (localPath) => {
    if (!localPath) return null;
    const normalized = localPath.replace(/\\/g, '/');
    const encoded = normalized.split('/').map(s => encodeURIComponent(s)).join('/');
    return 'windsurf://file/' + encoded;
  };

  const openScaffoldModal = async (projectId) => {
    try {
      const res = await api.get(`/scaffold/${projectId}/default-path`);
      setScaffoldModal({
        projectId,
        defaultPath: res.data.existingPath || res.data.defaultPath,
        clientName: res.data.clientName,
        apps: res.data.apps
      });
    } catch {
      setScaffoldModal({ projectId, defaultPath: '', clientName: '', apps: [] });
    }
  };

  const confirmScaffold = async () => {
    if (!scaffoldModal) return;
    const { projectId, defaultPath } = scaffoldModal;
    setScaffolding(prev => ({ ...prev, [projectId]: true }));
    setScaffoldModal(null);
    try {
      const res = await api.post(`/scaffold/${projectId}`, { projectPath: defaultPath || undefined });
      if (res.data.alreadyExists) {
        toast.success('Project folder already exists — path linked!', { duration: 4000 });
      } else if (res.data.githubRepoUrl) {
        toast.success(`Scaffolded + GitHub repo created! ${res.data.githubRepoUrl}`, { duration: 8000 });
      } else {
        toast.success(`Scaffolded! Apps: ${res.data.apps?.join(', ')} (add GITHUB_TOKEN to .env to auto-create repos)`, { duration: 5000 });
      }
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Scaffold failed', { duration: 5000 });
    } finally {
      setScaffolding(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const syncAndOpen = async (projectId) => {
    setSyncing(prev => ({ ...prev, [projectId]: true }));
    try {
      const res = await api.post(`/scaffold/${projectId}/sync`);
      toast.success(res.data.lastCommit ? `Synced — ${res.data.lastCommit}` : 'Project synced', { duration: 3000 });
      if (res.data.windsurfUri) {
        setTimeout(() => { window.location.href = res.data.windsurfUri; }, 500);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Sync failed';
      toast.error(msg);
    } finally {
      setSyncing(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const updateStatus = async (projectId, status) => {
    try {
      await api.put(`/client-projects/${projectId}`, { status });
      toast.success('Status updated');
      loadAll();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const deleteProject = async (projectId) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await api.delete(`/client-projects/${projectId}`);
      toast.success('Project deleted');
      loadAll();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const toggleApp = (slug) => {
    setCreateForm(prev => ({
      ...prev,
      appSlugs: prev.appSlugs.includes(slug)
        ? prev.appSlugs.filter(s => s !== slug)
        : [...prev.appSlugs, slug]
    }));
  };

  // Auto-fill contact info when customer selected
  const onCustomerSelect = (customerId) => {
    const c = customers.find(c => c._id === customerId);
    setCreateForm(prev => ({
      ...prev,
      clientId: customerId,
      contactName: c ? `${c.firstName} ${c.lastName}` : '',
      contactEmail: c?.email || '',
      contactPhone: c?.phone || '',
      businessName: c?.company || ''
    }));
  };

  if (loading) return <div className="page-loading">Loading client projects...</div>;

  return (
    <div className="admin-page">
      {/* Path-prompt modal */}
      {scaffoldModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '1.75rem', maxWidth: 520, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800 }}>Scaffold Project</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#9ca3af' }}>
                  {scaffoldModal.clientName} — Apps: {scaffoldModal.apps?.join(', ') || 'none'}
                </p>
              </div>
              <button onClick={() => setScaffoldModal(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '0.25rem' }}><X size={18} /></button>
            </div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: '0.5rem' }}>Save project to path:</label>
            <input
              value={scaffoldModal.defaultPath}
              onChange={e => setScaffoldModal(prev => ({ ...prev, defaultPath: e.target.value }))}
              style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.8125rem', fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: '0.375rem' }}
            />
            <p style={{ fontSize: '0.6875rem', color: '#6b7280', marginBottom: '1.25rem' }}>Default follows convention: Business Folders \ Client Name \ App \ Project-Name. Change freely.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setScaffoldModal(null)} style={{ padding: '0.5rem 1.25rem', borderRadius: 7, fontSize: '0.875rem', background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmScaffold} disabled={!scaffoldModal.apps?.length} style={{ padding: '0.5rem 1.25rem', borderRadius: 7, fontSize: '0.875rem', fontWeight: 700, background: 'linear-gradient(135deg,#10b981,#3b82f6)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Rocket size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />Scaffold &amp; Open in Windsurf
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Back to Admin</Link>

        {/* Pending scaffold banner */}
        {pendingScaffolds.length > 0 && (
          <div style={{ margin: '1rem 0', padding: '0.875rem 1.25rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <Bell size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '0.1rem' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#fcd34d', fontSize: '0.875rem' }}>{pendingScaffolds.length} project{pendingScaffolds.length !== 1 ? 's' : ''} awaiting scaffold</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {pendingScaffolds.map(p => (
                  <button key={p._id} onClick={() => openScaffoldModal(p._id)}
                    style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Rocket size={11} /> {p.businessName || p.projectName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="admin-header">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderKanban size={24} style={{ color: 'var(--primary)' }} /> Client Projects
            </h1>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
              Track client deployments, onboarding progress, and white-label configs
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={redeployAll} className="btn btn-secondary" disabled={redeployingAll}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {redeployingAll ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
              {redeployingAll ? 'Deploying...' : 'Redeploy All'}
            </button>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              <Plus size={16} /> New Client Project
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="admin-stats">
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><FolderKanban size={24} /></div>
              <div className="stat-info"><strong>{stats.total}</strong><span>Total Projects</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><Rocket size={24} /></div>
              <div className="stat-info"><strong>{stats.active}</strong><span>Active</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><ClipboardList size={24} /></div>
              <div className="stat-info"><strong>{stats.setup}</strong><span>In Setup</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><DollarSign size={24} /></div>
              <div className="stat-info"><strong>${stats.totalMonthlyRevenue}</strong><span>Monthly Revenue</span></div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="tickets-toolbar card" style={{ marginBottom: '1.5rem' }}>
          <div className="search-box">
            <Search size={16} />
            <input type="text" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{filtered.length} projects</span>
        </div>

        {/* Projects List */}
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <FolderKanban size={48} style={{ color: '#4b5563', marginBottom: '1rem' }} />
            <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>No Client Projects Yet</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Create your first client project to start tracking deployments and onboarding.
            </p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              <Plus size={16} /> Create First Project
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(project => {
              const isExpanded = expandedId === project._id;
              const statusStyle = STATUS_COLORS[project.status] || STATUS_COLORS.setup;
              const deployStyle = DEPLOY_COLORS[project.deployment?.deployStatus] || DEPLOY_COLORS.not_started;
              const checklistDone = project.setupChecklist?.filter(s => s.completed).length || 0;
              const checklistTotal = project.setupChecklist?.length || 0;

              return (
                <div key={project._id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Project Header */}
                  <div
                    style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                    onClick={() => setExpandedId(isExpanded ? null : project._id)}
                  >
                    {isExpanded ? <ChevronUp size={16} style={{ color: '#9ca3af' }} /> : <ChevronDown size={16} style={{ color: '#9ca3af' }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <strong style={{ fontSize: '1rem', color: '#f3f4f6' }}>{project.projectName}</strong>
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.6875rem', fontWeight: 700, background: statusStyle.bg, color: statusStyle.color }}>
                          {statusStyle.label}
                        </span>
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.6875rem', fontWeight: 700, background: deployStyle.bg, color: deployStyle.color }}>
                          {deployStyle.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#9ca3af', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <span><Users size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{project.client?.firstName} {project.client?.lastName}</span>
                        {project.businessName && <span><Globe size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{project.businessName}</span>}
                        <span><ClipboardList size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{checklistDone}/{checklistTotal} steps</span>
                        {project.apps?.length > 0 && <span>{project.apps.map(a => a.name || a.slug).join(', ')}</span>}
                      </div>
                    </div>
                    {project.deployment?.customDomain && (
                      <a href={`https://${project.deployment.customDomain}`} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ color: '#00d4ff', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ExternalLink size={12} /> {project.deployment.customDomain}
                      </a>
                    )}
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.25rem' }}>
                        {/* Left: Checklist */}
                        <div>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ClipboardList size={16} style={{ color: '#f59e0b' }} /> Setup Checklist
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            {project.setupChecklist?.map((step, idx) => (
                              <div
                                key={idx}
                                onClick={() => toggleChecklist(project._id, idx, step.completed)}
                                style={{
                                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 0.75rem',
                                  background: step.completed ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                                  borderRadius: 6, cursor: 'pointer', border: '1px solid',
                                  borderColor: step.completed ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'
                                }}
                              >
                                {step.completed
                                  ? <CheckCircle size={16} style={{ color: '#10b981', marginTop: 1, flexShrink: 0 }} />
                                  : <Circle size={16} style={{ color: '#4b5563', marginTop: 1, flexShrink: 0 }} />
                                }
                                <span style={{
                                  fontSize: '0.8125rem', color: step.completed ? '#6ee7b7' : '#d1d5db',
                                  textDecoration: step.completed ? 'line-through' : 'none',
                                  opacity: step.completed ? 0.7 : 1
                                }}>
                                  {step.step}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Right: Deployment & Config */}
                        <div>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Server size={16} style={{ color: '#3b82f6' }} /> Deployment Info
                          </h4>
                          {!project.deployment?.serviceId && (
                            <button
                              onClick={() => openDeploy(project)}
                              className="btn btn-primary"
                              style={{ marginBottom: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', fontWeight: 700 }}
                            >
                              <Rocket size={14} /> One-Click Deploy to Render
                            </button>
                          )}
                          <DeploymentEditor project={project} onSave={updateDeployment} />

                          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f3f4f6', marginTop: '1.25rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Palette size={16} style={{ color: '#ec4899' }} /> White Label
                          </h4>
                          <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                            {project.whiteLabel?.brandName ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span><strong>Brand:</strong> {project.whiteLabel.brandName}</span>
                                {project.whiteLabel.tagline && <span><strong>Tagline:</strong> {project.whiteLabel.tagline}</span>}
                                <span><strong>Primary:</strong> <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: project.whiteLabel.primaryColor, verticalAlign: 'middle', marginRight: 4 }}></span>{project.whiteLabel.primaryColor}</span>
                              </div>
                            ) : <span style={{ color: '#4b5563' }}>Not configured yet</span>}
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                            <select
                              value={project.status}
                              onChange={e => updateStatus(project._id, e.target.value)}
                              style={{ fontSize: '0.75rem', padding: '0.375rem 0.5rem', borderRadius: 6, background: '#1e1b4b', color: '#d1d5db', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                              <option value="setup">Setup</option>
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button onClick={() => deleteProject(project._id)} className="btn btn-sm btn-danger">
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Local Development */}
                      <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(16,185,129,0.06)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#6ee7b7', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FolderOpen size={16} style={{ color: '#10b981' }} /> Local Development
                        </h4>

                        {/* Scaffold / Path Section */}
                        {!project.localProjectPath ? (
                          <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.08)', borderRadius: 8, border: '1px dashed rgba(59,130,246,0.3)', marginBottom: '0.75rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.8125rem', color: '#93c5fd', marginBottom: '0.75rem' }}>
                              {project.scaffoldPending ? '⏳ Purchase detected — ready to scaffold.' : 'No local project yet. Scaffold one from the app template to start editing in Windsurf.'}
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => openScaffoldModal(project._id)}
                                disabled={scaffolding[project._id] || !project.apps?.length}
                                style={{ padding: '0.5rem 1rem', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 700, background: project.scaffoldPending ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: scaffolding[project._id] ? 0.6 : 1 }}>
                                {scaffolding[project._id] ? <Loader2 size={14} className="spin" /> : <Rocket size={14} />}
                                {scaffolding[project._id] ? 'Scaffolding...' : 'Scaffold Project'}
                              </button>
                              <button
                                onClick={() => { setLocalPathDraft(prev => ({ ...prev, [project._id]: '' })); setEditingLocalPath(prev => ({ ...prev, [project._id]: true })); }}
                                className="btn btn-sm btn-secondary" style={{ fontSize: '0.75rem' }}>
                                <Edit size={12} /> Set Path Manually
                              </button>
                            </div>
                            {!project.apps?.length && (
                              <p style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.5rem' }}>Add apps to this project first before scaffolding.</p>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace', flex: 1 }}>{project.localProjectPath}</span>
                            <button
                              onClick={() => { setLocalPathDraft(prev => ({ ...prev, [project._id]: project.localProjectPath || '' })); setEditingLocalPath(prev => ({ ...prev, [project._id]: true })); }}
                              className="btn btn-sm btn-secondary" style={{ fontSize: '0.7rem' }}>
                              <Edit size={12} /> Edit Path
                            </button>
                          </div>
                        )}

                        {/* Inline path editor */}
                        {editingLocalPath[project._id] && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <input
                              value={localPathDraft[project._id] || ''}
                              onChange={e => setLocalPathDraft(prev => ({ ...prev, [project._id]: e.target.value }))}
                              placeholder="e.g. C:\Users\steve\OneDrive\Desktop\Business Folders\ClientName\App\project"
                              style={{ flex: 1, fontSize: '0.75rem', padding: '0.375rem 0.5rem', background: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, fontFamily: 'monospace' }}
                            />
                            <button onClick={() => saveLocalPath(project._id)} className="btn btn-sm btn-primary" style={{ fontSize: '0.7rem' }}><Save size={12} /> Save</button>
                            <button onClick={() => setEditingLocalPath(prev => ({ ...prev, [project._id]: false }))} className="btn btn-sm btn-secondary" style={{ fontSize: '0.7rem' }}>Cancel</button>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {project.localProjectPath ? (
                            <button
                              onClick={() => syncAndOpen(project._id)}
                              disabled={syncing[project._id]}
                              style={{ padding: '0.5rem 1rem', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: syncing[project._id] ? 0.7 : 1 }}>
                              {syncing[project._id] ? <Loader2 size={14} className="spin" /> : <GitMerge size={14} />}
                              {syncing[project._id] ? 'Syncing...' : 'Sync & Open in Windsurf'}
                            </button>
                          ) : (
                            <span style={{ padding: '0.5rem 1rem', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600, background: 'rgba(59,130,246,0.06)', color: '#4b5563', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Edit size={14} /> Open in Windsurf
                            </span>
                          )}
                          {project.localProjectPath && (
                            <button
                              onClick={() => openScaffoldModal(project._id)}
                              disabled={scaffolding[project._id]}
                              style={{ padding: '0.375rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              {scaffolding[project._id] ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />} Re-scaffold
                            </button>
                          )}
                          <button
                            onClick={() => workLocally(project._id, project.projectName)}
                            style={{ padding: '0.375rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <FolderKanban size={12} /> Work Locally
                          </button>
                        </div>

                        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: '0.6875rem', color: '#6b7280', fontFamily: 'monospace' }}>
                          <span style={{ color: '#9ca3af', fontFamily: 'inherit', fontWeight: 600 }}>Local test:</span>{' '}
                          CLIENT_MODE=true ENABLED_APPS={project.apps?.map(a => a.slug).join(',') || 'socialai'} BRAND_NAME="{project.businessName || project.projectName}" npm run dev
                        </div>
                      </div>

                      {/* Dev Quick Links */}
                      {project.deployment?.serviceId && (
                        <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(59,130,246,0.06)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)' }}>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#93c5fd', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Globe size={16} style={{ color: '#3b82f6' }} /> Dev Quick Links
                          </h4>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {project.deployment?.serviceUrl && (
                              <a href={project.deployment.serviceUrl} target="_blank" rel="noopener noreferrer"
                                style={{ padding: '0.375rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <ExternalLink size={12} /> Live Site
                              </a>
                            )}
                            <a href={`https://dashboard.render.com/web/${project.deployment.serviceId}`} target="_blank" rel="noopener noreferrer"
                              style={{ padding: '0.375rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <Server size={12} /> Render Dashboard
                            </a>
                            <a href={`https://dashboard.render.com/web/${project.deployment.serviceId}/env`} target="_blank" rel="noopener noreferrer"
                              style={{ padding: '0.375rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(245,158,11,0.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.25)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <Edit size={12} /> Env Vars
                            </a>
                            <a href={`https://dashboard.render.com/web/${project.deployment.serviceId}/logs`} target="_blank" rel="noopener noreferrer"
                              style={{ padding: '0.375rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(6,182,212,0.12)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.25)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <ClipboardList size={12} /> Logs
                            </a>
                            <button
                              onClick={() => redeployProject(project._id, project.projectName)}
                              disabled={redeploying[project._id]}
                              style={{ padding: '0.375rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              {redeploying[project._id] ? <Loader2 size={12} className="spin" /> : <Rocket size={12} />} Redeploy
                            </button>
                            <button
                              onClick={() => checkDeployStatus(project._id)}
                              style={{ padding: '0.375rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <RefreshCw size={12} /> Check Status
                            </button>
                            {project.deployment?.serviceUrl && (
                              <a href={`${project.deployment.serviceUrl}/login`} target="_blank" rel="noopener noreferrer"
                                style={{ padding: '0.375rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(251,191,36,0.12)', color: '#fcd34d', border: '1px solid rgba(251,191,36,0.25)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <ExternalLink size={12} /> Client Admin
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {project.notes && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Notes:</span>
                          <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.25rem' }}>{project.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '85vh', overflow: 'auto' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderKanban size={20} style={{ color: 'var(--primary)' }} /> New Client Project
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
                Create a project to track a client's white-label deployment. A setup checklist will be auto-generated.
              </p>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>Customer *</label>
                  <select required value={createForm.clientId} onChange={e => onCustomerSelect(e.target.value)}>
                    <option value="">Select a customer...</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.firstName} {c.lastName} — {c.email}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Project Name *</label>
                  <input type="text" required placeholder="e.g. Dave's Food Truck + SocialAI" value={createForm.projectName}
                    onChange={e => setCreateForm(prev => ({ ...prev, projectName: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Business Name</label>
                    <input type="text" placeholder="Client's business name" value={createForm.businessName}
                      onChange={e => setCreateForm(prev => ({ ...prev, businessName: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input type="tel" value={createForm.contactPhone}
                      onChange={e => setCreateForm(prev => ({ ...prev, contactPhone: e.target.value }))} />
                  </div>
                </div>

                {/* App Selection */}
                {apps.length > 0 && (
                  <div className="form-group">
                    <label>Apps Included</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {apps.filter(a => a.isActive).map(a => (
                        <button
                          key={a.slug}
                          type="button"
                          onClick={() => toggleApp(a.slug)}
                          style={{
                            padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600,
                            cursor: 'pointer', border: '1px solid',
                            background: createForm.appSlugs.includes(a.slug) ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                            borderColor: createForm.appSlugs.includes(a.slug) ? '#10b981' : 'rgba(255,255,255,0.1)',
                            color: createForm.appSlugs.includes(a.slug) ? '#6ee7b7' : '#9ca3af'
                          }}
                        >
                          {createForm.appSlugs.includes(a.slug) ? <CheckCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> : null}
                          {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Notes</label>
                  <textarea rows={3} placeholder="Any setup notes, special requirements..." value={createForm.notes}
                    onChange={e => setCreateForm(prev => ({ ...prev, notes: e.target.value }))} />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary"><Rocket size={14} /> Create Project</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* One-Click Deploy Modal */}
        {showDeployModal && deployProject && (
          <div className="modal-overlay" onClick={() => !deploying && setShowDeployModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Rocket size={20} style={{ color: '#8b5cf6' }} /> Deploy to Render
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                This will automatically create a new Render web service for <strong>{deployProject.projectName}</strong> with its own database and environment.
              </p>

              {!deployResult ? (
                <>
                  <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8125rem', color: '#93c5fd' }}>
                    <strong>What happens automatically:</strong>
                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <li>New Render web service created from same GitHub repo</li>
                      <li>Separate MongoDB database (same cluster, isolated data)</li>
                      <li>Unique JWT secret generated</li>
                      <li>Admin account configured with client email</li>
                      <li>Shared API keys (Gemini, Runway) passed through</li>
                    </ul>
                  </div>

                  <div className="form-group">
                    <label>Client Admin Password</label>
                    <input
                      type="text"
                      placeholder="Leave blank to auto-generate"
                      value={deployPassword}
                      onChange={e => setDeployPassword(e.target.value)}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Login email will be: {deployProject.contactEmail || deployProject.client?.email || 'N/A'}
                    </span>
                  </div>

                  <div className="modal-actions">
                    <button onClick={() => setShowDeployModal(false)} className="btn btn-secondary" disabled={deploying}>Cancel</button>
                    <button
                      onClick={handleDeploy}
                      className="btn btn-primary"
                      disabled={deploying}
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none' }}
                    >
                      {deploying ? (
                        <><span className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 6 }}></span> Deploying...</>
                      ) : (
                        <><Rocket size={14} /> Deploy Now</>
                      )}
                    </button>
                  </div>
                </>
              ) : deployResult.error ? (
                <div>
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '1rem', color: '#fca5a5', fontSize: '0.875rem' }}>
                    <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    <strong>Deployment failed:</strong> {deployResult.error}
                  </div>
                  <div className="modal-actions" style={{ marginTop: '1rem' }}>
                    <button onClick={() => setShowDeployModal(false)} className="btn btn-secondary">Close</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <CheckCircle size={20} style={{ color: '#10b981' }} />
                      <strong style={{ color: '#6ee7b7', fontSize: '0.9375rem' }}>Deployment Started!</strong>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <span><strong>Service URL:</strong> <a href={deployResult.serviceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff' }}>{deployResult.serviceUrl}</a></span>
                      <span><strong>Admin Email:</strong> {deployResult.adminEmail}</span>
                      <span><strong>Admin Password:</strong> <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>{deployResult.adminPassword}</code></span>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#fbbf24' }}>
                    <strong>Note:</strong> The service is building on Render (~5-10 min). Save the admin credentials above — you'll need them to login to the client's site.
                  </div>
                  <div className="modal-actions" style={{ marginTop: '1rem' }}>
                    <button onClick={() => setShowDeployModal(false)} className="btn btn-primary">Done</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Inline deployment editor component
const DeploymentEditor = ({ project, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(project.deployment || {});

  if (!editing) {
    const d = project.deployment || {};
    return (
      <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span><strong>Provider:</strong> {d.provider || 'Render'}</span>
          {d.serviceUrl && <span><strong>URL:</strong> <a href={d.serviceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff' }}>{d.serviceUrl} <ExternalLink size={10} /></a></span>}
          {d.customDomain && <span><strong>Domain:</strong> {d.customDomain}</span>}
          {d.repoUrl && <span><strong>Repo:</strong> <a href={d.repoUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff' }}>{d.repoUrl.split('/').slice(-1)[0]} <ExternalLink size={10} /></a></span>}
          {d.serviceName && <span><strong>Service:</strong> {d.serviceName}</span>}
        </div>
        <button onClick={() => { setForm(project.deployment || {}); setEditing(true); }} className="btn btn-sm btn-secondary" style={{ marginTop: '0.5rem' }}>
          <Edit size={12} /> Edit
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <input placeholder="Render Service URL" value={form.serviceUrl || ''} onChange={e => setForm({ ...form, serviceUrl: e.target.value })}
        style={{ fontSize: '0.75rem', padding: '0.375rem 0.5rem' }} />
      <input placeholder="Custom Domain" value={form.customDomain || ''} onChange={e => setForm({ ...form, customDomain: e.target.value })}
        style={{ fontSize: '0.75rem', padding: '0.375rem 0.5rem' }} />
      <input placeholder="GitHub Repo URL" value={form.repoUrl || ''} onChange={e => setForm({ ...form, repoUrl: e.target.value })}
        style={{ fontSize: '0.75rem', padding: '0.375rem 0.5rem' }} />
      <input placeholder="Render Service Name" value={form.serviceName || ''} onChange={e => setForm({ ...form, serviceName: e.target.value })}
        style={{ fontSize: '0.75rem', padding: '0.375rem 0.5rem' }} />
      <select value={form.deployStatus || 'not_started'} onChange={e => setForm({ ...form, deployStatus: e.target.value })}
        style={{ fontSize: '0.75rem', padding: '0.375rem 0.5rem' }}>
        <option value="not_started">Not Started</option>
        <option value="deploying">Deploying</option>
        <option value="live">Live</option>
        <option value="failed">Failed</option>
        <option value="suspended">Suspended</option>
      </select>
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <button onClick={() => { onSave(project._id, form); setEditing(false); }} className="btn btn-sm btn-primary"><Save size={12} /> Save</button>
        <button onClick={() => setEditing(false)} className="btn btn-sm btn-secondary">Cancel</button>
      </div>
    </div>
  );
};

export default AdminClientProjects;
