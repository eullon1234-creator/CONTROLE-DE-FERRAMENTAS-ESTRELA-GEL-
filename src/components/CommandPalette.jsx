import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, COLLECTIONS } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Search, 
  X, 
  FileText, 
  Wrench, 
  Users, 
  Hammer, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [termos, setTermos] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [osList, setOsList] = useState([]);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery('');
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Load data for fast searching
  useEffect(() => {
    if (!isOpen) return;

    const unsubs = [
      onSnapshot(collection(db, COLLECTIONS.TERMOS), (s) => {
        const list = [];
        s.forEach(d => list.push({ id: d.id, ...d.data() }));
        setTermos(list);
      }),
      onSnapshot(collection(db, COLLECTIONS.EQUIPAMENTOS), (s) => {
        const list = [];
        s.forEach(d => list.push({ id: d.id, ...d.data() }));
        setEquipamentos(list);
      }),
      onSnapshot(collection(db, COLLECTIONS.COLABORADORES), (s) => {
        const list = [];
        s.forEach(d => list.push({ id: d.id, ...d.data() }));
        setColaboradores(list);
      }),
      onSnapshot(collection(db, COLLECTIONS.OS_CONSERTO), (s) => {
        const list = [];
        s.forEach(d => list.push({ id: d.id, ...d.data() }));
        setOsList(list);
      })
    ];

    return () => unsubs.forEach(u => u());
  }, [isOpen]);

  // Filtered and grouped results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const items = [];

    // 1. Termos
    termos.forEach(t => {
      const matchCollab = (t.colaboradorNome || '').toLowerCase().includes(q);
      const matchDesc = (t.descricaoMaterial || '').toLowerCase().includes(q);
      const matchTag = (t.tag || t.codEquipamento || '').toLowerCase().includes(q);
      const matchNTermo = String(t.nTermo || '').toLowerCase().includes(q);

      if (matchCollab || matchDesc || matchTag || matchNTermo) {
        items.push({
          type: 'termo',
          category: 'Termos de Responsabilidade',
          icon: FileText,
          id: t.id,
          title: t.descricaoMaterial || 'Item sem descrição',
          subtitle: `${t.colaboradorNome || 'Sem colaborador'} • TAG: ${t.tag || t.codEquipamento || 'S/N'}`,
          badge: t.status || 'ATIVO',
          badgeColor: t.status === 'ATIVO' ? 'var(--color-success)' : 'var(--text-muted)',
          path: '/termos'
        });
      }
    });

    // 2. Equipamentos
    equipamentos.forEach(eq => {
      const matchTag = (eq.tag || eq.id || '').toLowerCase().includes(q);
      const matchDesc = (eq.descricao || '').toLowerCase().includes(q);
      const matchGrupo = (eq.grupo || '').toLowerCase().includes(q);

      if (matchTag || matchDesc || matchGrupo) {
        items.push({
          type: 'equipamento',
          category: 'Catálogo de Equipamentos',
          icon: Wrench,
          id: eq.id,
          title: eq.descricao || eq.tag,
          subtitle: `TAG: ${eq.tag || eq.id} • Grupo: ${eq.grupo || 'Geral'}`,
          badge: eq.status || 'Disponível',
          badgeColor: eq.status === 'Em Manutenção' ? 'var(--color-warning)' : 'var(--color-primary-light)',
          path: '/equipamentos'
        });
      }
    });

    // 3. Colaboradores
    colaboradores.forEach(c => {
      const matchNome = (c.nome || '').toLowerCase().includes(q);
      const matchMatricula = (c.matricula || '').toLowerCase().includes(q);
      const matchFuncao = (c.funcao || '').toLowerCase().includes(q);

      if (matchNome || matchMatricula || matchFuncao) {
        items.push({
          type: 'colaborador',
          category: 'Colaboradores',
          icon: Users,
          id: c.id,
          title: c.nome,
          subtitle: `Matrícula: ${c.matricula || '-'} • Função: ${c.funcao || '-'}`,
          badge: `${c.totalItensAtivos || 0} cautelas`,
          badgeColor: 'var(--color-accent)',
          path: '/colaboradores'
        });
      }
    });

    // 4. Consertos / OS
    osList.forEach(os => {
      const matchOS = String(os.nOS || '').toLowerCase().includes(q);
      const matchTag = (os.tag || '').toLowerCase().includes(q);
      const matchDesc = (os.descricao || '').toLowerCase().includes(q);
      const matchFornec = (os.fornecedor || '').toLowerCase().includes(q);

      if (matchOS || matchTag || matchDesc || matchFornec) {
        items.push({
          type: 'os',
          category: 'Consertos & Ordens de Serviço',
          icon: Hammer,
          id: os.id,
          title: `OS #${os.nOS || '-'} — ${os.descricao || os.tag}`,
          subtitle: `TAG: ${os.tag || '-'} • Fornecedor: ${os.fornecedor || 'Interno'}`,
          badge: os.status || 'Enviado',
          badgeColor: os.status === 'Retornado' ? 'var(--color-success)' : 'var(--color-warning)',
          path: '/consertos'
        });
      }
    });

    return items.slice(0, 25);
  }, [query, termos, equipamentos, colaboradores, osList]);

  const handleSelectItem = useCallback((item) => {
    navigate(item.path);
    onClose();
  }, [navigate, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (results.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % (results.length || 1));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelectItem(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, handleSelectItem, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '80px',
        paddingLeft: '16px',
        paddingRight: '16px',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: 'var(--bg-app)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          animation: 'paletteSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes paletteSlide {
            from { transform: translateY(-16px) scale(0.98); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
          }
        `}</style>

        {/* Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-card)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)'
        }}>
          <Search size={20} style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar por termo, TAG, colaborador, OS ou equipamento..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              flexGrow: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '1.05rem',
              fontFamily: 'var(--font-heading)'
            }}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          ) : (
            <span style={{
              fontSize: '0.72rem',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted)',
              fontWeight: 600
            }}>
              ESC para fechar
            </span>
          )}
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          style={{
            maxHeight: '420px',
            overflowY: 'auto',
            padding: '8px'
          }}
        >
          {query.trim() === '' ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Sparkles size={28} style={{ color: 'var(--color-accent)', opacity: 0.8 }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Digite qualquer termo para pesquisar em todo o sistema</p>
              <span style={{ fontSize: '0.78rem' }}>Exemplos: "Martelete", "SILVA", "OS 104", "TAG 042"</span>
            </div>
          ) : results.length === 0 ? (
            <div style={{
              padding: '36px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Nenhum resultado encontrado para "{query}"</p>
              <span style={{ fontSize: '0.8rem' }}>Verifique se digitou corretamente ou tente outro termo.</span>
            </div>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.type}-${item.id}-${idx}`}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    border: isSelected ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary-light)',
                      flexShrink: 0
                    }}>
                      <Icon size={18} />
                    </div>

                    <div style={{ overflow: 'hidden' }}>
                      <div style={{
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.title}
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px'
                      }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      color: item.badgeColor,
                      border: `1px solid ${item.badgeColor}33`,
                      textTransform: 'uppercase'
                    }}>
                      {item.badge}
                    </span>
                    <ArrowRight size={14} style={{ color: isSelected ? 'var(--color-primary-light)' : 'var(--text-muted)' }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 18px',
          borderTop: '1px solid var(--border-card)',
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span>↑↓ para navegar</span>
            <span>↵ para abrir</span>
          </div>
          <span>GEL Ferramentaria & Termos</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
