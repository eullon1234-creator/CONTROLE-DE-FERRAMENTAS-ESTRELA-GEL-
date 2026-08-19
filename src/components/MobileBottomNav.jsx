import { useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, Wrench, Hammer, Tag } from 'lucide-react';

export const MobileBottomNav = ({ onOpenTagLookup }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  return (
    <nav className="mobile-bottom-bar" aria-label="Navegação móvel de rodapé">
      <button 
        className={`bottom-nav-item ${currentPath === '/' ? 'active' : ''}`}
        onClick={() => navigate('/')}
        type="button"
      >
        <Home size={20} />
        <span>Início</span>
      </button>

      <button 
        className={`bottom-nav-item ${currentPath === '/termos' ? 'active' : ''}`}
        onClick={() => navigate('/termos')}
        type="button"
      >
        <FileText size={20} />
        <span>Termos</span>
      </button>

      {/* Center Primary Action: Quick TAG Lookup */}
      <button 
        className="bottom-nav-tag-btn"
        onClick={onOpenTagLookup}
        type="button"
        title="Consultar TAG da Ferramenta"
      >
        <div className="tag-btn-circle">
          <Tag size={22} />
        </div>
        <span>Consultar TAG</span>
      </button>

      <button 
        className={`bottom-nav-item ${currentPath === '/equipamentos' ? 'active' : ''}`}
        onClick={() => navigate('/equipamentos')}
        type="button"
      >
        <Wrench size={20} />
        <span>Ativos</span>
      </button>

      <button 
        className={`bottom-nav-item ${currentPath === '/consertos' ? 'active' : ''}`}
        onClick={() => navigate('/consertos')}
        type="button"
      >
        <Hammer size={20} />
        <span>OS / Manut.</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
