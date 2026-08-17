/**
 * Animated loading spinner with GEL branding.
 * Used as fallback for lazy-loaded pages and data loading states.
 */
const LoadingSpinner = ({ message = 'Carregando...', fullScreen = false }) => {
  const containerStyle = fullScreen ? {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'var(--bg-app)',
    gap: '20px'
  } : {
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px'
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes spinnerRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spinnerPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      
      {/* Spinning ring */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '3px solid var(--border-card, rgba(226,232,240,0.8))',
        borderTopColor: 'var(--color-primary-light, #3b82f6)',
        animation: 'spinnerRotate 0.8s linear infinite'
      }} />

      {/* Message */}
      <span style={{
        fontFamily: 'var(--font-heading, sans-serif)',
        fontSize: '0.9rem',
        color: 'var(--text-secondary, #475569)',
        fontWeight: 600,
        animation: 'spinnerPulse 1.5s ease-in-out infinite'
      }}>
        {message}
      </span>
    </div>
  );
};

export default LoadingSpinner;
