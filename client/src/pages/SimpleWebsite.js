import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, FileText, Mail, Sparkles,
  Plus, Edit, Trash2, DollarSign, Clock, Eye, EyeOff,
  CheckCircle, XCircle, Search, TrendingUp, AlertCircle, Image,
  ChevronDown, ChevronUp, Star, Layers, Globe, Save, Loader2,
  Settings, Palette, Wand2, Send
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import { useClientConfig } from '../context/ClientConfigContext';
import SocialAI from './SocialAI';
import './Admin.css';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'categories', label: 'Categories', icon: Layers },
  { key: 'orders', label: 'Orders', icon: ShoppingCart },
  { key: 'pages', label: 'Pages (CMS)', icon: FileText },
  { key: 'inbox', label: 'Inbox', icon: Mail },
  { key: 'aistudio', label: 'AI Studio', icon: Wand2 },
  { key: 'email', label: 'Email', icon: Send },
  { key: 'social', label: 'Social & Marketing', icon: Sparkles },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  confirmed: { bg: '#dbeafe', color: '#1e40af' },
  processing: { bg: '#e0e7ff', color: '#3730a3' },
  shipped: { bg: '#d1fae5', color: '#065f46' },
  delivered: { bg: '#dcfce7', color: '#166534' },
  cancelled: { bg: '#fee2e2', color: '#991b1b' },
  refunded: { bg: '#f3f4f6', color: '#6b7280' }
};

