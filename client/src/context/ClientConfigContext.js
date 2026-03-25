import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const ClientConfigContext = createContext({
  clientMode: false,
  enabledApps: [],
  brandName: '',
  brandTagline: '',
  primaryColor: '#7c3aed',
  loading: true,
});

export const ClientConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    clientMode: false,
    enabledApps: [],
    brandName: '',
    brandTagline: '',
    primaryColor: '#7c3aed',
    loading: true,
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await api.get('/config');
        setConfig({ ...res.data, loading: false });
      } catch (err) {
        // If config fails, assume not client mode (pennywiseit.com.au)
        setConfig(prev => ({ ...prev, loading: false }));
      }
    };
    loadConfig();
  }, []);

  return (
    <ClientConfigContext.Provider value={config}>
      {children}
    </ClientConfigContext.Provider>
  );
};

export const useClientConfig = () => useContext(ClientConfigContext);
