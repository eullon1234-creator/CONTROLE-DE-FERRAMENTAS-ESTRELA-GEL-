import React, { useState, useEffect } from 'react';
import { auth, db, COLLECTIONS } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Component and page imports
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Termos from './pages/Termos';
import Equipamentos from './pages/Equipamentos';
import Colaboradores from './pages/Colaboradores';
import Importador from './pages/Importador';
import Consertos from './pages/Consertos';
import TermoPrint from './pages/TermoPrint';
import TermoConsolidatedPrint from './pages/TermoConsolidatedPrint';
import OSPrint from './pages/OSPrint';
import ColaboradorHistoryPrint from './pages/ColaboradorHistoryPrint';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Printing state variables
  const [printTerm, setPrintTerm] = useState(null);
  const [printConsolidated, setPrintConsolidated] = useState(null); // { collaborator, items }
  const [printOS, setPrintOS] = useState(null); // OS to print
  const [printHistorico, setPrintHistorico] = useState(null); // { collaborator, terms, osList }

  // PWA States
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState('pc');

  // Temporary Migration to correct 'discartado' / 'discartada' spelling in observations
  useEffect(() => {
    if (localStorage.getItem('spelling_migration_v1') === 'true') return;

    const runMigration = async () => {
      try {
        console.log("Iniciando migração de correção ortográfica...");
        
        // 1. Corrigir Termos
        const termosRef = collection(db, COLLECTIONS.TERMOS);
        const termosSnap = await getDocs(termosRef);
        let termosCount = 0;
        for (const docSnap of termosSnap.docs) {
          const data = docSnap.data();
          if (data.observacao && (data.observacao.toLowerCase().includes('discartado') || data.observacao.toLowerCase().includes('discartada'))) {
            const newObs = data.observacao
              .replace(/discartado/gi, 'descartado')
              .replace(/discartada/gi, 'descartada');
            await updateDoc(doc(db, COLLECTIONS.TERMOS, docSnap.id), { observacao: newObs });
            termosCount++;
            console.log(`Termo corrigido (${docSnap.id}): "${data.observacao}" -> "${newObs}"`);
          }
        }

        // 2. Corrigir OSs
        const osRef = collection(db, COLLECTIONS.OS_CONSERTO);
        const osSnap = await getDocs(osRef);
        let osCount = 0;
        for (const docSnap of osSnap.docs) {
          const data = docSnap.data();
          if (data.observacao && (data.observacao.toLowerCase().includes('discartado') || data.observacao.toLowerCase().includes('discartada'))) {
            const newObs = data.observacao
              .replace(/discartado/gi, 'descartado')
              .replace(/discartada/gi, 'descartada');
            await updateDoc(doc(db, COLLECTIONS.OS_CONSERTO, docSnap.id), { observacao: newObs });
            osCount++;
            console.log(`OS corrigida (${docSnap.id}): "${data.observacao}" -> "${newObs}"`);
          }
        }

        console.log(`Migração concluída! Termos corrigidos: ${termosCount}, OSs corrigidas: ${osCount}`);
        localStorage.setItem('spelling_migration_v1', 'true');
      } catch (err) {
        console.error("Erro na migração ortográfica:", err);
      }
    };
    runMigration();
  }, []);

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

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? '#090d16' : '#f4f6fc',
        color: theme === 'dark' ? '#ffffff' : '#0f172a',
        fontFamily: 'var(--font-heading)'
      }}>
        <h2>GEL Engenharia</h2>
        <span style={{ fontSize: '0.85rem', opacity: 0.5, marginTop: '8px' }}>Carregando controle de ferramentaria...</span>
      </div>
    );
  }

  // 1. If not authenticated, force Login
  if (!user) {
    return <Login />;
  }

  // 2. Render Printable Term View directly without Sidebar/Layout
  if (currentPage === 'print_termo' && printTerm) {
    return (
      <TermoPrint 
        term={printTerm} 
        onBack={() => {
          setPrintTerm(null);
          setCurrentPage('termos');
        }} 
      />
    );
  }

  // 3. Render Printable Consolidated Term View directly without Sidebar/Layout
  if (currentPage === 'print_consolidado' && printConsolidated) {
    return (
      <TermoConsolidatedPrint
        collaborator={printConsolidated.collaborator}
        items={printConsolidated.items}
        onBack={() => {
          setPrintConsolidated(null);
          setCurrentPage('colaboradores');
        }}
      />
    );
  }

  // 4. Render Printable OS View directly without Sidebar/Layout
  if (currentPage === 'print_os' && printOS) {
    return (
      <OSPrint
        os={printOS}
        onBack={() => {
          setPrintOS(null);
          setCurrentPage('consertos');
        }}
      />
    );
  }

  // 5. Render Printable Historico View directly without Sidebar/Layout
  if (currentPage === 'print_historico' && printHistorico) {
    return (
      <ColaboradorHistoryPrint
        collaborator={printHistorico.collaborator}
        terms={printHistorico.terms}
        osList={printHistorico.osList}
        onBack={() => {
          setPrintHistorico(null);
          setCurrentPage('colaboradores');
        }}
      />
    );
  }

  // 4. Main authenticated dashboard layout
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      
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
      />

      {/* Pages Container */}
      <main style={{ flexGrow: 1, backgroundColor: 'var(--bg-app)', transition: 'background-color 0.3s' }}>
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'termos' && <Termos onPrintTerm={handlePrintTerm} />}
        {currentPage === 'equipamentos' && <Equipamentos />}
        {currentPage === 'colaboradores' && <Colaboradores onPrintConsolidated={handlePrintConsolidated} onPrintHistorico={handlePrintHistorico} />}
        {currentPage === 'consertos' && <Consertos onPrintOS={handlePrintOS} />}
        {currentPage === 'importador' && <Importador />}
      </main>

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
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
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

    </div>
  );
};

export default App;
