import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { auth } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Menu, Search, Sun, Moon, Tag, Sparkles } from 'lucide-react';
import logoImg from './assets/logo.png';

// Component and page imports with Lazy Loading (Code Splitting)
import Sidebar from './components/Sidebar';
import LoadingSpinner from './components/LoadingSpinner';
import CommandPalette from './components/CommandPalette';
import NetworkStatusBanner from './components/NetworkStatusBanner';
import QuickTagLookupModal from './components/QuickTagLookupModal';
import MobileBottomNav from './components/MobileBottomNav';
import AiAssistantModal from './components/AiAssistantModal';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Termos = lazy(() => import('./pages/Termos'));
const Equipamentos = lazy(() => import('./pages/Equipamentos'));
const Colaboradores = lazy(() => import('./pages/Colaboradores'));
const Importador = lazy(() => import('./pages/Importador'));
const Consertos = lazy(() => import('./pages/Consertos'));
const TermoPrint = lazy(() => import('./pages/TermoPrint'));
const TermoConsolidatedPrint = lazy(() => import('./pages/TermoConsolidatedPrint'));
const OSPrint = lazy(() => import('./pages/OSPrint'));
const ColaboradorHistoryPrint = lazy(() => import('./pages/ColaboradorHistoryPrint'));
const RelatorioPrint = lazy(() => import('./pages/RelatorioPrint'));

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Mobile Drawer, Quick Tag, AI Assistant & Global Search States
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTagLookupOpen, setIsTagLookupOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Printing state variables
  const [printTerm, setPrintTerm] = useState(null);
  const [printConsolidated, setPrintConsolidated] = useState(null);
  const [printOS, setPrintOS] = useState(null);
  const [printHistorico, setPrintHistorico] = useState(null);
  const [printRelatorio, setPrintRelatorio] = useState(null);

  // PWA States
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState('pc');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Update theme attribute on root HTML element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Global Ctrl+K / Cmd+K shortcut for Command Palette
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentPage('dashboard');
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const handlePrintTerm = (term) => {
    setPrintTerm(term);
    setCurrentPage('print_termo');
  };

  const handlePrintConsolidated = (collaborator, items) => {
    setPrintConsolidated({ collaborator, items });
    setCurrentPage('print_consolidado');
  };

  const handlePrintOS = (os) => {
    setPrintOS(os);
    setCurrentPage('print_os');
  };

  const handlePrintHistorico = (collaborator, terms, osList) => {
    setPrintHistorico({ collaborator, terms, osList });
    setCurrentPage('print_historico');
  };

  const handlePrintRelatorio = (type, items) => {
    setPrintRelatorio({ type, items });
    setCurrentPage('print_relatorio');
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Carregando controle de ferramentaria..." />;
  }

  // Fallback visual de carregamento
  const loadingFallback = <LoadingSpinner message="Carregando módulo..." />;

  // 1. If not authenticated, force Login
  if (!user) {
    return (
      <Suspense fallback={loadingFallback}>
        <Login />
      </Suspense>
    );
  }

  // 2. Render Printable Term View directly without Sidebar/Layout
  if (currentPage === 'print_termo' && printTerm) {
    return (
      <Suspense fallback={loadingFallback}>
        <TermoPrint 
          term={printTerm} 
          onBack={() => {
            setPrintTerm(null);
            setCurrentPage('termos');
          }} 
        />
      </Suspense>
    );
  }

  // 3. Render Printable Consolidated Term View directly without Sidebar/Layout
  if (currentPage === 'print_consolidado' && printConsolidated) {
    return (
      <Suspense fallback={loadingFallback}>
        <TermoConsolidatedPrint
          collaborator={printConsolidated.collaborator}
          items={printConsolidated.items}
          onBack={() => {
            setPrintConsolidated(null);
            setCurrentPage('colaboradores');
          }}
        />
      </Suspense>
    );
  }

  // 4. Render Printable OS View directly without Sidebar/Layout
  if (currentPage === 'print_os' && printOS) {
    return (
      <Suspense fallback={loadingFallback}>
        <OSPrint
          os={printOS}
          onBack={() => {
            setPrintOS(null);
            setCurrentPage('consertos');
          }}
        />
      </Suspense>
    );
  }

  // 5. Render Printable Historico View directly without Sidebar/Layout
  if (currentPage === 'print_historico' && printHistorico) {
    return (
      <Suspense fallback={loadingFallback}>
        <ColaboradorHistoryPrint
          collaborator={printHistorico.collaborator}
          terms={printHistorico.terms}
          osList={printHistorico.osList}
          onBack={() => {
            setPrintHistorico(null);
            setCurrentPage('colaboradores');
          }}
        />
      </Suspense>
    );
  }

  // Render Printable Relatorio View directly without Sidebar/Layout
  if (currentPage === 'print_relatorio' && printRelatorio) {
    return (
      <Suspense fallback={loadingFallback}>
        <RelatorioPrint
          type={printRelatorio.type}
          items={printRelatorio.items}
          onBack={() => {
            const backPage = printRelatorio.type === 'ativas' ? 'termos' : 'consertos';
            setPrintRelatorio(null);
            setCurrentPage(backPage);
          }}
        />
      </Suspense>
    );
  }

  // Main authenticated dashboard layout
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Network Status Banner (Offline / Online detector) */}
      <NetworkStatusBanner />
      
      {/* Mobile Topbar */}
      <header className="mobile-topbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px'
            }}
            aria-label="Abrir Menu"
          >
            <Menu size={24} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={logoImg} alt="GEL" style={{ height: '28px', width: '28px', borderRadius: '7px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }} />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.92rem', color: 'var(--color-primary-light)' }}>
              GEL <span style={{ color: 'var(--color-accent)' }}>ESTRELA</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* AI Assistant Button in Mobile Header */}
          <button
            onClick={() => setIsAiAssistantOpen(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.25) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#c4b5fd',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.78rem'
            }}
            aria-label="Abrir Assistente IA"
            title="Assistente IA"
          >
            <Sparkles size={15} color="#a78bfa" />
            <span>IA</span>
          </button>

          {/* Quick TAG button in mobile header */}
          <button
            onClick={() => setIsTagLookupOpen(true)}
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: 'var(--color-primary-light)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.78rem'
            }}
            aria-label="Consultar TAG da Ferramenta"
            title="Consultar TAG"
          >
            <Tag size={15} />
            <span>TAG</span>
          </button>

          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              padding: '8px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="Buscar"
          >
            <Search size={18} />
          </button>

          <button
            onClick={toggleTheme}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              padding: '8px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="Alternar Tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flexGrow: 1 }}>
        {/* Sidebar Navigation */}
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage} 
          theme={theme}
          toggleTheme={toggleTheme}
          user={user}
          handleLogout={handleLogout}
          showInstallBtn={!window.matchMedia('(display-mode: standalone)').matches}
          handleInstallApp={() => setIsInstallModalOpen(true)}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          onOpenSearch={() => setIsCommandPaletteOpen(true)}
          onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        />

        {/* Pages Container */}
        <main style={{ flexGrow: 1, backgroundColor: 'var(--bg-app)', transition: 'background-color 0.3s' }}>
          <Suspense fallback={loadingFallback}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/termos" element={<Termos onPrintTerm={handlePrintTerm} onPrintRelatorio={handlePrintRelatorio} />} />
              <Route path="/equipamentos" element={<Equipamentos />} />
              <Route path="/colaboradores" element={<Colaboradores onPrintConsolidated={handlePrintConsolidated} onPrintHistorico={handlePrintHistorico} />} />
              <Route path="/consertos" element={<Consertos onPrintOS={handlePrintOS} onPrintRelatorio={handlePrintRelatorio} />} />
              <Route path="/importador" element={<Importador />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav onOpenTagLookup={() => setIsTagLookupOpen(true)} />

      {/* Quick TAG Lookup Modal (Field / Offline Tool) */}
      <QuickTagLookupModal 
        isOpen={isTagLookupOpen}
        onClose={() => setIsTagLookupOpen(false)}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* PWA Installation Modal */}
      {isInstallModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-app)',
            border: '1px solid var(--border-card)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            padding: '24px',
            boxShadow: 'var(--shadow-glass)',
            display: 'flex',
            flexDirection: 'column',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            animation: 'slideUp 0.3s ease'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Instalar Aplicativo (PWA)
              </h3>
              <button 
                onClick={() => setIsInstallModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.4rem',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              Você pode instalar este aplicativo no seu celular ou computador. Ele funcionará como um aplicativo nativo, consumindo menos internet e abrindo de forma independente.
            </p>

            {/* Direct Install Button if supported */}
            {deferredPrompt && (
              <div style={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.08)', 
                border: '1px solid rgba(59, 130, 246, 0.2)', 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary-light)', marginBottom: '8px' }}>
                  Seu dispositivo suporta instalação direta!
                </h4>
                <button
                  onClick={async () => {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log('Installation prompt outcome:', outcome);
                    setDeferredPrompt(null);
                    setIsInstallModalOpen(false);
                  }}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    transition: 'background-color 0.2s'
                  }}
                >
                  Instalar Agora no Dispositivo
                </button>
              </div>
            )}

            {/* Tabs header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-card)', marginBottom: '16px', gap: '8px' }}>
              {[
                { id: 'pc', label: 'Computador (PC)' },
                { id: 'android', label: 'Android' },
                { id: 'ios', label: 'iPhone (iOS)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveInstallTab(tab.id)}
                  style={{
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeInstallTab === tab.id ? '2px solid var(--color-primary-light)' : '2px solid transparent',
                    color: activeInstallTab === tab.id ? 'var(--color-primary-light)' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flexGrow: 1, minHeight: '140px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {activeInstallTab === 'pc' && (
                <div>
                  <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>Abra o sistema usando o navegador <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>.</li>
                    <li>Olhe na barra de endereços (ao lado da barra de pesquisa) e clique no ícone de instalar 🖥️ (computador com uma seta para baixo) ou toque no menu e selecione <strong>"Instalar o app..."</strong>.</li>
                    <li>Confirme a instalação e um atalho será criado na sua Área de Trabalho.</li>
                  </ol>
                </div>
              )}
              
              {activeInstallTab === 'android' && (
                <div>
                  <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>Abra o link do sistema no navegador <strong>Google Chrome</strong> do celular.</li>
                    <li>Toque no botão de menu (três pontinhos no canto superior direito).</li>
                    <li>Selecione a opção <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong>.</li>
                    <li>Siga as instruções na tela para concluir.</li>
                  </ol>
                </div>
              )}

              {activeInstallTab === 'ios' && (
                <div>
                  <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>Abra o link do sistema pelo navegador <strong>Safari</strong> do iPhone.</li>
                    <li>Toque no ícone de <strong>Compartilhar</strong> (quadrado com uma seta apontando para cima na barra inferior).</li>
                    <li>Role a lista de opções para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
                    <li>Digite o nome do aplicativo e toque em <strong>"Adicionar"</strong> no canto superior direito.</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setIsInstallModalOpen(false)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-secondary)',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Assistant Action Button */}
      <button
        onClick={() => setIsAiAssistantOpen(true)}
        className="ai-floating-fab no-print"
        aria-label="Abrir Assistente Inteligente IA"
        title="Assistente IA do Almoxarifado"
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '30px',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(124, 58, 237, 0.45)',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: '0.88rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
          e.currentTarget.style.boxShadow = '0 12px 28px rgba(124, 58, 237, 0.65)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 58, 237, 0.45)';
        }}
      >
        <Sparkles size={18} color="#ffffff" />
        <span>GEL IA</span>
      </button>

      {/* AI Assistant Modal Window */}
      <AiAssistantModal 
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
      />

    </div>
  );
};

export default App;
