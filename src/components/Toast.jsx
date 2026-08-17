import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

/**
 * Toast notification types and their styling
 */
const TOAST_STYLES = {
  success: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
    color: '#10b981',
    icon: '✓'
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    icon: '✕'
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    color: '#f59e0b',
    icon: '⚠'
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.3)',
    color: '#3b82f6',
    icon: 'ℹ'
  }
};

let toastId = 0;

/**
 * Provider component that wraps the app to enable toast notifications everywhere.
 * Usage: wrap your app with <ToastProvider> then use the useToast() hook.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    
    // Start exit animation
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    }, duration - 300);

    // Remove from DOM
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const toast = useCallback({
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  }, [addToast]);

  // Fix: useCallback can't take an object, use useMemo-like pattern
  const toastApi = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      
      {/* Toast Container */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: '10px',
          pointerEvents: 'none',
          maxWidth: '420px',
          width: '100%'
        }}>
          <style>{`
            @keyframes toastSlideIn {
              from { transform: translateX(120%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            @keyframes toastSlideOut {
              from { transform: translateX(0); opacity: 1; }
              to { transform: translateX(120%); opacity: 0; }
            }
          `}</style>
          {toasts.map(t => {
            const style = TOAST_STYLES[t.type] || TOAST_STYLES.info;
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  backgroundColor: style.bg,
                  border: `1px solid ${style.border}`,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  color: 'var(--text-primary, #0f172a)',
                  fontFamily: 'var(--font-body, sans-serif)',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  animation: t.exiting 
                    ? 'toastSlideOut 0.3s ease forwards' 
                    : 'toastSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onClick={() => removeToast(t.id)}
                role="alert"
              >
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: style.color,
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {style.icon}
                </span>
                <span style={{ flex: 1 }}>{t.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
};

/**
 * Hook to use toast notifications anywhere in the component tree.
 * @returns {{ success: Function, error: Function, warning: Function, info: Function }}
 * 
 * @example
 * const toast = useToast();
 * toast.success('Item salvo com sucesso!');
 * toast.error('Erro ao deletar item.');
 * toast.warning('Atenção: item já cautelado.');
 * toast.info('Relatório exportado.');
 */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if used outside provider — won't crash the app
    return {
      success: (msg) => console.log('[Toast:success]', msg),
      error: (msg) => console.error('[Toast:error]', msg),
      warning: (msg) => console.warn('[Toast:warning]', msg),
      info: (msg) => console.info('[Toast:info]', msg),
    };
  }
  return ctx;
};
