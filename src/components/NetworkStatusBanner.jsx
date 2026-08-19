import { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const NetworkStatusBanner = () => {
  const { isOnline } = useNetworkStatus();
  const [showOnlineAlert, setShowOnlineAlert] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWasOffline(true);
    } else if (wasOffline) {
      const timer1 = setTimeout(() => setShowOnlineAlert(true), 0);
      const timer2 = setTimeout(() => {
        setShowOnlineAlert(false);
        setWasOffline(false);
      }, 4000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showOnlineAlert) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 999999,
      padding: '8px 16px',
      fontSize: '0.82rem',
      fontFamily: 'var(--font-heading)',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      backgroundColor: !isOnline ? '#92400e' : '#065f46',
      color: '#ffffff',
      borderBottom: !isOnline ? '1px solid #b45309' : '1px solid #059669',
      animation: 'slideDown 0.3s ease forwards'
    }}>
      {!isOnline ? (
        <>
          <WifiOff size={16} style={{ color: '#fef3c7', flexShrink: 0 }} />
          <span>
            <strong>Modo Offline (Obra):</strong> Sem internet. Consultas de TAG e termos habilitadas via cache local.
          </span>
        </>
      ) : (
        <>
          <CheckCircle2 size={16} style={{ color: '#a7f3d0', flexShrink: 0 }} />
          <span>
            <strong>Online:</strong> Conexão restabelecida! Dados sincronizados com a nuvem.
          </span>
        </>
      )}
    </div>
  );
};

export default NetworkStatusBanner;
