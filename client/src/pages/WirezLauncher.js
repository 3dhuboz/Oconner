import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import WirezApp from '../apps/wirez/App';

const WirezLauncher = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tenantConfig, setTenantConfig] = useState(null);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const load = async () => {
      try {
        const res = await api.get('/marketplace/tenant-config/wirez');
        setTenantConfig(res.data.tenantConfig || {});
        setBranding(res.data.whiteLabel || {});
      } catch (err) {
        const msg = err.response?.data?.message || err.message;
        if (err.response?.status === 404) {
          setError('You need an active Wirez subscription to access this app. Visit the Marketplace to subscribe.');
        } else if (err.response?.status === 403) {
          setError('Your Wirez subscription is not active. Please renew to continue.');
        } else {
          setError(msg);
        }
      }
      setLoading(false);
    };
    load();
  }, [user, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1117', color: '#8a94a6' }}>
        Loading Wirez...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1117', color: '#e8ecf0', textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <h2 style={{ marginBottom: 8 }}>Wirez</h2>
        <p style={{ color: '#8a94a6', maxWidth: 400, lineHeight: 1.7, marginBottom: 24 }}>{error}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/marketplace')} style={{ padding: '10px 20px', background: '#f5a623', color: '#000', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            View Marketplace
          </button>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', background: '#1e2333', color: '#e8ecf0', border: '1px solid #2a3047', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <WirezApp
      tenantConfig={tenantConfig}
      branding={branding}
      onExit={() => navigate('/dashboard')}
    />
  );
};

export default WirezLauncher;
