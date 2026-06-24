import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Wrench, 
  Users, 
  UploadCloud, 
  LogOut, 
  Sun, 
  Moon,
  Hammer
} from 'lucide-react';
import logoImg from '../assets/logo.png';

const Sidebar = ({ currentPage, setCurrentPage, theme, toggleTheme, user, handleLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'termos', label: 'Termos de Resp.', icon: FileText },
    { id: 'equipamentos', label: 'Equipamentos', icon: Wrench },
    { id: 'consertos', label: 'Consertos / OS', icon: Hammer },
    { id: 'colaboradores', label: 'Colaboradores', icon: Users },
    { id: 'importador', label: 'Importar Excel', icon: UploadCloud },
  ];

  return (
    <aside className="no-print" style={{
      width: '280px',
      backgroundColor: 'var(--bg-sidebar)',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      padding: '24px',
      boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)'
    }}>
      {/* Brand Header */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '40px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '20px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '10px 14px',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          <img 
            src={logoImg} 
            alt="GEL Logo" 
            style={{ 
              maxHeight: '40px',
              maxWidth: '100%',
              objectFit: 'contain'
            }} 
          />
        </div>
        
        <div style={{ textAlign: 'center', width: '100%' }}>
          <h3 style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: '1.2rem', 
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

      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: isActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.95rem',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
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
        paddingTop: '20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Theme and User Info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 600, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="Alternar Tema"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            color: '#f87171',
            cursor: 'pointer',
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: '0.85rem',
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
  );
};

export default Sidebar;
