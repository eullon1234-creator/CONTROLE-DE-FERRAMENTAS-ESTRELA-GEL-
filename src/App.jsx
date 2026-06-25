import React, { useState, useEffect } from 'react';
import { auth } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

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

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Printing state variables
  const [printTerm, setPrintTerm] = useState(null);
  const [printConsolidated, setPrintConsolidated] = useState(null); // { collaborator, items }
  const [printOS, setPrintOS] = useState(null); // OS to print

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
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
      />

      {/* Pages Container */}
      <main style={{ flexGrow: 1, backgroundColor: 'var(--bg-app)', transition: 'background-color 0.3s' }}>
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'termos' && <Termos onPrintTerm={handlePrintTerm} />}
        {currentPage === 'equipamentos' && <Equipamentos />}
        {currentPage === 'colaboradores' && <Colaboradores onPrintConsolidated={handlePrintConsolidated} />}
        {currentPage === 'consertos' && <Consertos onPrintOS={handlePrintOS} />}
        {currentPage === 'importador' && <Importador />}
      </main>

    </div>
  );
};

export default App;
