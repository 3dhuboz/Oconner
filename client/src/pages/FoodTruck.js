import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Utensils, ShoppingCart, Calendar, Sparkles,
  Plus, Edit, Trash2, ChevronDown, ChevronUp, DollarSign, Clock,
  CheckCircle, XCircle, Package, MapPin, Search, Filter,
  TrendingUp, AlertCircle, Eye, ChefHat, Settings, Save, Loader2,
  Palette, Globe, Image, Layers
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import { useClientConfig } from '../context/ClientConfigContext';
import SocialAI from './SocialAI';
import './Admin.css';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'menu', label: 'Menu', icon: Utensils },
  { key: 'orders', label: 'Orders', icon: ShoppingCart },
  { key: 'cookdays', label: 'Cook Days', icon: Calendar },
  { key: 'social', label: 'Social & Marketing', icon: Sparkles },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
const STATUS_COLORS = {
  pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#8b5cf6',
  ready: '#10b981', completed: '#6b7280', cancelled: '#ef4444'
};

const FoodTruck = () => {
  const { enabledApps } = useClientConfig();
  const [tab, setTab] = useState('dashboard');
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState({});
  const [cookDays, setCookDays] = useState([]);
  const [loading, setLoading] = useState(true);

  // Menu state
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [menuForm, setMenuForm] = useState({ category: '', name: '', description: '', price: '', tags: '', available: true, preparationTime: 15 });
  const [menuSearch, setMenuSearch] = useState('');

  // Order state
  const [orderFilter, setOrderFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Cook Day state
  const [showCookDayModal, setShowCookDayModal] = useState(false);
  const [editCookDay, setEditCookDay] = useState(null);
  const [cookDayForm, setCookDayForm] = useState({ date: '', title: '', timeStart: '10:00', timeEnd: '20:00', maxOrders: 0, location: { name: '', address: '' }, notes: '' });

  // Settings state
  const [siteSettings, setSiteSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Settings loader
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get('/settings');
      setSiteSettings(res.data);
    } catch (err) { console.error('Settings load error:', err); }
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

  const updateSetting = (key, value) => {
    setSiteSettings(prev => ({ ...prev, [key]: value }));
  };

  const seedSampleData = async () => {
    setSeeding(true);
    try {
      const res = await api.post('/foodtruck/seed');
      if (res.data.seeded) {
        toast.success(res.data.message);
        loadMenu();
      } else {
        toast.info(res.data.message);
      }
    } catch (err) { toast.error('Failed to seed data'); }
    setSeeding(false);
  };

  // Filter social tab if not enabled
  const visibleTabs = TABS.filter(t => {
    if (t.key === 'social') {
      return enabledApps.length === 0 || enabledApps.includes('socialai');
    }
    return true;
  });

  const loadMenu = useCallback(async () => {
    try {
      const res = await api.get('/foodtruck/menu');
      setMenuItems(res.data);
    } catch (err) { console.error('Menu load error:', err); }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.get('/foodtruck/orders?limit=100');
      setOrders(res.data.orders || []);
    } catch (err) { console.error('Orders load error:', err); }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/foodtruck/orders/stats');
      setOrderStats(res.data);
    } catch (err) { console.error('Stats load error:', err); }
  }, []);

  const loadCookDays = useCallback(async () => {
    try {
      const res = await api.get('/foodtruck/cookdays');
      setCookDays(res.data);
    } catch (err) { console.error('Cook days load error:', err); }
  }, []);

  useEffect(() => {
    Promise.all([loadMenu(), loadOrders(), loadStats(), loadCookDays()])
      .finally(() => setLoading(false));
  }, [loadMenu, loadOrders, loadStats, loadCookDays]);

  useEffect(() => {
    if (tab === 'settings' && !siteSettings) loadSettings();
  }, [tab, siteSettings, loadSettings]);

  // ─── MENU ACTIONS ────────────────────────────────────
  const openCreateMenu = () => {
    setEditItem(null);
    setMenuForm({ category: '', name: '', description: '', price: '', image: '', tags: '', available: true, preparationTime: 15 });
    setShowMenuModal(true);
  };

  const openEditMenu = (item) => {
    setEditItem(item);
    setMenuForm({
      category: item.category, name: item.name, description: item.description || '',
      price: item.price, image: item.image || '', tags: (item.tags || []).join(', '), available: item.available,
      preparationTime: item.preparationTime || 15
    });
    setShowMenuModal(true);
  };

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    const data = { ...menuForm, price: Number(menuForm.price), tags: menuForm.tags.split(',').map(t => t.trim()).filter(Boolean) };
    try {
      if (editItem) {
        await api.put(`/foodtruck/menu/${editItem._id}`, data);
        toast.success('Item updated');
      } else {
        await api.post('/foodtruck/menu', data);
        toast.success('Item created');
      }
      setShowMenuModal(false);
      loadMenu();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save item');
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      await api.delete(`/foodtruck/menu/${id}`);
      toast.success('Deleted');
      loadMenu();
    } catch (err) { toast.error('Failed to delete'); }
  };

  const toggleAvailability = async (id) => {
    try {
      await api.patch(`/foodtruck/menu/${id}/toggle`);
      loadMenu();
    } catch (err) { toast.error('Failed to toggle'); }
  };

  // ─── ORDER ACTIONS ───────────────────────────────────
  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/foodtruck/orders/${orderId}/status`, { status });
      toast.success(`Order → ${status}`);
      loadOrders();
      loadStats();
    } catch (err) { toast.error('Failed to update order'); }
  };

  const markPaid = async (orderId) => {
    try {
      await api.put(`/foodtruck/orders/${orderId}/payment`, { status: 'paid' });
      toast.success('Marked as paid');
      loadOrders();
    } catch (err) { toast.error('Failed to update payment'); }
  };

  // ─── COOK DAY ACTIONS ───────────────────────────────
  const openCreateCookDay = () => {
    setEditCookDay(null);
    setCookDayForm({ date: '', title: '', timeStart: '10:00', timeEnd: '20:00', maxOrders: 0, location: { name: '', address: '' }, notes: '' });
    setShowCookDayModal(true);
  };

  const openEditCookDay = (day) => {
    setEditCookDay(day);
    setCookDayForm({
      date: day.date?.substring(0, 10) || '', title: day.title || '',
      timeStart: day.timeStart || '10:00', timeEnd: day.timeEnd || '20:00',
      maxOrders: day.maxOrders || 0, location: day.location || { name: '', address: '' },
      notes: day.notes || ''
    });
    setShowCookDayModal(true);
  };

  const handleCookDaySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editCookDay) {
        await api.put(`/foodtruck/cookdays/${editCookDay._id}`, cookDayForm);
        toast.success('Cook day updated');
      } else {
        await api.post('/foodtruck/cookdays', cookDayForm);
        toast.success('Cook day created');
      }
      setShowCookDayModal(false);
      loadCookDays();
    } catch (err) { toast.error('Failed to save cook day'); }
  };

  const deleteCookDay = async (id) => {
    if (!window.confirm('Delete this cook day?')) return;
    try {
      await api.delete(`/foodtruck/cookdays/${id}`);
      toast.success('Deleted');
      loadCookDays();
    } catch (err) { toast.error('Failed to delete'); }
  };

  // ─── DERIVED DATA ────────────────────────────────────
  const categories = [...new Set(menuItems.map(i => i.category))].sort();
  const filteredMenu = menuItems.filter(i =>
    !menuSearch || i.name.toLowerCase().includes(menuSearch.toLowerCase()) || i.category.toLowerCase().includes(menuSearch.toLowerCase())
  );
  const filteredOrders = orders.filter(o => orderFilter === 'all' || o.status === orderFilter);
  const upcomingCookDays = cookDays.filter(d => new Date(d.date) >= new Date(new Date().setHours(0,0,0,0)));

  if (loading) return <div className="loading-screen">Loading Food Truck...</div>;

  return (
    <div className="admin-page">
      <div className="container" style={{ padding: '1.5rem' }}>
        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
          {visibleTabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem',
                borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                background: tab === t.key ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: tab === t.key ? '#6ee7b7' : '#9ca3af',
                whiteSpace: 'nowrap'
              }}>
                <Icon size={16} /> {t.label}
                {t.key === 'orders' && orderStats.pending > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.6875rem', padding: '1px 6px', borderRadius: 10, marginLeft: 2 }}>{orderStats.pending}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══ DASHBOARD TAB ═══ */}
        {tab === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LayoutDashboard size={22} /> Dashboard
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Pending Orders', value: orderStats.pending || 0, color: '#f59e0b', icon: AlertCircle },
                { label: 'Preparing', value: orderStats.preparing || 0, color: '#8b5cf6', icon: ChefHat },
                { label: 'Today\'s Orders', value: orderStats.todayOrders || 0, color: '#3b82f6', icon: ShoppingCart },
                { label: 'This Month', value: orderStats.monthOrders || 0, color: '#10b981', icon: TrendingUp },
                { label: 'Revenue (Month)', value: `$${(orderStats.monthRevenue || 0).toFixed(0)}`, color: '#ec4899', icon: DollarSign },
                { label: 'Menu Items', value: menuItems.length, color: '#06b6d4', icon: Utensils },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#9ca3af', fontSize: '0.75rem' }}>
                      <Icon size={14} style={{ color: s.color }} /> {s.label}
                    </div>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</span>
                  </div>
                );
              })}
            </div>

            {/* Recent Orders */}
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '0.5rem' }}>Recent Orders</h3>
            {orders.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                <ShoppingCart size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                <p>No orders yet. They'll appear here once customers start ordering.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {orders.slice(0, 5).map(o => (
                  <div key={o._id} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#f3f4f6' }}>#{o.orderNumber}</strong>
                      <span style={{ color: '#9ca3af', marginLeft: 8, fontSize: '0.8125rem' }}>{o.customer?.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10b981' }}>${o.total?.toFixed(2)}</span>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: `${STATUS_COLORS[o.status]}20`, color: STATUS_COLORS[o.status], fontWeight: 600 }}>{o.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Cook Days */}
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Upcoming Cook Days</h3>
            {upcomingCookDays.length === 0 ? (
              <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
                <Calendar size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                <p>No upcoming cook days scheduled.</p>
                <button onClick={openCreateCookDay} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
                  <Plus size={14} /> Schedule a Cook Day
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {upcomingCookDays.slice(0, 5).map(d => (
                  <div key={d._id} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#f3f4f6' }}>{new Date(d.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                      <span style={{ color: '#9ca3af', marginLeft: 8, fontSize: '0.8125rem' }}>{d.title || d.location?.name || ''}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#9ca3af' }}>
                      <Clock size={14} /> {d.timeStart}–{d.timeEnd}
                      {d.orderCount > 0 && <span style={{ color: '#10b981', fontWeight: 600 }}>{d.orderCount} orders</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ MENU TAB ═══ */}
        {tab === 'menu' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Utensils size={22} /> Menu ({menuItems.length} items)
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                  <input placeholder="Search menu..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)}
                    style={{ paddingLeft: '2rem', fontSize: '0.8125rem', width: 180 }} />
                </div>
                <button onClick={openCreateMenu} className="btn btn-primary btn-sm"><Plus size={14} /> Add Item</button>
              </div>
            </div>

            {categories.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <Utensils size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>No menu items yet</h3>
                <p>Add your first menu item to get started.</p>
                <button onClick={openCreateMenu} className="btn btn-primary" style={{ marginTop: '1rem' }}><Plus size={16} /> Add First Item</button>
              </div>
            ) : (
              categories.map(cat => (
                <div key={cat} style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '0.5rem' }}>{cat}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {filteredMenu.filter(i => i.category === cat).map(item => (
                      <div key={item._id} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: item.available ? 1 : 0.5 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ color: '#f3f4f6' }}>{item.name}</strong>
                            {!item.available && <span style={{ fontSize: '0.6875rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '1px 6px', borderRadius: 4 }}>Unavailable</span>}
                            {item.tags?.map(t => (
                              <span key={t} style={{ fontSize: '0.625rem', background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', padding: '1px 5px', borderRadius: 3 }}>{t}</span>
                            ))}
                          </div>
                          {item.description && <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>{item.description}</p>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981' }}>${item.price.toFixed(2)}</span>
                          <button onClick={() => toggleAvailability(item._id)} className="btn btn-sm btn-secondary" title={item.available ? 'Mark unavailable' : 'Mark available'}>
                            {item.available ? <Eye size={14} /> : <XCircle size={14} />}
                          </button>
                          <button onClick={() => openEditMenu(item)} className="btn btn-sm btn-secondary"><Edit size={14} /></button>
                          <button onClick={() => deleteMenuItem(item._id)} className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'none' }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ ORDERS TAB ═══ */}
        {tab === 'orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={22} /> Orders ({filteredOrders.length})
              </h2>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {['all', ...ORDER_STATUSES].map(s => (
                  <button key={s} onClick={() => setOrderFilter(s)} style={{
                    padding: '0.25rem 0.625rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
                    background: orderFilter === s ? (s === 'all' ? 'rgba(255,255,255,0.1)' : `${STATUS_COLORS[s]}20`) : 'transparent',
                    color: orderFilter === s ? (s === 'all' ? '#f3f4f6' : STATUS_COLORS[s]) : '#6b7280'
                  }}>{s}</button>
                ))}
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <Package size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>No {orderFilter === 'all' ? '' : orderFilter} orders.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredOrders.map(o => (
                  <div key={o._id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div onClick={() => setExpandedOrder(expandedOrder === o._id ? null : o._id)}
                      style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <strong style={{ color: '#f3f4f6', fontFamily: 'monospace' }}>#{o.orderNumber}</strong>
                        <span style={{ color: '#d1d5db', fontSize: '0.8125rem' }}>{o.customer?.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{o.items?.length} items</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>${o.total?.toFixed(2)}</span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: `${STATUS_COLORS[o.status]}20`, color: STATUS_COLORS[o.status], fontWeight: 600 }}>{o.status}</span>
                        <span style={{ fontSize: '0.6875rem', padding: '2px 6px', borderRadius: 4, background: o.payment?.status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)', color: o.payment?.status === 'paid' ? '#6ee7b7' : '#fca5a5' }}>
                          {o.payment?.status || 'unpaid'}
                        </span>
                        {expandedOrder === o._id ? <ChevronUp size={16} style={{ color: '#6b7280' }} /> : <ChevronDown size={16} style={{ color: '#6b7280' }} />}
                      </div>
                    </div>
                    {expandedOrder === o._id && (
                      <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                          <div>
                            <h4 style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase' }}>Items</h4>
                            {o.items?.map((item, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#d1d5db', marginBottom: 2 }}>
                                <span>{item.quantity}× {item.name}</span>
                                <span style={{ color: '#9ca3af' }}>${item.subtotal?.toFixed(2)}</span>
                              </div>
                            ))}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '0.375rem', paddingTop: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                              <span style={{ color: '#6b7280' }}>Subtotal</span><span style={{ color: '#d1d5db' }}>${o.subtotal?.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                              <span style={{ color: '#6b7280' }}>GST</span><span style={{ color: '#d1d5db' }}>${o.tax?.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem', fontWeight: 700, marginTop: 2 }}>
                              <span style={{ color: '#d1d5db' }}>Total</span><span style={{ color: '#10b981' }}>${o.total?.toFixed(2)}</span>
                            </div>
                          </div>
                          <div>
                            <h4 style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase' }}>Details</h4>
                            <div style={{ fontSize: '0.8125rem', color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span><strong>Type:</strong> {o.orderType}</span>
                              <span><strong>Email:</strong> {o.customer?.email || '—'}</span>
                              <span><strong>Phone:</strong> {o.customer?.phone || '—'}</span>
                              {o.pickupDate && <span><strong>Pickup:</strong> {new Date(o.pickupDate).toLocaleDateString('en-AU')} {o.pickupTime}</span>}
                              {o.notes && <span><strong>Notes:</strong> {o.notes}</span>}
                              <span><strong>Ordered:</strong> {new Date(o.createdAt).toLocaleString('en-AU')}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                          {o.status !== 'cancelled' && o.status !== 'completed' && (
                            <>
                              {o.status === 'pending' && <button onClick={() => updateOrderStatus(o._id, 'confirmed')} className="btn btn-sm btn-primary">Confirm</button>}
                              {o.status === 'confirmed' && <button onClick={() => updateOrderStatus(o._id, 'preparing')} className="btn btn-sm btn-primary">Start Preparing</button>}
                              {o.status === 'preparing' && <button onClick={() => updateOrderStatus(o._id, 'ready')} className="btn btn-sm btn-primary">Mark Ready</button>}
                              {o.status === 'ready' && <button onClick={() => updateOrderStatus(o._id, 'completed')} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: 'none' }}>Complete</button>}
                              <button onClick={() => updateOrderStatus(o._id, 'cancelled')} className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: 'none' }}>Cancel</button>
                            </>
                          )}
                          {o.payment?.status !== 'paid' && (
                            <button onClick={() => markPaid(o._id)} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: 'none' }}>
                              <DollarSign size={12} /> Mark Paid
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ COOK DAYS TAB ═══ */}
        {tab === 'cookdays' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={22} /> Cook Days
              </h2>
              <button onClick={openCreateCookDay} className="btn btn-primary btn-sm"><Plus size={14} /> Add Cook Day</button>
            </div>

            {cookDays.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <Calendar size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>No cook days scheduled</h3>
                <p>Schedule your first cook day to start accepting orders for specific dates.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {cookDays.map(d => {
                  const isPast = new Date(d.date) < new Date(new Date().setHours(0,0,0,0));
                  return (
                    <div key={d._id} className="card" style={{ padding: '1rem', opacity: isPast ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <strong style={{ color: '#f3f4f6', fontSize: '1rem' }}>
                              {new Date(d.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </strong>
                            {d.status === 'cancelled' && <span style={{ fontSize: '0.6875rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '1px 6px', borderRadius: 4 }}>Cancelled</span>}
                          </div>
                          {d.title && <div style={{ color: '#d1d5db', fontSize: '0.875rem' }}>{d.title}</div>}
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.375rem', fontSize: '0.8125rem', color: '#9ca3af' }}>
                            <span><Clock size={13} style={{ verticalAlign: 'middle' }} /> {d.timeStart} – {d.timeEnd}</span>
                            {d.location?.name && <span><MapPin size={13} style={{ verticalAlign: 'middle' }} /> {d.location.name}</span>}
                            <span><ShoppingCart size={13} style={{ verticalAlign: 'middle' }} /> {d.orderCount || 0} orders</span>
                            {d.revenue > 0 && <span><DollarSign size={13} style={{ verticalAlign: 'middle' }} /> ${d.revenue.toFixed(0)}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button onClick={() => openEditCookDay(d)} className="btn btn-sm btn-secondary"><Edit size={14} /></button>
                          <button onClick={() => deleteCookDay(d._id)} className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: 'none' }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ SOCIAL TAB — Embedded SocialAI ═══ */}
        {tab === 'social' && <SocialAI embedded />}

        {/* ═══ SETTINGS TAB ═══ */}
        {tab === 'settings' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={22} /> App Settings
            </h2>

            {settingsLoading ? <div className="page-loading">Loading settings...</div> : siteSettings && (
              <>
                {/* Branding */}
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
                      <input value={siteSettings.brandTagline || ''} onChange={e => updateSetting('brandTagline', e.target.value)} placeholder="e.g. Brisbane's Best BBQ" />
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
                      <input value={siteSettings.brandLogoUrl || ''} onChange={e => updateSetting('brandLogoUrl', e.target.value)} placeholder="https://... or upload via Branding tab in Admin Settings" />
                      {siteSettings.brandLogoUrl && <img src={siteSettings.brandLogoUrl} alt="Logo" style={{ marginTop: '0.5rem', maxHeight: 60, borderRadius: 8, objectFit: 'contain' }} />}
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Hero / Banner Image URL</label>
                      <input value={siteSettings.brandHeroImage || ''} onChange={e => updateSetting('brandHeroImage', e.target.value)} placeholder="https://..." />
                      {siteSettings.brandHeroImage && <img src={siteSettings.brandHeroImage} alt="Hero" style={{ marginTop: '0.5rem', maxHeight: 100, borderRadius: 8, objectFit: 'cover', width: '100%' }} />}
                    </div>
                  </div>
                </div>

                {/* Business Info */}
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

                {/* Save + Seed */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {menuItems.length === 0 && (
                      <button onClick={seedSampleData} className="btn btn-secondary" disabled={seeding}>
                        {seeding ? <Loader2 size={14} className="spin" /> : <Layers size={14} />} Seed Sample Menu
                      </button>
                    )}
                  </div>
                  <button onClick={saveSettings} className="btn btn-primary" disabled={savingSettings}>
                    {savingSettings ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save All Settings
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ MENU MODAL ═══ */}
        {showMenuModal && (
          <div className="modal-overlay" onClick={() => setShowMenuModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <h2>{editItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
              <form onSubmit={handleMenuSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Category *</label>
                    <input type="text" required placeholder="e.g. Mains, Sides, Drinks" value={menuForm.category}
                      onChange={e => setMenuForm(p => ({ ...p, category: e.target.value }))} list="cat-list" />
                    <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                  <div className="form-group">
                    <label>Price ($) *</label>
                    <input type="number" step="0.01" min="0" required value={menuForm.price}
                      onChange={e => setMenuForm(p => ({ ...p, price: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Item Name *</label>
                  <input type="text" required placeholder="e.g. Pulled Pork Burger" value={menuForm.name}
                    onChange={e => setMenuForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={2} placeholder="Short description..." value={menuForm.description}
                    onChange={e => setMenuForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Tags (comma-separated)</label>
                    <input type="text" placeholder="vegan, gluten-free, spicy" value={menuForm.tags}
                      onChange={e => setMenuForm(p => ({ ...p, tags: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Prep Time (min)</label>
                    <input type="number" min="0" value={menuForm.preparationTime}
                      onChange={e => setMenuForm(p => ({ ...p, preparationTime: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Image URL</label>
                  <input type="text" placeholder="https://..." value={menuForm.image || ''}
                    onChange={e => setMenuForm(p => ({ ...p, image: e.target.value }))} />
                  {menuForm.image && <img src={menuForm.image} alt="Preview" style={{ marginTop: '0.375rem', maxHeight: 80, borderRadius: 6, objectFit: 'cover' }} />}
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowMenuModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Item'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ COOK DAY MODAL ═══ */}
        {showCookDayModal && (
          <div className="modal-overlay" onClick={() => setShowCookDayModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <h2>{editCookDay ? 'Edit Cook Day' : 'Add Cook Day'}</h2>
              <form onSubmit={handleCookDaySubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Date *</label>
                    <input type="date" required value={cookDayForm.date}
                      onChange={e => setCookDayForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Title</label>
                    <input type="text" placeholder="e.g. Saturday Markets" value={cookDayForm.title}
                      onChange={e => setCookDayForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Start Time</label>
                    <input type="time" value={cookDayForm.timeStart}
                      onChange={e => setCookDayForm(p => ({ ...p, timeStart: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input type="time" value={cookDayForm.timeEnd}
                      onChange={e => setCookDayForm(p => ({ ...p, timeEnd: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Location Name</label>
                    <input type="text" placeholder="e.g. Redcliffe Markets" value={cookDayForm.location?.name || ''}
                      onChange={e => setCookDayForm(p => ({ ...p, location: { ...p.location, name: e.target.value } }))} />
                  </div>
                  <div className="form-group">
                    <label>Max Orders (0 = unlimited)</label>
                    <input type="number" min="0" value={cookDayForm.maxOrders}
                      onChange={e => setCookDayForm(p => ({ ...p, maxOrders: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Location Address</label>
                  <input type="text" placeholder="Full address" value={cookDayForm.location?.address || ''}
                    onChange={e => setCookDayForm(p => ({ ...p, location: { ...p.location, address: e.target.value } }))} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea rows={2} placeholder="Internal notes..." value={cookDayForm.notes}
                    onChange={e => setCookDayForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowCookDayModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editCookDay ? 'Save Changes' : 'Create Cook Day'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodTruck;
