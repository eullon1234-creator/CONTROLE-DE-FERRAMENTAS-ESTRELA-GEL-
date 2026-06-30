import React, { useState, useEffect } from 'react';
import { db, COLLECTIONS } from '../firebase/config';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { Search, User, Wrench, ChevronRight, FileText, Printer, ArrowLeft } from 'lucide-react';
import ColumnFilterPopover from '../components/ColumnFilterPopover';

const Colaboradores = ({ onPrintConsolidated, onPrintHistorico }) => {
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [osList, setOsList] = useState([]);
  
  const [activeFilters, setActiveFilters] = useState({
    nome: { selected: [], condition: { type: '', value: '' } },
    funcao: { selected: [], condition: { type: '', value: '' } },
    totalItensAtivos: { selected: [], condition: { type: '', value: '' } },
    totalItensDevolvidos: { selected: [], condition: { type: '', value: '' } }
  });
  const [sortConfig, setSortConfig] = useState({ key: 'nome', direction: 'asc' });
  
  // Selected collaborator for detail view
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [collabTermos, setCollabTermos] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.COLABORADORES), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort by Name
      list.sort((a, b) => a.nome.localeCompare(b.nome));
      setColaboradores(list);
      setLoading(false);
    });

    const unsubscribeOS = onSnapshot(collection(db, COLLECTIONS.OS_CONSERTO), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        list.push({
          id: doc.id,
          ...data,
          dateOSObj: data.dataOS?.toDate() || null,
          dateEnvioObj: data.dataEnvio?.toDate() || null,
          dateRetornoObj: data.dataRetorno?.toDate() || null,
        });
      });
      setOsList(list);
    });

    return () => {
      unsubscribe();
      unsubscribeOS();
    };
  }, []);

  // Fetch items for the selected collaborator
  useEffect(() => {
    if (!selectedCollab) {
      setCollabTermos([]);
      return;
    }

    setLoadingDetails(true);
    const q = query(
      collection(db, COLLECTIONS.TERMOS), 
      where("colaboradorId", "==", selectedCollab.id)
    );

    const unsubscribeDetails = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        list.push({
          id: doc.id,
          ...data,
          dateObj: data.dataEntrada?.toDate() || new Date(0),
          retDateObj: data.dataDevolucao?.toDate() || null
        });
      });
      // Sort by entry date (newest first)
      list.sort((a, b) => b.dateObj - a.dateObj);
      setCollabTermos(list);
      setLoadingDetails(false);
    });

    return () => unsubscribeDetails();
  }, [selectedCollab]);

  // Helper to extract unique values for filters
  const getUniqueValues = (key) => {
    const vals = colaboradores.map(c => c[key] || '-');
    return Array.from(new Set(vals)).sort((a, b) => String(a).localeCompare(String(b)));
  };

  const filteredCollabList = colaboradores.filter((c) => {
    const matchesSearch = 
      search.trim() === '' ||
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.funcao.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const evaluate = (itemVal, filterObj) => {
      const selected = filterObj?.selected || [];
      const condition = filterObj?.condition || null;

      if (condition && condition.type) {
        const type = condition.type;
        const condVal = String(condition.value).trim().toLowerCase();
        const itemValStr = String(itemVal).trim().toLowerCase();

        if (type === 'contains' && !itemValStr.includes(condVal)) return false;
        if (type === 'not_contains' && itemValStr.includes(condVal)) return false;
        if (type === 'starts_with' && !itemValStr.startsWith(condVal)) return false;
        if (type === 'ends_with' && !itemValStr.endsWith(condVal)) return false;
        if (type === 'equals' && itemValStr !== condVal) return false;
        if (type === 'empty' && itemValStr !== '' && itemValStr !== '-') return false;
        if (type === 'not_empty' && (itemValStr === '' || itemValStr === '-')) return false;

        const itemNum = Number(itemVal) || 0;
        const condNum = Number(condition.value) || 0;
        if (type === 'gt' && !(itemNum > condNum)) return false;
        if (type === 'gte' && !(itemNum >= condNum)) return false;
        if (type === 'lt' && !(itemNum < condNum)) return false;
        if (type === 'lte' && !(itemNum <= condNum)) return false;
        if (type === 'num_equals' && itemNum !== condNum) return false;
        if (type === 'num_not_equals' && itemNum === condNum) return false;
      }

      if (selected.length > 0) {
        if (selected.includes('__NONE_SELECTED__')) return false;
        return selected.includes(String(itemVal || '-'));
      }

      return true;
    };

    // Apply Column Filters
    return Object.keys(activeFilters).every(colKey => {
      const filterObj = activeFilters[colKey];
      const itemVal = String(c[colKey] || '-');
      return evaluate(itemVal, filterObj);
    });
  });

  const sortedCollabList = [...filteredCollabList].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];

    if (sortConfig.key === 'totalItensAtivos' || sortConfig.key === 'totalItensDevolvidos') {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else {
      valA = String(valA || '').toUpperCase();
      valB = String(valB || '').toUpperCase();
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const activeItems = collabTermos.filter(t => t.status === 'ATIVO');
  const pastItems = collabTermos.filter(t => t.status !== 'ATIVO');

  if (selectedCollab) {
    return (
      <div style={{ padding: '40px 40px 40px 320px', minHeight: '100vh' }}>
        {/* Back navigation */}
        <button 
          onClick={() => setSelectedCollab(null)} 
          className="btn btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
        >
          <ArrowLeft size={16} /> Voltar para Colaboradores
        </button>

        {/* Profile Card Header */}
        <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <User size={30} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: 0 }}>{selectedCollab.nome}</h1>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{selectedCollab.funcao}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => {
                if (!onPrintHistorico) return;
                const collabOS = osList.filter(os => 
                  os.colaboradorId === selectedCollab.id || 
                  (os.colaboradorNome && os.colaboradorNome.toUpperCase() === selectedCollab.nome.toUpperCase())
                );
                onPrintHistorico(selectedCollab, collabTermos, collabOS);
              }}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'var(--color-primary-light)', color: 'var(--color-primary-light)' }}
            >
              <FileText size={16} /> Ficha de Histórico (PDF)
            </button>
            
            {activeItems.length > 0 && (
              <button 
                onClick={() => onPrintConsolidated(selectedCollab, activeItems)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Printer size={16} /> Termo Consolidado ({activeItems.length})
              </button>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
          
          {/* Active Items */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={18} style={{ color: 'var(--color-success)' }} /> Ferramentas Atuais ({activeItems.length})
            </h3>
            
            {loadingDetails ? (
              <div style={{ color: 'var(--text-muted)' }}>Buscando ferramentas...</div>
            ) : activeItems.length > 0 ? (
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Entrega</th>
                      <th>Equipamento</th>
                      <th>Código/Tag</th>
                      <th>Qtd</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.map(item => (
                      <tr key={item.id}>
                        <td>{item.dateObj.toLocaleDateString('pt-BR')}</td>
                        <td style={{ fontWeight: 600 }}>{item.descricaoMaterial}</td>
                        <td>{item.tag || item.codEquipamento || '-'}</td>
                        <td>{item.quantidade}</td>
                        <td>
                          <span className="badge badge-active">{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-card)', borderRadius: '8px' }}>
                Nenhuma ferramenta sob responsabilidade no momento.
              </div>
            )}
          </div>

          {/* History */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: 'var(--text-secondary)' }} /> Histórico de Devoluções ({pastItems.length})
            </h3>
            
            {loadingDetails ? (
              <div style={{ color: 'var(--text-muted)' }}>Carregando histórico...</div>
            ) : pastItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                {pastItems.map(item => (
                  <div key={item.id} style={{ padding: '12px', border: '1px solid var(--border-card)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.descricaoMaterial}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Retirada: {item.dateObj.toLocaleDateString('pt-BR')} | Devolvido: {item.retDateObj?.toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <span className={`badge ${item.status === 'DEVOLVIDO' ? 'badge-returned' : 'badge-repair'}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Nenhum histórico registrado.
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 40px 40px 320px', minHeight: '100vh' }}>
      {/* Header */}
      <div>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-light)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Registros Pessoais
        </span>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', marginTop: '4px', marginBottom: '30px' }}>Colaboradores</h1>
      </div>

      {/* Search Toolbar */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar colaborador por nome ou função..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '44px' }}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando colaboradores...</div>
        ) : sortedCollabList.length > 0 ? (
          <div>
            {/* Stat Counter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Exibindo <strong>{sortedCollabList.length}</strong> de <strong>{colaboradores.length}</strong> colaboradores</span>
                {sortedCollabList.length !== colaboradores.length && (
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '10px', 
                    backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                    color: 'var(--color-primary-light)',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    Filtro Ativo
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontWeight: 700 }}>
                <div>
                  Ativos: <span style={{ color: 'var(--color-success)' }}>{sortedCollabList.reduce((acc, c) => acc + (c.totalItensAtivos || 0), 0)} un.</span>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-card)', paddingLeft: '16px' }}>
                  Devolvidos: <span style={{ color: 'var(--text-muted)' }}>{sortedCollabList.reduce((acc, c) => acc + (c.totalItensDevolvidos || 0), 0)} un.</span>
                </div>
              </div>
            </div>
            <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>
                    Nome do Colaborador
                    <ColumnFilterPopover
                      title="Nome"
                      columnKey="nome"
                      uniqueValues={getUniqueValues('nome')}
                      selectedValues={activeFilters.nome.selected}
                      onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, nome: { ...prev.nome, selected: vals } }))}
                      conditionFilter={activeFilters.nome.condition}
                      onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, nome: { ...prev.nome, condition: cond } }))}
                      onSortChange={(dir) => setSortConfig({ key: 'nome', direction: dir })}
                      currentSort={sortConfig.key === 'nome' ? sortConfig.direction : null}
                      align="left"
                    />
                  </th>
                  <th>
                    Função / Cargo
                    <ColumnFilterPopover
                      title="Função"
                      columnKey="funcao"
                      uniqueValues={getUniqueValues('funcao')}
                      selectedValues={activeFilters.funcao.selected}
                      onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, funcao: { ...prev.funcao, selected: vals } }))}
                      conditionFilter={activeFilters.funcao.condition}
                      onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, funcao: { ...prev.funcao, condition: cond } }))}
                      onSortChange={(dir) => setSortConfig({ key: 'funcao', direction: dir })}
                      currentSort={sortConfig.key === 'funcao' ? sortConfig.direction : null}
                      align="left"
                    />
                  </th>
                  <th style={{ textAlign: 'center' }}>
                    Itens Ativos
                    <ColumnFilterPopover
                      title="Itens Ativos"
                      columnKey="totalItensAtivos"
                      uniqueValues={getUniqueValues('totalItensAtivos')}
                      selectedValues={activeFilters.totalItensAtivos.selected}
                      onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, totalItensAtivos: { ...prev.totalItensAtivos, selected: vals } }))}
                      conditionFilter={activeFilters.totalItensAtivos.condition}
                      onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, totalItensAtivos: { ...prev.totalItensAtivos, condition: cond } }))}
                      onSortChange={(dir) => setSortConfig({ key: 'totalItensAtivos', direction: dir })}
                      currentSort={sortConfig.key === 'totalItensAtivos' ? sortConfig.direction : null}
                      isNumeric={true}
                    />
                  </th>
                  <th style={{ textAlign: 'center' }}>
                    Itens Devolvidos
                    <ColumnFilterPopover
                      title="Itens Devolvidos"
                      columnKey="totalItensDevolvidos"
                      uniqueValues={getUniqueValues('totalItensDevolvidos')}
                      selectedValues={activeFilters.totalItensDevolvidos.selected}
                      onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, totalItensDevolvidos: { ...prev.totalItensDevolvidos, selected: vals } }))}
                      conditionFilter={activeFilters.totalItensDevolvidos.condition}
                      onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, totalItensDevolvidos: { ...prev.totalItensDevolvidos, condition: cond } }))}
                      onSortChange={(dir) => setSortConfig({ key: 'totalItensDevolvidos', direction: dir })}
                      currentSort={sortConfig.key === 'totalItensDevolvidos' ? sortConfig.direction : null}
                      isNumeric={true}
                    />
                  </th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Ficha Individual</th>
                </tr>
              </thead>
              <tbody>
                {sortedCollabList.map((collab) => (
                  <tr key={collab.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-light)' }}>
                          <User size={16} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{collab.nome}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{collab.funcao}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: (collab.totalItensAtivos || 0) > 0 ? 'var(--color-success)' : 'inherit' }}>
                      {collab.totalItensAtivos || 0}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      {collab.totalItensDevolvidos || 0}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setSelectedCollab(collab)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          Ver Ficha <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Nenhum colaborador encontrado para os filtros.
          </div>
        )}
      </div>
    </div>
  );
};

export default Colaboradores;
