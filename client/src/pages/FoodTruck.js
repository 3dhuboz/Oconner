import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Utensils, ShoppingCart, Calendar, Sparkles,
  Plus, Edit, Trash2, ChevronDown, ChevronUp, DollarSign, Clock,
  CheckCircle, XCircle, Package, MapPin, Search, Filter,
  TrendingUp, AlertCircle, Eye, ChefHat, Settings, Save, Loader2,
  Palette, Globe, Image, Layers, Users, RefreshCw, Truck, Tag,
  Building2, BarChart3, Pause, Play
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
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { key: 'drivers', label: 'Drivers', icon: Truck },
  { key: 'stock', label: 'Stock', icon: Package },
  { key: 'promocodes', label: 'Promo Codes', icon: Tag },
  { key: 'delivery', label: 'Delivery', icon: MapPin },
  { key: 'suppliers', label: 'Suppliers', icon: Building2 },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
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

  // Customer state
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '' });

  // Subscription state
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editSubscription, setEditSubscription] = useState(null);
  const [subscriptionForm, setSubscriptionForm] = useState({ customerId: '', menuItemId: '', frequency: 'weekly', nextDelivery: '' });

  // Driver state
  const [driverSessions, setDriverSessions] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);

  // Stock state
  const [lowStock, setLowStock] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockAdjustItem, setStockAdjustItem] = useState(null);
  const [stockForm, setStockForm] = useState({ quantity: 0, reason: '' });

  // Promo Code state
  const [promoCodes, setPromoCodes] = useState([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editPromo, setEditPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({ code: '', type: 'percentage', value: '', maxUses: '', expiresAt: '', active: true });

  // Delivery state
  const [deliveryRuns, setDeliveryRuns] = useState([]);
  const [deliveryStops, setDeliveryStops] = useState([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ date: '', driverName: '', zones: '' });
  const [expandedRun, setExpandedRun] = useState(null);

  // Supplier state
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', contactName: '', email: '', phone: '', active: true });

  // Reports state
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportData, setReportData] = useState({ revenue: null, topItems: [], orderTrends: [] });
  const [reportPeriod, setReportPeriod] = useState('thisMonth');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

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

  const loadCustomers = useCallback(async (q = '') => {
    setCustomersLoading(true);
    try {
      const res = await api.get(`/foodtruck/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setCustomers(res.data);
    } catch (err) { console.error('Customers load error:', err); }
    setCustomersLoading(false);
  }, []);

  const loadSubscriptions = useCallback(async () => {
    setSubscriptionsLoading(true);
    try {
      const res = await api.get('/foodtruck/subscriptions');
      setSubscriptions(res.data);
    } catch (err) { console.error('Subscriptions load error:', err); }
    setSubscriptionsLoading(false);
  }, []);

  const loadDriverSessions = useCallback(async () => {
    setDriversLoading(true);
    try {
      const res = await api.get('/foodtruck/delivery/driver-sessions/active');
      setDriverSessions(res.data);
    } catch (err) { console.error('Driver sessions load error:', err); }
    setDriversLoading(false);
  }, []);

  const loadStock = useCallback(async () => {
    setStockLoading(true);
    try {
      const [lowRes, movRes] = await Promise.all([
        api.get('/foodtruck/stock/low-stock'),
        api.get('/foodtruck/stock/movements')
      ]);
      setLowStock(lowRes.data);
      setStockMovements(movRes.data);
    } catch (err) { console.error('Stock load error:', err); }
    setStockLoading(false);
  }, []);

  const loadPromoCodes = useCallback(async () => {
    setPromoLoading(true);
    try {
      const res = await api.get('/foodtruck/promo-codes');
      setPromoCodes(res.data);
    } catch (err) { console.error('Promo codes load error:', err); }
    setPromoLoading(false);
  }, []);

  const loadDeliveryRuns = useCallback(async () => {
    setDeliveryLoading(true);
    try {
      const [runsRes, stopsRes] = await Promise.all([
        api.get('/foodtruck/delivery/runs'),
        api.get('/foodtruck/delivery/stops')
      ]);
      setDeliveryRuns(runsRes.data);
      setDeliveryStops(stopsRes.data);
    } catch (err) { console.error('Delivery load error:', err); }
    setDeliveryLoading(false);
  }, []);

  const loadSuppliers = useCallback(async () => {
    setSuppliersLoading(true);
    try {
      const res = await api.get('/foodtruck/suppliers');
      setSuppliers(res.data);
    } catch (err) { console.error('Suppliers load error:', err); }
    setSuppliersLoading(false);
  }, []);

  const loadReports = useCallback(async (period, dateFrom, dateTo) => {
    setReportsLoading(true);
    try {
      let params = '';
      if (period === 'custom' && dateFrom && dateTo) {
        params = `?from=${dateFrom}&to=${dateTo}`;
      } else if (period === 'lastMonth') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 10);
        const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().substring(0, 10);
        params = `?from=${start}&to=${end}`;
      } else {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
        const end = now.toISOString().substring(0, 10);
        params = `?from=${start}&to=${end}`;
      }
      const res = await api.get(`/foodtruck/orders/stats${params}`);
      setReportData({ revenue: res.data.monthRevenue || res.data.revenue || 0, topItems: res.data.topItems || [], orderTrends: res.data.orderTrends || [] });
    } catch (err) { console.error('Reports load error:', err); }
    setReportsLoading(false);
  }, []);

  useEffect(() => {
    Promise.all([loadMenu(), loadOrders(), loadStats(), loadCookDays()])
      .finally(() => setLoading(false));
  }, [loadMenu, loadOrders, loadStats, loadCookDays]);

  useEffect(() => {
    if (tab === 'settings' && !siteSettings) loadSettings();
  }, [tab, siteSettings, loadSettings]);

  useEffect(() => {
    if (tab === 'customers') loadCustomers(customerSearch);
  }, [tab, customerSearch, loadCustomers]);

  useEffect(() => {
    if (tab === 'subscriptions') loadSubscriptions();
  }, [tab, loadSubscriptions]);

  useEffect(() => {
    if (tab === 'drivers') loadDriverSessions();
  }, [tab, loadDriverSessions]);

  useEffect(() => {
    if (tab === 'stock') loadStock();
  }, [tab, loadStock]);

  useEffect(() => {
    if (tab === 'promocodes') loadPromoCodes();
  }, [tab, loadPromoCodes]);

  useEffect(() => {
    if (tab === 'delivery') loadDeliveryRuns();
  }, [tab, loadDeliveryRuns]);

  useEffect(() => {
    if (tab === 'suppliers') loadSuppliers();
  }, [tab, loadSuppliers]);

  useEffect(() => {
    if (tab === 'reports') loadReports(reportPeriod, reportDateFrom, reportDateTo);
  }, [tab, reportPeriod, reportDateFrom, reportDateTo, loadReports]);

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

  // ─── CUSTOMER ACTIONS ──────────────────────────────────
  const openCreateCustomer = () => {
    setEditCustomer(null);
    setCustomerForm({ name: '', email: '', phone: '' });
    setShowCustomerModal(true);
  };

  const openEditCustomer = (c) => {
    setEditCustomer(c);
    setCustomerForm({ name: c.name || '', email: c.email || '', phone: c.phone || '' });
    setShowCustomerModal(true);
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editCustomer) {
        await api.put(`/foodtruck/customers/${editCustomer._id}`, customerForm);
        toast.success('Customer updated');
      } else {
        await api.post('/foodtruck/customers', customerForm);
        toast.success('Customer created');
      }
      setShowCustomerModal(false);
      loadCustomers(customerSearch);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save customer'); }
  };

  const toggleBlacklist = async (id) => {
    try {
      await api.patch(`/foodtruck/customers/${id}/blacklist`);
      toast.success('Blacklist status updated');
      loadCustomers(customerSearch);
    } catch (err) { toast.error('Failed to update blacklist'); }
  };

  // ─── SUBSCRIPTION ACTIONS ─────────────────────────────
  const openCreateSubscription = () => {
    setEditSubscription(null);
    setSubscriptionForm({ customerId: '', menuItemId: '', frequency: 'weekly', nextDelivery: '' });
    setShowSubscriptionModal(true);
  };

  const openEditSubscription = (s) => {
    setEditSubscription(s);
    setSubscriptionForm({
      customerId: s.customerId || '', menuItemId: s.menuItemId || '',
      frequency: s.frequency || 'weekly', nextDelivery: s.nextDelivery?.substring(0, 10) || ''
    });
    setShowSubscriptionModal(true);
  };

  const handleSubscriptionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editSubscription) {
        await api.put(`/foodtruck/subscriptions/${editSubscription._id}`, subscriptionForm);
        toast.success('Subscription updated');
      } else {
        await api.post('/foodtruck/subscriptions', subscriptionForm);
        toast.success('Subscription created');
      }
      setShowSubscriptionModal(false);
      loadSubscriptions();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save subscription'); }
  };

  const toggleSubscriptionPause = async (id) => {
    try {
      await api.patch(`/foodtruck/subscriptions/${id}/pause`);
      toast.success('Subscription status updated');
      loadSubscriptions();
    } catch (err) { toast.error('Failed to update subscription'); }
  };

  const generateSubscriptionOrder = async (id) => {
    try {
      await api.post(`/foodtruck/subscriptions/${id}/generate-order`);
      toast.success('Order generated from subscription');
      loadSubscriptions();
    } catch (err) { toast.error('Failed to generate order'); }
  };

  // ─── DRIVER ACTIONS ───────────────────────────────────
  const startDriverSession = async () => {
    const name = window.prompt('Enter driver name:');
    if (!name) return;
    try {
      await api.post('/foodtruck/delivery/driver-sessions', { driverName: name });
      toast.success('Driver session started');
      loadDriverSessions();
    } catch (err) { toast.error('Failed to start session'); }
  };

  const endDriverSession = async (id) => {
    try {
      await api.patch(`/foodtruck/delivery/driver-sessions/${id}/end`);
      toast.success('Driver session ended');
      loadDriverSessions();
    } catch (err) { toast.error('Failed to end session'); }
  };

  // ─── STOCK ACTIONS ────────────────────────────────────
  const openStockAdjust = (item) => {
    setStockAdjustItem(item);
    setStockForm({ quantity: 0, reason: '' });
    setShowStockModal(true);
  };

  const handleStockAdjust = async (e) => {
    e.preventDefault();
    try {
      await api.post('/foodtruck/stock/adjust', { menuItemId: stockAdjustItem._id, quantity: Number(stockForm.quantity), reason: stockForm.reason });
      toast.success('Stock adjusted');
      setShowStockModal(false);
      loadStock();
    } catch (err) { toast.error('Failed to adjust stock'); }
  };

  // ─── PROMO CODE ACTIONS ───────────────────────────────
  const openCreatePromo = () => {
    setEditPromo(null);
    setPromoForm({ code: '', type: 'percentage', value: '', maxUses: '', expiresAt: '', active: true });
    setShowPromoModal(true);
  };

  const openEditPromo = (p) => {
    setEditPromo(p);
    setPromoForm({
      code: p.code || '', type: p.type || 'percentage', value: p.value || '',
      maxUses: p.maxUses || '', expiresAt: p.expiresAt?.substring(0, 10) || '', active: p.active !== false
    });
    setShowPromoModal(true);
  };

  const handlePromoSubmit = async (e) => {
    e.preventDefault();
    const data = { ...promoForm, value: Number(promoForm.value), maxUses: promoForm.maxUses ? Number(promoForm.maxUses) : null };
    try {
      if (editPromo) {
        await api.put(`/foodtruck/promo-codes/${editPromo._id}`, data);
        toast.success('Promo code updated');
      } else {
        await api.post('/foodtruck/promo-codes', data);
        toast.success('Promo code created');
      }
      setShowPromoModal(false);
      loadPromoCodes();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save promo code'); }
  };

  const deletePromoCode = async (id) => {
    if (!window.confirm('Delete this promo code?')) return;
    try {
      await api.delete(`/foodtruck/promo-codes/${id}`);
      toast.success('Deleted');
      loadPromoCodes();
    } catch (err) { toast.error('Failed to delete'); }
  };

  // ─── DELIVERY ACTIONS ─────────────────────────────────
  const openCreateDeliveryRun = () => {
    setDeliveryForm({ date: '', driverName: '', zones: '' });
    setShowDeliveryModal(true);
  };

  const handleDeliveryRunSubmit = async (e) => {
    e.preventDefault();
    const data = { ...deliveryForm, zones: deliveryForm.zones.split(',').map(z => z.trim()).filter(Boolean) };
    try {
      await api.post('/foodtruck/delivery/runs', data);
      toast.success('Delivery run created');
      setShowDeliveryModal(false);
      loadDeliveryRuns();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create delivery run'); }
  };

  const autoAssignStops = async (runId) => {
    try {
      await api.post(`/foodtruck/delivery/runs/${runId}/auto-assign`);
      toast.success('Stops auto-assigned');
      loadDeliveryRuns();
    } catch (err) { toast.error('Failed to auto-assign'); }
  };

  // ─── SUPPLIER ACTIONS ─────────────────────────────────
  const openCreateSupplier = () => {
    setEditSupplier(null);
    setSupplierForm({ name: '', contactName: '', email: '', phone: '', active: true });
    setShowSupplierModal(true);
  };

  const openEditSupplier = (s) => {
    setEditSupplier(s);
    setSupplierForm({
      name: s.name || '', contactName: s.contactName || '', email: s.email || '',
      phone: s.phone || '', active: s.active !== false
    });
    setShowSupplierModal(true);
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editSupplier) {
        await api.put(`/foodtruck/suppliers/${editSupplier._id}`, supplierForm);
        toast.success('Supplier updated');
      } else {
        await api.post('/foodtruck/suppliers', supplierForm);
        toast.success('Supplier created');
      }
      setShowSupplierModal(false);
      loadSuppliers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save supplier'); }
  };

  const deleteSupplier = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await api.delete(`/foodtruck/suppliers/${id}`);
      toast.success('Deleted');
      loadSuppliers();
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

        {/* ═══ CUSTOMERS TAB ═══ */}
        {tab === 'customers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={22} /> Customers ({customers.length})
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                  <input placeholder="Search customers..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                    style={{ paddingLeft: '2rem', fontSize: '0.8125rem', width: 180 }} />
                </div>
                <button onClick={openCreateCustomer} className="btn btn-primary btn-sm"><Plus size={14} /> Add Customer</button>
              </div>
            </div>

            {customersLoading ? <div className="page-loading">Loading customers...</div> : customers.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>No customers found</h3>
                <p>Customers will appear here once they place orders or are added manually.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {customers.map(c => (
                  <div key={c._id} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: c.blacklisted ? 0.5 : 1 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ color: '#f3f4f6' }}>{c.name}</strong>
                        {c.blacklisted && <span style={{ fontSize: '0.6875rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '1px 6px', borderRadius: 4 }}>Blacklisted</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>
                        {c.email && <span style={{ marginRight: 12 }}>{c.email}</span>}
                        {c.phone && <span>{c.phone}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8125rem', color: '#d1d5db' }}>{c.orderCount || 0} orders</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10b981' }}>${(c.totalSpent || 0).toFixed(2)}</span>
                      <button onClick={() => toggleBlacklist(c._id)} className="btn btn-sm" style={{ background: c.blacklisted ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)', color: c.blacklisted ? '#6ee7b7' : '#fca5a5', border: 'none', fontSize: '0.6875rem' }}>
                        {c.blacklisted ? 'Unblock' : 'Blacklist'}
                      </button>
                      <button onClick={() => openEditCustomer(c)} className="btn btn-sm btn-secondary"><Edit size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SUBSCRIPTIONS TAB ═══ */}
        {tab === 'subscriptions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={22} /> Subscriptions ({subscriptions.length})
              </h2>
              <button onClick={openCreateSubscription} className="btn btn-primary btn-sm"><Plus size={14} /> Add Subscription</button>
            </div>

            {subscriptionsLoading ? <div className="page-loading">Loading subscriptions...</div> : subscriptions.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <RefreshCw size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>No subscriptions yet</h3>
                <p>Create recurring subscriptions for your regular customers.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {subscriptions.map(s => (
                  <div key={s._id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <strong style={{ color: '#f3f4f6' }}>{s.customerName || s.customerId}</strong>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: s.status === 'active' ? 'rgba(16,185,129,0.15)' : s.status === 'paused' ? 'rgba(245,158,11,0.15)' : 'rgba(107,114,128,0.15)', color: s.status === 'active' ? '#6ee7b7' : s.status === 'paused' ? '#fcd34d' : '#9ca3af', fontWeight: 600 }}>{s.status}</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                        <span style={{ marginRight: 12 }}>Frequency: {s.frequency}</span>
                        {s.nextDelivery && <span>Next: {new Date(s.nextDelivery).toLocaleDateString('en-AU')}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => toggleSubscriptionPause(s._id)} className="btn btn-sm btn-secondary" title={s.status === 'active' ? 'Pause' : 'Resume'}>
                        {s.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button onClick={() => generateSubscriptionOrder(s._id)} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: 'none' }} title="Generate Order">
                        <ShoppingCart size={14} />
                      </button>
                      <button onClick={() => openEditSubscription(s)} className="btn btn-sm btn-secondary"><Edit size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ DRIVERS TAB ═══ */}
        {tab === 'drivers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={22} /> Active Drivers ({driverSessions.length})
              </h2>
              <button onClick={startDriverSession} className="btn btn-primary btn-sm"><Plus size={14} /> Start Session</button>
            </div>

            {driversLoading ? <div className="page-loading">Loading drivers...</div> : driverSessions.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <Truck size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>No active driver sessions</h3>
                <p>Start a driver session to begin tracking deliveries.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {driverSessions.map(d => (
                  <div key={d._id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <strong style={{ color: '#f3f4f6' }}>{d.driverName}</strong>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: d.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: d.status === 'active' ? '#6ee7b7' : '#9ca3af', fontWeight: 600 }}>{d.status}</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                        Completed: {d.completedStops || 0} / {d.totalStops || 0} stops
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => endDriverSession(d._id)} className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: 'none' }}>End Session</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ STOCK TAB ═══ */}
        {tab === 'stock' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={22} /> Stock Levels
              </h2>
              <button onClick={() => loadStock()} className="btn btn-secondary btn-sm"><RefreshCw size={14} /> Refresh</button>
            </div>

            {stockLoading ? <div className="page-loading">Loading stock...</div> : (
              <>
                {lowStock.length > 0 && (
                  <>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fca5a5', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <AlertCircle size={16} /> Low Stock Alerts
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.5rem' }}>
                      {lowStock.map(item => (
                        <div key={item._id} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #ef4444' }}>
                          <div>
                            <strong style={{ color: '#f3f4f6' }}>{item.name}</strong>
                            <span style={{ fontSize: '0.8125rem', color: '#fca5a5', marginLeft: 8 }}>Stock: {item.stockOnHand}</span>
                          </div>
                          <button onClick={() => openStockAdjust(item)} className="btn btn-sm btn-primary">Adjust</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '0.5rem' }}>All Tracked Items</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.5rem' }}>
                  {menuItems.filter(i => i.stockOnHand !== null && i.stockOnHand !== undefined).map(item => (
                    <div key={item._id} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: '#f3f4f6' }}>{item.name}</strong>
                        <span style={{ fontSize: '0.8125rem', color: '#9ca3af', marginLeft: 8 }}>{item.category}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: (item.stockOnHand || 0) <= 5 ? '#fca5a5' : '#10b981' }}>{item.stockOnHand}</span>
                        <button onClick={() => openStockAdjust(item)} className="btn btn-sm btn-secondary">Adjust</button>
                      </div>
                    </div>
                  ))}
                </div>

                {stockMovements.length > 0 && (
                  <>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '0.5rem' }}>Recent Movements</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {stockMovements.slice(0, 20).map((m, i) => (
                        <div key={i} className="card" style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                          <div style={{ color: '#d1d5db' }}>
                            <strong>{m.itemName || m.menuItemId}</strong>
                            <span style={{ color: '#9ca3af', marginLeft: 8 }}>{m.reason}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontWeight: 700, color: m.quantity > 0 ? '#6ee7b7' : '#fca5a5' }}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{new Date(m.createdAt).toLocaleString('en-AU')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ PROMO CODES TAB ═══ */}
        {tab === 'promocodes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={22} /> Promo Codes ({promoCodes.length})
              </h2>
              <button onClick={openCreatePromo} className="btn btn-primary btn-sm"><Plus size={14} /> Add Promo Code</button>
            </div>

            {promoLoading ? <div className="page-loading">Loading promo codes...</div> : promoCodes.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <Tag size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>No promo codes yet</h3>
                <p>Create promo codes to offer discounts to your customers.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {promoCodes.map(p => (
                  <div key={p._id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: p.active ? 1 : 0.5 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <strong style={{ color: '#f3f4f6', fontFamily: 'monospace', fontSize: '1rem' }}>{p.code}</strong>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: p.active ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: p.active ? '#6ee7b7' : '#9ca3af', fontWeight: 600 }}>{p.active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                        <span style={{ marginRight: 12 }}>{p.type === 'percentage' ? `${p.value}% off` : `$${p.value} off`}</span>
                        <span style={{ marginRight: 12 }}>Used: {p.usedCount || 0}{p.maxUses ? `/${p.maxUses}` : ''}</span>
                        {p.expiresAt && <span>Expires: {new Date(p.expiresAt).toLocaleDateString('en-AU')}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => openEditPromo(p)} className="btn btn-sm btn-secondary"><Edit size={14} /></button>
                      <button onClick={() => deletePromoCode(p._id)} className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'none' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ DELIVERY TAB ═══ */}
        {tab === 'delivery' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={22} /> Delivery Runs ({deliveryRuns.length})
              </h2>
              <button onClick={openCreateDeliveryRun} className="btn btn-primary btn-sm"><Plus size={14} /> Create Run</button>
            </div>

            {deliveryLoading ? <div className="page-loading">Loading delivery runs...</div> : deliveryRuns.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <MapPin size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>No delivery runs yet</h3>
                <p>Create a delivery run to start managing deliveries.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {deliveryRuns.map(r => {
                  const runStops = deliveryStops.filter(s => s.runId === r._id);
                  return (
                    <div key={r._id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      <div onClick={() => setExpandedRun(expandedRun === r._id ? null : r._id)}
                        style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <strong style={{ color: '#f3f4f6' }}>{new Date(r.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                            <span style={{ color: '#d1d5db', fontSize: '0.8125rem' }}>{r.driverName}</span>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: r.status === 'completed' ? 'rgba(16,185,129,0.15)' : r.status === 'in_progress' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)', color: r.status === 'completed' ? '#6ee7b7' : r.status === 'in_progress' ? '#93c5fd' : '#fcd34d', fontWeight: 600 }}>{r.status}</span>
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                            {r.zones?.length > 0 && <span style={{ marginRight: 12 }}>Zones: {r.zones.join(', ')}</span>}
                            <span>{runStops.length} stops</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button onClick={(e) => { e.stopPropagation(); autoAssignStops(r._id); }} className="btn btn-sm btn-secondary" title="Auto-assign stops">
                            <RefreshCw size={14} />
                          </button>
                          {expandedRun === r._id ? <ChevronUp size={16} style={{ color: '#6b7280' }} /> : <ChevronDown size={16} style={{ color: '#6b7280' }} />}
                        </div>
                      </div>
                      {expandedRun === r._id && runStops.length > 0 && (
                        <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ marginTop: '0.75rem' }}>
                            {runStops.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)).map((stop, i) => (
                              <div key={stop._id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: '#d1d5db', padding: '0.375rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <div>
                                  <span style={{ color: '#6b7280', marginRight: 8 }}>#{stop.sequence || i + 1}</span>
                                  <span>{stop.address}</span>
                                </div>
                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: stop.status === 'delivered' ? 'rgba(16,185,129,0.15)' : stop.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.15)', color: stop.status === 'delivered' ? '#6ee7b7' : stop.status === 'failed' ? '#fca5a5' : '#9ca3af', fontWeight: 600 }}>{stop.status}</span>
                              </div>
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

        {/* ═══ SUPPLIERS TAB ═══ */}
        {tab === 'suppliers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={22} /> Suppliers ({suppliers.length})
              </h2>
              <button onClick={openCreateSupplier} className="btn btn-primary btn-sm"><Plus size={14} /> Add Supplier</button>
            </div>

            {suppliersLoading ? <div className="page-loading">Loading suppliers...</div> : suppliers.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <Building2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>No suppliers yet</h3>
                <p>Add your suppliers to keep track of your supply chain.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {suppliers.map(s => (
                  <div key={s._id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: s.active ? 1 : 0.5 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <strong style={{ color: '#f3f4f6' }}>{s.name}</strong>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: s.active ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: s.active ? '#6ee7b7' : '#9ca3af', fontWeight: 600 }}>{s.active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                        {s.contactName && <span style={{ marginRight: 12 }}>{s.contactName}</span>}
                        {s.email && <span style={{ marginRight: 12 }}>{s.email}</span>}
                        {s.phone && <span>{s.phone}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => openEditSupplier(s)} className="btn btn-sm btn-secondary"><Edit size={14} /></button>
                      <button onClick={() => deleteSupplier(s._id)} className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'none' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ REPORTS TAB ═══ */}
        {tab === 'reports' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={22} /> Reports
              </h2>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {[{ key: 'thisMonth', label: 'This Month' }, { key: 'lastMonth', label: 'Last Month' }, { key: 'custom', label: 'Custom' }].map(p => (
                  <button key={p.key} onClick={() => setReportPeriod(p.key)} style={{
                    padding: '0.25rem 0.625rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: 600,
                    background: reportPeriod === p.key ? 'rgba(16,185,129,0.15)' : 'transparent',
                    color: reportPeriod === p.key ? '#6ee7b7' : '#6b7280'
                  }}>{p.label}</button>
                ))}
              </div>
            </div>

            {reportPeriod === 'custom' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                <input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} style={{ fontSize: '0.8125rem' }} />
                <span style={{ color: '#6b7280' }}>to</span>
                <input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} style={{ fontSize: '0.8125rem' }} />
              </div>
            )}

            {reportsLoading ? <div className="page-loading">Loading reports...</div> : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Revenue', value: `$${(reportData.revenue || 0).toFixed(0)}`, color: '#10b981', icon: DollarSign },
                    { label: 'Total Orders', value: orderStats.totalOrders || 0, color: '#3b82f6', icon: ShoppingCart },
                    { label: 'Avg Order Value', value: `$${(orderStats.avgOrderValue || 0).toFixed(2)}`, color: '#8b5cf6', icon: TrendingUp },
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

                {reportData.topItems?.length > 0 && (
                  <>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '0.5rem' }}>Top Selling Items</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.5rem' }}>
                      {reportData.topItems.map((item, i) => (
                        <div key={i} className="card" style={{ padding: '0.625rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.8125rem', width: 20 }}>#{i + 1}</span>
                            <strong style={{ color: '#f3f4f6' }}>{item.name}</strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>{item.quantity} sold</span>
                            <span style={{ fontWeight: 700, color: '#10b981' }}>${(item.revenue || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {reportData.orderTrends?.length > 0 && (
                  <>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d1d5db', marginBottom: '0.5rem' }}>Order Trends</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {reportData.orderTrends.map((t, i) => (
                        <div key={i} className="card" style={{ padding: '0.625rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#d1d5db', fontSize: '0.8125rem' }}>{t.date || t.period}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>{t.count} orders</span>
                            <span style={{ fontWeight: 700, color: '#10b981' }}>${(t.revenue || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
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

        {/* ═══ CUSTOMER MODAL ═══ */}
        {showCustomerModal && (
          <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <h2>{editCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
              <form onSubmit={handleCustomerSubmit}>
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" required placeholder="Full name" value={customerForm.name}
                    onChange={e => setCustomerForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" placeholder="email@example.com" value={customerForm.email}
                      onChange={e => setCustomerForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="text" placeholder="0400 000 000" value={customerForm.phone}
                      onChange={e => setCustomerForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowCustomerModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editCustomer ? 'Save Changes' : 'Add Customer'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ SUBSCRIPTION MODAL ═══ */}
        {showSubscriptionModal && (
          <div className="modal-overlay" onClick={() => setShowSubscriptionModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <h2>{editSubscription ? 'Edit Subscription' : 'Add Subscription'}</h2>
              <form onSubmit={handleSubscriptionSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Customer *</label>
                    <select required value={subscriptionForm.customerId}
                      onChange={e => setSubscriptionForm(p => ({ ...p, customerId: e.target.value }))}>
                      <option value="">Select customer...</option>
                      {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Menu Item *</label>
                    <select required value={subscriptionForm.menuItemId}
                      onChange={e => setSubscriptionForm(p => ({ ...p, menuItemId: e.target.value }))}>
                      <option value="">Select item...</option>
                      {menuItems.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Frequency *</label>
                    <select required value={subscriptionForm.frequency}
                      onChange={e => setSubscriptionForm(p => ({ ...p, frequency: e.target.value }))}>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Next Delivery</label>
                    <input type="date" value={subscriptionForm.nextDelivery}
                      onChange={e => setSubscriptionForm(p => ({ ...p, nextDelivery: e.target.value }))} />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowSubscriptionModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editSubscription ? 'Save Changes' : 'Create Subscription'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ STOCK ADJUST MODAL ═══ */}
        {showStockModal && (
          <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <h2>Adjust Stock: {stockAdjustItem?.name}</h2>
              <form onSubmit={handleStockAdjust}>
                <div className="form-group">
                  <label>Quantity (+/-) *</label>
                  <input type="number" required placeholder="e.g. 10 or -5" value={stockForm.quantity}
                    onChange={e => setStockForm(p => ({ ...p, quantity: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Reason</label>
                  <input type="text" placeholder="e.g. Restock, Damaged, Sold" value={stockForm.reason}
                    onChange={e => setStockForm(p => ({ ...p, reason: e.target.value }))} />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowStockModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Adjust Stock</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ PROMO CODE MODAL ═══ */}
        {showPromoModal && (
          <div className="modal-overlay" onClick={() => setShowPromoModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <h2>{editPromo ? 'Edit Promo Code' : 'Add Promo Code'}</h2>
              <form onSubmit={handlePromoSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Code *</label>
                    <input type="text" required placeholder="e.g. SUMMER20" value={promoForm.code}
                      onChange={e => setPromoForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} style={{ fontFamily: 'monospace' }} />
                  </div>
                  <div className="form-group">
                    <label>Type *</label>
                    <select required value={promoForm.type}
                      onChange={e => setPromoForm(p => ({ ...p, type: e.target.value }))}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Value *</label>
                    <input type="number" step="0.01" min="0" required placeholder={promoForm.type === 'percentage' ? 'e.g. 20' : 'e.g. 5.00'} value={promoForm.value}
                      onChange={e => setPromoForm(p => ({ ...p, value: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Max Uses (blank = unlimited)</label>
                    <input type="number" min="0" placeholder="Unlimited" value={promoForm.maxUses}
                      onChange={e => setPromoForm(p => ({ ...p, maxUses: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Expires At</label>
                  <input type="date" value={promoForm.expiresAt}
                    onChange={e => setPromoForm(p => ({ ...p, expiresAt: e.target.value }))} />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowPromoModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editPromo ? 'Save Changes' : 'Create Promo Code'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ DELIVERY RUN MODAL ═══ */}
        {showDeliveryModal && (
          <div className="modal-overlay" onClick={() => setShowDeliveryModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <h2>Create Delivery Run</h2>
              <form onSubmit={handleDeliveryRunSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Date *</label>
                    <input type="date" required value={deliveryForm.date}
                      onChange={e => setDeliveryForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Driver Name *</label>
                    <input type="text" required placeholder="Driver name" value={deliveryForm.driverName}
                      onChange={e => setDeliveryForm(p => ({ ...p, driverName: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Zones (comma-separated)</label>
                  <input type="text" placeholder="e.g. North, South, CBD" value={deliveryForm.zones}
                    onChange={e => setDeliveryForm(p => ({ ...p, zones: e.target.value }))} />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowDeliveryModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Run</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ SUPPLIER MODAL ═══ */}
        {showSupplierModal && (
          <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <h2>{editSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <form onSubmit={handleSupplierSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Business Name *</label>
                    <input type="text" required placeholder="Supplier name" value={supplierForm.name}
                      onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Contact Name</label>
                    <input type="text" placeholder="Contact person" value={supplierForm.contactName}
                      onChange={e => setSupplierForm(p => ({ ...p, contactName: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" placeholder="email@supplier.com" value={supplierForm.email}
                      onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="text" placeholder="0400 000 000" value={supplierForm.phone}
                      onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowSupplierModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editSupplier ? 'Save Changes' : 'Add Supplier'}</button>
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