const SimpleWebsite = () => {
  const { enabledApps } = useClientConfig();
  const hasSocialAI = enabledApps.includes('socialai');
  const [tab, setTab] = useState('dashboard');

  // Dashboard
  const [dashData, setDashData] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);

  // Products
  const [products, setProducts] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [showProdModal, setShowProdModal] = useState(false);
  const [editProd, setEditProd] = useState(null);
  const [prodForm, setProdForm] = useState({ name: '', description: '', price: '', category: 'General', stock: '', isActive: true, isFeatured: false, images: [] });
  const [prodSearch, setProdSearch] = useState('');

  // Orders
  const [orders, setOrders] = useState([]);
  const [ordLoading, setOrdLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Pages
  const [pages, setPages] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);
  const [editPage, setEditPage] = useState(null);
  const [pageForm, setPageForm] = useState({ slug: '', title: '', heroTitle: '', heroSubtitle: '', content: '', isPublished: true });

  // Inbox
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [expandedMsg, setExpandedMsg] = useState(null);

  // Categories
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', image: '', slug: '', sortOrder: 0 });

  // AI Studio
  const [aiDescInput, setAiDescInput] = useState({ productName: '', category: '' });
  const [aiDescResult, setAiDescResult] = useState('');
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiImgInput, setAiImgInput] = useState({ productName: '', description: '' });
  const [aiImgResult, setAiImgResult] = useState('');
  const [aiImgLoading, setAiImgLoading] = useState(false);

  // Email
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailOrderConfirmId, setEmailOrderConfirmId] = useState('');
  const [emailOrderConfirmLoading, setEmailOrderConfirmLoading] = useState(false);
  const [emailShipId, setEmailShipId] = useState('');
  const [emailShipLoading, setEmailShipLoading] = useState(false);
  const [emailOrders, setEmailOrders] = useState([]);

  // Settings
  const [siteSettings, setSiteSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get('/simplewebsite/dashboard');
      setDashData(res.data);
    } catch (err) { console.error(err); }
    setDashLoading(false);
  }, []);

  const loadProducts = useCallback(async () => {
    setProdLoading(true);
    try { const res = await api.get('/simplewebsite/products'); setProducts(res.data); } catch (err) { toast.error('Failed to load products'); }
    setProdLoading(false);
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdLoading(true);
    try { const res = await api.get('/simplewebsite/orders'); setOrders(res.data); } catch (err) { toast.error('Failed to load orders'); }
    setOrdLoading(false);
  }, []);

  const loadPages = useCallback(async () => {
    setPageLoading(true);
    try { const res = await api.get('/simplewebsite/pages'); setPages(res.data); } catch (err) { toast.error('Failed to load pages'); }
    setPageLoading(false);
  }, []);

  const loadMessages = useCallback(async () => {
    setMsgLoading(true);
    try { const res = await api.get('/simplewebsite/messages'); setMessages(res.data); } catch (err) { toast.error('Failed to load messages'); }
    setMsgLoading(false);
  }, []);

  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    try { const res = await api.get('/simplewebsite/categories'); setCategories(res.data); } catch (err) { toast.error('Failed to load categories'); }
    setCatLoading(false);
  }, []);

  const loadEmailOrders = useCallback(async () => {
    try { const res = await api.get('/simplewebsite/orders'); setEmailOrders(res.data); } catch (err) { console.error(err); }
  }, []);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try { const res = await api.get('/settings'); setSiteSettings(res.data); } catch (err) { console.error(err); }
    setSettingsLoading(false);
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await api.put('/settings', siteSettings);
      setSiteSettings(res.data.settings || res.data);
      toast.success('Settings saved');
    } catch (err) { toast.error('Failed to save settings'); }
    setSavingSettings(false);
  };

  const updateSetting = (key, value) => setSiteSettings(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (tab === 'dashboard') loadDashboard();
    if (tab === 'products') loadProducts();
    if (tab === 'categories') loadCategories();
    if (tab === 'orders') loadOrders();
    if (tab === 'pages') loadPages();
    if (tab === 'inbox') loadMessages();
    if (tab === 'email') loadEmailOrders();
    if (tab === 'settings' && !siteSettings) loadSettings();
  }, [tab, loadDashboard, loadProducts, loadCategories, loadOrders, loadPages, loadMessages, loadEmailOrders, loadSettings, siteSettings]);

  // ── Product CRUD ──
  const openAddProduct = () => { setEditProd(null); setProdForm({ name: '', description: '', price: '', category: 'General', stock: '', isActive: true, isFeatured: false, images: [] }); setShowProdModal(true); };
  const openEditProduct = (p) => { setEditProd(p); setProdForm({ name: p.name, description: p.description, price: p.price, category: p.category, stock: p.stock, isActive: p.isActive, isFeatured: p.isFeatured, images: p.images || [] }); setShowProdModal(true); };

  const handleProdSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...prodForm, price: parseFloat(prodForm.price) || 0, stock: parseInt(prodForm.stock) || 0 };
      if (editProd) {
        await api.put(`/simplewebsite/products/${editProd._id}`, data);
        toast.success('Product updated');
      } else {
        await api.post('/simplewebsite/products', data);
        toast.success('Product created');
      }
      setShowProdModal(false);
      loadProducts();
      if (tab === 'dashboard') loadDashboard();
    } catch (err) { toast.error('Failed to save product'); }
  };

  const deleteProd = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await api.delete(`/simplewebsite/products/${id}`); toast.success('Product deleted'); loadProducts(); } catch (err) { toast.error('Failed to delete'); }
  };

  // ── Order status update ──
  const updateOrderStatus = async (id, status) => {
    try { await api.put(`/simplewebsite/orders/${id}`, { status }); toast.success('Order updated'); loadOrders(); if (tab === 'dashboard') loadDashboard(); } catch (err) { toast.error('Failed to update order'); }
  };

  // ── Page CRUD ──
  const openAddPage = () => { setEditPage(null); setPageForm({ slug: '', title: '', heroTitle: '', heroSubtitle: '', content: '', isPublished: true }); setShowPageModal(true); };
  const openEditPage = (p) => { setEditPage(p); setPageForm({ slug: p.slug, title: p.title, heroTitle: p.heroTitle || '', heroSubtitle: p.heroSubtitle || '', content: p.content || '', isPublished: p.isPublished }); setShowPageModal(true); };

  const handlePageSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editPage) {
        await api.put(`/simplewebsite/pages/${editPage._id}`, pageForm);
        toast.success('Page updated');
      } else {
        await api.post('/simplewebsite/pages', pageForm);
        toast.success('Page created');
      }
      setShowPageModal(false);
      loadPages();
    } catch (err) { toast.error('Failed to save page'); }
  };

  const deletePage = async (id) => {
    if (!window.confirm('Delete this page?')) return;
    try { await api.delete(`/simplewebsite/pages/${id}`); toast.success('Page deleted'); loadPages(); } catch (err) { toast.error('Failed to delete'); }
  };

  const seedPages = async () => {
    try { await api.post('/simplewebsite/pages/seed'); toast.success('Default pages created'); loadPages(); } catch (err) { toast.error('Failed to seed pages'); }
  };

  // ── Message actions ──
  const markRead = async (id) => {
    try { await api.put(`/simplewebsite/messages/${id}`, { isRead: true }); loadMessages(); } catch (err) { toast.error('Failed'); }
  };

  const deleteMessage = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try { await api.delete(`/simplewebsite/messages/${id}`); toast.success('Deleted'); loadMessages(); } catch (err) { toast.error('Failed'); }
  };

  // ── Category CRUD ──
  const openAddCat = () => { setEditCat(null); setCatForm({ name: '', description: '', image: '', slug: '', sortOrder: 0 }); setShowCatModal(true); };
  const openEditCat = (c) => { setEditCat(c); setCatForm({ name: c.name, description: c.description || '', image: c.image || '', slug: c.slug || '', sortOrder: c.sortOrder || 0 }); setShowCatModal(true); };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...catForm, sortOrder: parseInt(catForm.sortOrder) || 0 };
      if (editCat) {
        await api.put(`/simplewebsite/categories/${editCat._id}`, data);
        toast.success('Category updated');
      } else {
        await api.post('/simplewebsite/categories', data);
        toast.success('Category created');
      }
      setShowCatModal(false);
      loadCategories();
    } catch (err) { toast.error('Failed to save category'); }
  };

  const deleteCat = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try { await api.delete(`/simplewebsite/categories/${id}`); toast.success('Category deleted'); loadCategories(); } catch (err) { toast.error('Failed to delete'); }
  };

  // ── AI Studio actions ──
  const generateDescription = async () => {
    if (!aiDescInput.productName) return toast.error('Enter a product name');
    setAiDescLoading(true);
    try {
      const res = await api.post('/simplewebsite/ai/product-description', aiDescInput);
      setAiDescResult(res.data.description || res.data.result || '');
      toast.success('Description generated');
    } catch (err) { toast.error('Failed to generate description'); }
    setAiDescLoading(false);
  };

  const generateImage = async () => {
    if (!aiImgInput.productName) return toast.error('Enter a product name');
    setAiImgLoading(true);
    try {
      const res = await api.post('/simplewebsite/ai/product-image', aiImgInput);
      setAiImgResult(res.data.imageUrl || res.data.url || '');
      toast.success('Image generated');
    } catch (err) { toast.error('Failed to generate image'); }
    setAiImgLoading(false);
  };

  // ── Email actions ──
  const sendTestEmail = async () => {
    setEmailTestLoading(true);
    try { await api.post('/simplewebsite/email/test'); toast.success('Test email sent'); } catch (err) { toast.error('Failed to send test email'); }
    setEmailTestLoading(false);
  };

  const sendOrderConfirmation = async () => {
    if (!emailOrderConfirmId) return toast.error('Select an order');
    setEmailOrderConfirmLoading(true);
    try { await api.post('/simplewebsite/email/order-confirmation', { orderId: emailOrderConfirmId }); toast.success('Order confirmation sent'); } catch (err) { toast.error('Failed to send confirmation'); }
    setEmailOrderConfirmLoading(false);
  };

  const sendShippingNotification = async () => {
    if (!emailShipId) return toast.error('Select an order');
    setEmailShipLoading(true);
    try { await api.post('/simplewebsite/email/shipping-notification', { orderId: emailShipId }); toast.success('Shipping notification sent'); } catch (err) { toast.error('Failed to send notification'); }
    setEmailShipLoading(false);
  };

  // Filter tabs — hide Social tab if SocialAI not enabled
  const visibleTabs = hasSocialAI ? TABS : TABS.filter(t => t.key !== 'social');

  const filteredProducts = products.filter(p =>
    `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(prodSearch.toLowerCase())
  );

  return (
    <div className="admin-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f3f4f6', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={24} style={{ color: '#10b981' }} /> SimpleWebsite
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Manage your online store, products, orders, and content</p>

        {/* Tab Nav */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
          {visibleTabs.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '8px 8px 0 0', fontSize: '0.8125rem', fontWeight: 600, background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent', color: isActive ? '#6ee7b7' : '#6b7280', border: 'none', cursor: 'pointer', borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent', whiteSpace: 'nowrap' }}>
                <Icon size={16} /> {t.label}
                {t.key === 'inbox' && dashData?.unreadMessages > 0 && (
                  <span style={{ background: '#ef4444', color: 'white', fontSize: '0.625rem', padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>{dashData.unreadMessages}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══ DASHBOARD ═══ */}
        {tab === 'dashboard' && (
          <div>
            {dashLoading ? <div className="page-loading">Loading dashboard...</div> : dashData && (
              <>
                <div className="admin-stats">
                  <div className="stat-card card">
                    <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><DollarSign size={24} /></div>
                    <div className="stat-info"><strong>${(dashData.revenue || 0).toFixed(2)}</strong><span>Total Revenue</span></div>
                  </div>
                  <div className="stat-card card">
                    <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><ShoppingCart size={24} /></div>
                    <div className="stat-info"><strong>{dashData.orders || 0}</strong><span>Total Orders</span></div>
                  </div>
                  <div className="stat-card card">
                    <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><Package size={24} /></div>
                    <div className="stat-info"><strong>{dashData.products || 0}</strong><span>Products</span></div>
                  </div>
                  <div className="stat-card card">
                    <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><Mail size={24} /></div>
                    <div className="stat-info"><strong>{dashData.unreadMessages || 0}</strong><span>Unread Messages</span></div>
                  </div>
                </div>

                {dashData.pendingOrders > 0 && (
                  <div className="card" style={{ padding: '1rem', marginTop: '1rem', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fcd34d', fontSize: '0.875rem', fontWeight: 600 }}>
                      <AlertCircle size={16} /> {dashData.pendingOrders} pending order{dashData.pendingOrders !== 1 && 's'} awaiting action
                    </div>
                  </div>
                )}

                {dashData.lowStock > 0 && (
                  <div className="card" style={{ padding: '1rem', marginTop: '0.5rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5', fontSize: '0.875rem', fontWeight: 600 }}>
                      <AlertCircle size={16} /> {dashData.lowStock} product{dashData.lowStock !== 1 && 's'} with low stock (≤5)
                    </div>
                  </div>
                )}

                {/* Recent Orders */}
                {dashData.recentOrders?.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '0.75rem' }}>Recent Orders</h3>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>Order</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>Customer</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#9ca3af', fontWeight: 600 }}>Total</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#9ca3af', fontWeight: 600 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashData.recentOrders.map(o => {
                            const sc = STATUS_COLORS[o.status] || STATUS_COLORS.pending;
                            return (
                              <tr key={o._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '0.625rem 1rem', color: '#d1d5db', fontWeight: 600 }}>{o.orderNumber}</td>
                                <td style={{ padding: '0.625rem 1rem', color: '#9ca3af' }}>{o.customerName}</td>
                                <td style={{ padding: '0.625rem 1rem', color: '#6ee7b7', textAlign: 'right', fontWeight: 600 }}>${o.total?.toFixed(2)}</td>
                                <td style={{ padding: '0.625rem 1rem', textAlign: 'center' }}>
                                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 700, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>{o.status}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={() => { setTab('products'); setTimeout(openAddProduct, 100); }} className="btn btn-primary btn-sm"><Plus size={14} /> Add Product</button>
                  <button onClick={() => setTab('orders')} className="btn btn-secondary btn-sm"><ShoppingCart size={14} /> View Orders</button>
                  <button onClick={() => setTab('inbox')} className="btn btn-secondary btn-sm"><Mail size={14} /> Check Inbox</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ PRODUCTS ═══ */}
        {tab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f3f4f6' }}>Products ({products.length})</h2>
                <div className="search-box" style={{ maxWidth: 250 }}>
                  <Search size={14} />
                  <input type="text" placeholder="Search products..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} style={{ fontSize: '0.75rem' }} />
                </div>
              </div>
              <button onClick={openAddProduct} className="btn btn-primary btn-sm"><Plus size={14} /> Add Product</button>
            </div>

            {prodLoading ? <div className="page-loading">Loading...</div> : filteredProducts.length === 0 ? (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <Package size={40} style={{ color: '#4b5563', marginBottom: '1rem' }} />
                <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>No Products Yet</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>Add your first product to get started.</p>
                <button onClick={openAddProduct} className="btn btn-primary"><Plus size={14} /> Add Product</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredProducts.map(p => (
                  <div key={p._id} className="card" style={{ padding: '1rem', position: 'relative' }}>
                    {p.isFeatured && <Star size={14} style={{ position: 'absolute', top: 10, right: 10, color: '#f59e0b' }} />}
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ width: 56, height: 56, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {p.images?.[0] ? <img src={p.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Image size={24} style={{ color: '#4b5563' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '0.125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{p.category}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                      <span style={{ fontWeight: 700, color: '#6ee7b7' }}>${p.price?.toFixed(2)}</span>
                      <span style={{ color: p.stock <= 5 && p.trackInventory ? '#fca5a5' : '#9ca3af', fontSize: '0.75rem' }}>
                        {p.trackInventory ? `${p.stock} in stock` : 'No tracking'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.6875rem', color: p.isActive ? '#6ee7b7' : '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {p.isActive ? <><Eye size={12} /> Active</> : <><EyeOff size={12} /> Hidden</>}
                      </span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button onClick={() => openEditProduct(p)} className="btn btn-sm btn-secondary" style={{ padding: '0.25rem 0.5rem' }}><Edit size={12} /></button>
                        <button onClick={() => deleteProd(p._id)} className="btn btn-sm btn-danger" style={{ padding: '0.25rem 0.5rem' }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ CATEGORIES ═══ */}
        {tab === 'categories' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f3f4f6' }}>Categories ({categories.length})</h2>
              <button onClick={openAddCat} className="btn btn-primary btn-sm"><Plus size={14} /> Add Category</button>
            </div>
            {catLoading ? <div className="page-loading">Loading...</div> : categories.length === 0 ? (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <Layers size={40} style={{ color: '#4b5563', marginBottom: '1rem' }} />
                <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>No Categories Yet</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>Add categories to organize your products.</p>
                <button onClick={openAddCat} className="btn btn-primary"><Plus size={14} /> Add Category</button>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>Image</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>Slug</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>Description</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#9ca3af', fontWeight: 600 }}>Sort</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#9ca3af', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(c => (
                      <tr key={c._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.625rem 1rem' }}>
                          <div style={{ width: 40, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {c.image ? <img src={c.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Layers size={18} style={{ color: '#4b5563' }} />}
                          </div>
                        </td>
                        <td style={{ padding: '0.625rem 1rem', color: '#f3f4f6', fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: '0.625rem 1rem', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.75rem' }}>{c.slug}</td>
                        <td style={{ padding: '0.625rem 1rem', color: '#9ca3af', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || '—'}</td>
                        <td style={{ padding: '0.625rem 1rem', color: '#9ca3af', textAlign: 'center' }}>{c.sortOrder || 0}</td>
                        <td style={{ padding: '0.625rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => openEditCat(c)} className="btn btn-sm btn-secondary" style={{ padding: '0.25rem 0.5rem' }}><Edit size={12} /></button>
                            <button onClick={() => deleteCat(c._id)} className="btn btn-sm btn-danger" style={{ padding: '0.25rem 0.5rem' }}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ ORDERS ═══ */}
        {tab === 'orders' && (
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '1rem' }}>Orders ({orders.length})</h2>
            {ordLoading ? <div className="page-loading">Loading...</div> : orders.length === 0 ? (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <ShoppingCart size={40} style={{ color: '#4b5563', marginBottom: '1rem' }} />
                <h3 style={{ color: '#d1d5db' }}>No Orders Yet</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Orders will appear here when customers start purchasing.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {orders.map(o => {
                  const sc = STATUS_COLORS[o.status] || STATUS_COLORS.pending;
                  const isExp = expandedOrder === o._id;
                  return (
                    <div key={o._id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      <div onClick={() => setExpandedOrder(isExp ? null : o._id)} style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {isExp ? <ChevronUp size={14} style={{ color: '#6b7280' }} /> : <ChevronDown size={14} style={{ color: '#6b7280' }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#f3f4f6', fontSize: '0.875rem' }}>{o.orderNumber}</strong>
                            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 700, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>{o.status}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {o.customerName} · {o.items?.length || 0} item{o.items?.length !== 1 && 's'} · {new Date(o.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <span style={{ color: '#6ee7b7', fontWeight: 700 }}>${o.total?.toFixed(2)}</span>
                      </div>
                      {isExp && (
                        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', fontSize: '0.8125rem' }}>
                            <div>
                              <strong style={{ color: '#9ca3af' }}>Customer</strong>
                              <p style={{ color: '#d1d5db' }}>{o.customerName}</p>
                              <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>{o.customerEmail}</p>
                              {o.customerPhone && <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>{o.customerPhone}</p>}
                            </div>
                            <div>
                              <strong style={{ color: '#9ca3af' }}>Totals</strong>
                              <p style={{ color: '#d1d5db' }}>Subtotal: ${o.subtotal?.toFixed(2)}</p>
                              {o.tax > 0 && <p style={{ color: '#d1d5db' }}>Tax: ${o.tax?.toFixed(2)}</p>}
                              {o.shipping > 0 && <p style={{ color: '#d1d5db' }}>Shipping: ${o.shipping?.toFixed(2)}</p>}
                              <p style={{ color: '#6ee7b7', fontWeight: 700 }}>Total: ${o.total?.toFixed(2)}</p>
                            </div>
                          </div>
                          {/* Items */}
                          <div style={{ marginTop: '1rem' }}>
                            <strong style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>Items</strong>
                            {o.items?.map((item, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8125rem' }}>
                                <span style={{ color: '#d1d5db' }}>{item.name} × {item.quantity}{item.variant ? ` (${item.variant})` : ''}</span>
                                <span style={{ color: '#6ee7b7' }}>${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          {/* Status update */}
                          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                            {['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                              <button key={s} onClick={() => updateOrderStatus(o._id, s)} disabled={o.status === s}
                                className="btn btn-sm btn-secondary" style={{ fontSize: '0.6875rem', textTransform: 'capitalize', opacity: o.status === s ? 0.4 : 1 }}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ PAGES (CMS) ═══ */}
        {tab === 'pages' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f3f4f6' }}>Pages ({pages.length})</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {pages.length === 0 && <button onClick={seedPages} className="btn btn-secondary btn-sm"><Layers size={14} /> Create Defaults</button>}
                <button onClick={openAddPage} className="btn btn-primary btn-sm"><Plus size={14} /> New Page</button>
              </div>
            </div>
            {pageLoading ? <div className="page-loading">Loading...</div> : pages.length === 0 ? (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <FileText size={40} style={{ color: '#4b5563', marginBottom: '1rem' }} />
                <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>No Pages Yet</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>Create default pages (Home, About, Contact, FAQ, Shipping) or add custom ones.</p>
                <button onClick={seedPages} className="btn btn-primary"><Layers size={14} /> Create Default Pages</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pages.map(p => (
                  <div key={p._id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <FileText size={18} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ color: '#f3f4f6', fontSize: '0.875rem' }}>{p.title}</strong>
                        <span style={{ fontSize: '0.6875rem', color: '#6b7280', fontFamily: 'monospace' }}>/{p.slug}</span>
                        {!p.isPublished && <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>DRAFT</span>}
                      </div>
                      {p.heroTitle && <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>{p.heroTitle}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button onClick={() => openEditPage(p)} className="btn btn-sm btn-secondary" style={{ padding: '0.25rem 0.5rem' }}><Edit size={12} /></button>
                      <button onClick={() => deletePage(p._id)} className="btn btn-sm btn-danger" style={{ padding: '0.25rem 0.5rem' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ INBOX ═══ */}
        {tab === 'inbox' && (
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '1rem' }}>
              Inbox ({messages.filter(m => !m.isRead).length} unread)
            </h2>
            {msgLoading ? <div className="page-loading">Loading...</div> : messages.length === 0 ? (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <Mail size={40} style={{ color: '#4b5563', marginBottom: '1rem' }} />
                <h3 style={{ color: '#d1d5db' }}>No Messages</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Customer enquiries from your contact form will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {messages.map(m => {
                  const isExp = expandedMsg === m._id;
                  return (
                    <div key={m._id} className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: m.isRead ? 'none' : '3px solid #3b82f6' }}>
                      <div onClick={() => { setExpandedMsg(isExp ? null : m._id); if (!m.isRead) markRead(m._id); }}
                        style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {isExp ? <ChevronUp size={14} style={{ color: '#6b7280' }} /> : <ChevronDown size={14} style={{ color: '#6b7280' }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ color: m.isRead ? '#9ca3af' : '#f3f4f6', fontSize: '0.875rem' }}>{m.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{m.subject}</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>{m.email} · {new Date(m.createdAt).toLocaleDateString()}</p>
                        </div>
                        {!m.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />}
                      </div>
                      {isExp && (
                        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ fontSize: '0.875rem', color: '#d1d5db', marginTop: '0.75rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                          {m.phone && <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>Phone: {m.phone}</p>}
                          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                            <a href={`mailto:${m.email}`} className="btn btn-sm btn-primary"><Mail size={12} /> Reply via Email</a>
                            <button onClick={() => deleteMessage(m._id)} className="btn btn-sm btn-danger"><Trash2 size={12} /> Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ AI STUDIO ═══ */}
        {tab === 'aistudio' && (
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wand2 size={22} /> AI Studio
            </h2>

            {/* Generate Product Description */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} style={{ color: '#8b5cf6' }} /> Generate Product Description
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Product Name</label>
                  <input value={aiDescInput.productName} onChange={e => setAiDescInput(f => ({ ...f, productName: e.target.value }))} placeholder="e.g. Organic Coffee Beans" />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input value={aiDescInput.category} onChange={e => setAiDescInput(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Beverages" />
                </div>
              </div>
              <button onClick={generateDescription} className="btn btn-primary btn-sm" disabled={aiDescLoading} style={{ marginTop: '0.5rem' }}>
                {aiDescLoading ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />} Generate Description
              </button>
              {aiDescResult && (
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Generated Description</label>
                  <textarea rows={5} value={aiDescResult} onChange={e => setAiDescResult(e.target.value)} style={{ fontSize: '0.8125rem' }} />
                </div>
              )}
            </div>

            {/* Generate Product Image */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Image size={16} style={{ color: '#f59e0b' }} /> Generate Product Image
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Product Name</label>
                  <input value={aiImgInput.productName} onChange={e => setAiImgInput(f => ({ ...f, productName: e.target.value }))} placeholder="e.g. Organic Coffee Beans" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input value={aiImgInput.description} onChange={e => setAiImgInput(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Premium roasted beans in a bag" />
                </div>
              </div>
              <button onClick={generateImage} className="btn btn-primary btn-sm" disabled={aiImgLoading} style={{ marginTop: '0.5rem' }}>
                {aiImgLoading ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />} Generate Image
              </button>
              {aiImgResult && (
                <div style={{ marginTop: '0.75rem' }}>
                  <img src={aiImgResult} alt="Generated" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, objectFit: 'contain' }} />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', wordBreak: 'break-all' }}>{aiImgResult}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ EMAIL ═══ */}
        {tab === 'email' && (
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={22} /> Email
            </h2>

            {/* Send Test Email */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} style={{ color: '#3b82f6' }} /> Send Test Email
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.75rem' }}>Send a test email to verify your email configuration is working correctly.</p>
              <button onClick={sendTestEmail} className="btn btn-primary btn-sm" disabled={emailTestLoading}>
                {emailTestLoading ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Send Test Email
              </button>
            </div>

            {/* Order Confirmation */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={16} style={{ color: '#10b981' }} /> Order Confirmation
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.75rem' }}>Send an order confirmation email to the customer.</p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Select Order</label>
                  <select value={emailOrderConfirmId} onChange={e => setEmailOrderConfirmId(e.target.value)}>
                    <option value="">-- Select an order --</option>
                    {emailOrders.map(o => (
                      <option key={o._id} value={o._id}>{o.orderNumber} — {o.customerName} (${o.total?.toFixed(2)})</option>
                    ))}
                  </select>
                </div>
                <button onClick={sendOrderConfirmation} className="btn btn-primary btn-sm" disabled={emailOrderConfirmLoading} style={{ whiteSpace: 'nowrap' }}>
                  {emailOrderConfirmLoading ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Send
                </button>
              </div>
            </div>

            {/* Shipping Notification */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={16} style={{ color: '#f59e0b' }} /> Shipping Notification
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.75rem' }}>Send a shipping notification email to the customer.</p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Select Order</label>
                  <select value={emailShipId} onChange={e => setEmailShipId(e.target.value)}>
                    <option value="">-- Select an order --</option>
                    {emailOrders.map(o => (
                      <option key={o._id} value={o._id}>{o.orderNumber} — {o.customerName} (${o.total?.toFixed(2)})</option>
                    ))}
                  </select>
                </div>
                <button onClick={sendShippingNotification} className="btn btn-primary btn-sm" disabled={emailShipLoading} style={{ whiteSpace: 'nowrap' }}>
                  {emailShipLoading ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SOCIAL TAB — Embedded SocialAI ═══ */}
        {tab === 'social' && hasSocialAI && <SocialAI embedded />}

        {/* ═══ SETTINGS TAB ═══ */}
        {tab === 'settings' && (
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={22} /> App Settings
            </h2>
            {settingsLoading ? <div className="page-loading">Loading settings...</div> : siteSettings && (
              <>
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Palette size={16} style={{ color: '#f59e0b' }} /> Branding & Appearance
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label>Business Name</label>
                      <input value={siteSettings.brandName || siteSettings.businessName || ''} onChange={e => { updateSetting('brandName', e.target.value); updateSetting('businessName', e.target.value); }} placeholder="Your Business Name" />
                    </div>
                    <div className="form-group">
                      <label>Tagline</label>
                      <input value={siteSettings.brandTagline || ''} onChange={e => updateSetting('brandTagline', e.target.value)} placeholder="e.g. Quality Products, Delivered" />
                    </div>
                    <div className="form-group">
                      <label>Primary Colour</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="color" value={siteSettings.brandPrimaryColor || '#10b981'} onChange={e => updateSetting('brandPrimaryColor', e.target.value)} style={{ width: 40, height: 38, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
                        <input value={siteSettings.brandPrimaryColor || '#10b981'} onChange={e => updateSetting('brandPrimaryColor', e.target.value)} style={{ flex: 1 }} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Accent Colour</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="color" value={siteSettings.brandAccentColor || '#f59e0b'} onChange={e => updateSetting('brandAccentColor', e.target.value)} style={{ width: 40, height: 38, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
                        <input value={siteSettings.brandAccentColor || '#f59e0b'} onChange={e => updateSetting('brandAccentColor', e.target.value)} style={{ flex: 1 }} />
                      </div>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Logo URL</label>
                      <input value={siteSettings.brandLogoUrl || ''} onChange={e => updateSetting('brandLogoUrl', e.target.value)} placeholder="https://..." />
                      {siteSettings.brandLogoUrl && <img src={siteSettings.brandLogoUrl} alt="Logo" style={{ marginTop: '0.5rem', maxHeight: 60, borderRadius: 8, objectFit: 'contain' }} />}
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Hero / Banner Image URL</label>
                      <input value={siteSettings.brandHeroImage || ''} onChange={e => updateSetting('brandHeroImage', e.target.value)} placeholder="https://..." />
                      {siteSettings.brandHeroImage && <img src={siteSettings.brandHeroImage} alt="Hero" style={{ marginTop: '0.5rem', maxHeight: 100, borderRadius: 8, objectFit: 'cover', width: '100%' }} />}
                    </div>
                  </div>
                </div>
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={16} style={{ color: '#3b82f6' }} /> Business Info & Contact
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label>Email</label>
                      <input value={siteSettings.businessEmail || ''} onChange={e => updateSetting('businessEmail', e.target.value)} placeholder="hello@yourbusiness.com" />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input value={siteSettings.businessPhone || ''} onChange={e => updateSetting('businessPhone', e.target.value)} placeholder="0400 000 000" />
                    </div>
                    <div className="form-group">
                      <label>Facebook</label>
                      <input value={siteSettings.businessFacebook || ''} onChange={e => updateSetting('businessFacebook', e.target.value)} placeholder="https://facebook.com/..." />
                    </div>
                    <div className="form-group">
                      <label>Instagram</label>
                      <input value={siteSettings.businessInstagram || ''} onChange={e => updateSetting('businessInstagram', e.target.value)} placeholder="https://instagram.com/..." />
                    </div>
                    <div className="form-group">
                      <label>Website</label>
                      <input value={siteSettings.businessWebsite || ''} onChange={e => updateSetting('businessWebsite', e.target.value)} placeholder="https://yourbusiness.com.au" />
                    </div>
                    <div className="form-group">
                      <label>ABN</label>
                      <input value={siteSettings.businessABN || ''} onChange={e => updateSetting('businessABN', e.target.value)} placeholder="12 345 678 901" />
                    </div>
                  </div>
                </div>
                {/* Square Payment Config */}
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={16} style={{ color: '#10b981' }} /> Square Payment Config
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label>Application ID</label>
                      <input value={siteSettings.squareApplicationId || ''} onChange={e => updateSetting('squareApplicationId', e.target.value)} placeholder="sq0idp-..." />
                    </div>
                    <div className="form-group">
                      <label>Access Token</label>
                      <input type="password" value={siteSettings.squareAccessToken || ''} onChange={e => updateSetting('squareAccessToken', e.target.value)} placeholder="sq0atp-..." />
                    </div>
                    <div className="form-group">
                      <label>Location ID</label>
                      <input value={siteSettings.squareLocationId || ''} onChange={e => updateSetting('squareLocationId', e.target.value)} placeholder="Location ID" />
                    </div>
                    <div className="form-group">
                      <label>Environment</label>
                      <select value={siteSettings.squareEnvironment || 'sandbox'} onChange={e => updateSetting('squareEnvironment', e.target.value)}>
                        <option value="sandbox">Sandbox</option>
                        <option value="production">Production</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Email Config */}
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={16} style={{ color: '#8b5cf6' }} /> Email Config (Resend)
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Resend API Key</label>
                      <input type="password" value={siteSettings.resendApiKey || ''} onChange={e => updateSetting('resendApiKey', e.target.value)} placeholder="re_..." />
                    </div>
                    <div className="form-group">
                      <label>From Email</label>
                      <input value={siteSettings.resendFromEmail || ''} onChange={e => updateSetting('resendFromEmail', e.target.value)} placeholder="noreply@yourdomain.com" />
                    </div>
                    <div className="form-group">
                      <label>From Name</label>
                      <input value={siteSettings.resendFromName || ''} onChange={e => updateSetting('resendFromName', e.target.value)} placeholder="Your Business Name" />
                    </div>
                  </div>
                </div>

                {/* Shipping Config */}
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={16} style={{ color: '#f59e0b' }} /> Shipping Config
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label>Carrier Name</label>
                      <input value={siteSettings.carrierName || ''} onChange={e => updateSetting('carrierName', e.target.value)} placeholder="e.g. Australia Post" />
                    </div>
                    <div className="form-group">
                      <label>Free Shipping Threshold ($)</label>
                      <input type="number" step="0.01" value={siteSettings.freeShippingThreshold || ''} onChange={e => updateSetting('freeShippingThreshold', parseFloat(e.target.value) || 0)} placeholder="e.g. 100" />
                    </div>
                    <div className="form-group">
                      <label>Default Item Weight (kg)</label>
                      <input type="number" step="0.01" value={siteSettings.defaultItemWeight || ''} onChange={e => updateSetting('defaultItemWeight', parseFloat(e.target.value) || 0)} placeholder="e.g. 0.5" />
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#9ca3af' }}>Shipping Tiers</label>
                      <button onClick={() => updateSetting('shippingTiers', [...(siteSettings.shippingTiers || []), { maxWeight: '', standardPrice: '', expressPrice: '' }])} className="btn btn-sm btn-secondary"><Plus size={12} /> Add Tier</button>
                    </div>
                    {(siteSettings.shippingTiers || []).map((tier, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.375rem' }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <input type="number" step="0.01" value={tier.maxWeight || ''} onChange={e => { const tiers = [...(siteSettings.shippingTiers || [])]; tiers[i] = { ...tiers[i], maxWeight: parseFloat(e.target.value) || 0 }; updateSetting('shippingTiers', tiers); }} placeholder="Max Weight (kg)" />
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <input type="number" step="0.01" value={tier.standardPrice || ''} onChange={e => { const tiers = [...(siteSettings.shippingTiers || [])]; tiers[i] = { ...tiers[i], standardPrice: parseFloat(e.target.value) || 0 }; updateSetting('shippingTiers', tiers); }} placeholder="Standard ($)" />
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <input type="number" step="0.01" value={tier.expressPrice || ''} onChange={e => { const tiers = [...(siteSettings.shippingTiers || [])]; tiers[i] = { ...tiers[i], expressPrice: parseFloat(e.target.value) || 0 }; updateSetting('shippingTiers', tiers); }} placeholder="Express ($)" />
                        </div>
                        <button onClick={() => { const tiers = [...(siteSettings.shippingTiers || [])]; tiers.splice(i, 1); updateSetting('shippingTiers', tiers); }} className="btn btn-sm btn-danger" style={{ padding: '0.25rem 0.5rem' }}><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tax Config */}
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={16} style={{ color: '#6ee7b7' }} /> Tax Config
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={siteSettings.gstEnabled || false} onChange={e => updateSetting('gstEnabled', e.target.checked)} />
                        GST Enabled
                      </label>
                    </div>
                    <div className="form-group">
                      <label>GST Rate (%)</label>
                      <input type="number" step="0.01" value={siteSettings.gstRate || ''} onChange={e => updateSetting('gstRate', parseFloat(e.target.value) || 0)} placeholder="e.g. 10" />
                    </div>
                  </div>
                </div>

                {/* Brand Assets */}
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Image size={16} style={{ color: '#3b82f6' }} /> Brand Assets
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label>Brand Logo URL</label>
                      <input value={siteSettings.brandLogo || ''} onChange={e => updateSetting('brandLogo', e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="form-group">
                      <label>Favicon URL</label>
                      <input value={siteSettings.favicon || ''} onChange={e => updateSetting('favicon', e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Founder Image URL</label>
                      <input value={siteSettings.founderImage || ''} onChange={e => updateSetting('founderImage', e.target.value)} placeholder="https://..." />
                    </div>
                  </div>
                </div>

                {/* AI Config */}
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Wand2 size={16} style={{ color: '#8b5cf6' }} /> AI Config
                  </h3>
                  <div className="form-group">
                    <label>OpenRouter API Key</label>
                    <input type="password" value={siteSettings.openRouterApiKey || ''} onChange={e => updateSetting('openRouterApiKey', e.target.value)} placeholder="sk-or-..." />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={saveSettings} className="btn btn-primary" disabled={savingSettings}>
                    {savingSettings ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save All Settings
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ PRODUCT MODAL ═══ */}
        {showProdModal && (
          <div className="modal-overlay" onClick={() => setShowProdModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <h2>{editProd ? 'Edit Product' : 'Add Product'}</h2>
              <form onSubmit={handleProdSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Product Name *</label>
                    <input required value={prodForm.name} onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Organic Coffee Beans" />
                  </div>
                  <div className="form-group">
                    <label>Price ($) *</label>
                    <input type="number" step="0.01" required value={prodForm.price} onChange={e => setProdForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input value={prodForm.category} onChange={e => setProdForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Beverages" />
                  </div>
                  <div className="form-group">
                    <label>Stock</label>
                    <input type="number" value={prodForm.stock} onChange={e => setProdForm(f => ({ ...f, stock: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={prodForm.isActive ? 'active' : 'hidden'} onChange={e => setProdForm(f => ({ ...f, isActive: e.target.value === 'active' }))}>
                      <option value="active">Active</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <textarea rows={3} value={prodForm.description} onChange={e => setProdForm(f => ({ ...f, description: e.target.value }))} placeholder="Product description..." />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Image URL</label>
                    <input value={prodForm.images[0] || ''} onChange={e => setProdForm(f => ({ ...f, images: [e.target.value] }))} placeholder="https://..." />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={prodForm.isFeatured} onChange={e => setProdForm(f => ({ ...f, isFeatured: e.target.checked }))} />
                      Featured Product
                    </label>
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowProdModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary"><Save size={14} /> {editProd ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ CATEGORY MODAL ═══ */}
        {showCatModal && (
          <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <h2>{editCat ? 'Edit Category' : 'Add Category'}</h2>
              <form onSubmit={handleCatSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Category Name *</label>
                    <input required value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Beverages" />
                  </div>
                  <div className="form-group">
                    <label>Slug</label>
                    <input value={catForm.slug} onChange={e => setCatForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="e.g. beverages" />
                  </div>
                  <div className="form-group">
                    <label>Sort Order</label>
                    <input type="number" value={catForm.sortOrder} onChange={e => setCatForm(f => ({ ...f, sortOrder: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <textarea rows={3} value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} placeholder="Category description..." />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Image URL</label>
                    <input value={catForm.image} onChange={e => setCatForm(f => ({ ...f, image: e.target.value }))} placeholder="https://..." />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowCatModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary"><Save size={14} /> {editCat ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ PAGE MODAL ═══ */}
        {showPageModal && (
          <div className="modal-overlay" onClick={() => setShowPageModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
              <h2>{editPage ? 'Edit Page' : 'New Page'}</h2>
              <form onSubmit={handlePageSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Page Title *</label>
                    <input required value={pageForm.title} onChange={e => setPageForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. About Us" />
                  </div>
                  <div className="form-group">
                    <label>Slug *</label>
                    <input required value={pageForm.slug} onChange={e => setPageForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="e.g. about" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Hero Title</label>
                    <input value={pageForm.heroTitle} onChange={e => setPageForm(f => ({ ...f, heroTitle: e.target.value }))} placeholder="Main heading on this page" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Hero Subtitle</label>
                    <input value={pageForm.heroSubtitle} onChange={e => setPageForm(f => ({ ...f, heroSubtitle: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Content</label>
                    <textarea rows={6} value={pageForm.content} onChange={e => setPageForm(f => ({ ...f, content: e.target.value }))} placeholder="Page content..." />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={pageForm.isPublished ? 'published' : 'draft'} onChange={e => setPageForm(f => ({ ...f, isPublished: e.target.value === 'published' }))}>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowPageModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary"><Save size={14} /> {editPage ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleWebsite;
