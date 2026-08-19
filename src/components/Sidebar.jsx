import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Wrench, 
  Users, 
  UploadCloud, 
  LogOut, 
  Sun, 
  Moon,
  Hammer,
  Search,
  X
} from 'lucide-react';
import logoImg from '../assets/logo.png';

const Sidebar = ({ 
  currentPage, 
  setCurrentPage, 
  theme, 
  toggleTheme, 
  user, 
  handleLogout, 
  showInstallBtn, 
  handleInstallApp,
  isOpen = false,
  onClose = () => {},
  onOpenSearch = () => {}
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'termos', path: '/termos', label: 'Termos de Resp.', icon: FileText },
    { id: 'equipamentos', path: '/equipamentos', label: 'Equipamentos', icon: Wrench },
    { id: 'consertos', path: '/consertos', label: 'Consertos / OS', icon: Hammer },
    { id: 'colaboradores', path: '/colaboradores', label: 'Colaboradores', icon: Users },
    { id: 'importador', path: '/importador', label: 'Importar Excel', icon: UploadCloud },
  ];

  const handleNavClick = (item) => {
    if (setCurrentPage) setCurrentPage(item.id);
    navigate(item.path);
    onClose();
  };

  return (
    <>
      {/* Backdrop for Mobile Drawer */}
      {isOpen && (
        <div 
          className="sidebar-backdrop no-print"
          onClick={onClose}
        />
      )}

      <aside className={`no-print sidebar-drawer ${isOpen ? 'open' : ''}`} style={{
        width: '280px',
        backgroundColor: 'var(--bg-sidebar)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 2000,
        padding: '24px',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
        overflowY: 'auto'
      }}>
        {/* Brand Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '20px',
          position: 'relative'
        }}>
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="mobile-close-btn"
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            marginBottom: '4px'
          }}>
            <img 
              src={logoImg} 
              alt="GEL Ferramentas" 
              style={{ 
                width: '68px',
                height: '68px',
                borderRadius: '16px',
                objectFit: 'cover',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
                border: '2px solid rgba(255, 255, 255, 0.15)'
              }} 
            />
          </div>
          
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h3 style={{ 
              fontFamily: 'var(--font-heading)', 
              fontSize: '1.15rem', 
              fontWeight: 800,
              color: 'var(--color-accent)',
              letterSpacing: '0.05em',
              margin: 0,
              textTransform: 'uppercase'
            }}>
              UHE ESTRELA
            </h3>
            <span style={{ 
              fontSize: '0.72rem', 
              color: 'rgba(255, 255, 255, 0.4)',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              display: 'block',
              marginTop: '2px'
            }}>
              Controle de Ferramentaria
            </span>
          </div>
        </div>

        {/* Global Search Trigger */}
        <button
          onClick={() => {
            onOpenSearch();
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            width: '100%',
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-heading)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={15} style={{ color: 'var(--color-primary-light)' }} />
            <span>Busca Geral...</span>
          </div>
          <kbd style={{
            fontSize: '0.7rem',
            padding: '2px 5px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            Ctrl+K
          </kbd>
        </button>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)) || currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: isActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.92rem',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User & Settings Footer */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {/* PWA Install Button */}
          {showInstallBtn && (
            <button
              onClick={() => {
                handleInstallApp();
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '9px',
                borderRadius: '6px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                color: '#93c5fd',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: '0.82rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.18)';
                e.currentTarget.style.color = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
                e.currentTarget.style.color = '#93c5fd';
              }}
            >
              <UploadCloud size={14} />
              Instalar Aplicativo
            </button>
          )}

          {/* Theme and User Info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 600, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email ? user.email.split('@')[0] : 'Operador'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                Almoxarifado Estrela
              </span>
            </div>
            
            <button
              onClick={toggleTheme}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Alternar Tema"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              handleLogout();
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '9px',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              color: '#f87171',
              cursor: 'pointer',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: '0.82rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
              e.currentTarget.style.color = '#f87171';
            }}
          >
            <LogOut size={14} />
            Sair do Sistema
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
