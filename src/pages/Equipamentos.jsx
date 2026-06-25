import React, { useState, useEffect } from 'react';
import { db, COLLECTIONS } from '../firebase/config';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  setDoc,
  Timestamp 
} from 'firebase/firestore';
import { Plus, Search, Edit3, Trash2, X, ShieldAlert, Cpu } from 'lucide-react';
import ColumnFilterPopover from '../components/ColumnFilterPopover';
const classifyGroup = (desc) => {
  const d = String(desc || '').toLowerCase();
  if (d.includes('bateria') || d.includes('carregador')) return 'Bateria / Acessório';
  if (d.includes('pneumat') || d.includes('pneumá')) return 'Pneumática';
  if (d.includes('solde') || d.includes('solda') || d.includes('compressor') || d.includes('gerador') || d.includes('bomba')) return 'Máquina';
  if (d.includes('furadeira') || d.includes('lixadeira') || d.includes('esmerilhadeira') || d.includes('serra') || d.includes('martelete') || d.includes('soprador') || d.includes('parafusadeira') || d.includes('tupia') || d.includes('plaina') || d.includes('politriz') || d.includes('gsh') || d.includes('gsb')) return 'Elétrica';
  return 'Ferramenta Manual';
};

const Equipamentos = () => {
  const [equipamentos, setEquipamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Custom filters
  const [filterType, setFilterType] = useState('TODOS'); 

  const [activeFilters, setActiveFilters] = useState({
    tag: { selected: [], condition: { type: '', value: '' } },
    grupo: { selected: [], condition: { type: '', value: '' } },
    descricao: { selected: [], condition: { type: '', value: '' } },
    marcaModelo: { selected: [], condition: { type: '', value: '' } },
    und: { selected: [], condition: { type: '', value: '' } },
    quantidadeTotal: { selected: [], condition: { type: '', value: '' } },
    status: { selected: [], condition: { type: '', value: '' } }
  });
  const [sortConfig, setSortConfig] = useState({ key: 'tag', direction: 'asc' });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    tag: '', // Replaced cod with tag
    grupo: 'Ferramenta Manual',
    descricao: '',
    marcaModelo: '',
    und: 'Unidade',
    quantidadeTotal: 1,
    status: 'Disponível',
    setor: 'Almoxarifado',
    observacao: ''
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.EQUIPAMENTOS), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort by TAG
      list.sort((a, b) => (a.tag || a.cod || a.id || '').localeCompare(b.tag || b.cod || b.id || ''));
      setEquipamentos(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setFormData({
      tag: item.tag || item.cod || item.id || '',
      grupo: item.grupo || 'Ferramenta Manual',
      descricao: item.descricao || '',
      marcaModelo: item.marcaModelo || '',
      und: item.und || 'Unidade',
      quantidadeTotal: item.quantidadeTotal || 1,
      status: item.status || 'Disponível',
      setor: item.setor || 'Almoxarifado',
      observacao: item.observacao || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditItem(null);
    setFormData({
      tag: `TAG-${String(equipamentos.length + 1).padStart(3, '0')}`, // Auto-suggest prefix changed to TAG-
      grupo: 'Ferramenta Manual',
      descricao: '',
      marcaModelo: '',
      und: 'Unidade',
      quantidadeTotal: 1,
      status: 'Disponível',
      setor: 'Almoxarifado',
      observacao: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tag || !formData.descricao) {
      alert('TAG e Descrição são campos obrigatórios.');
      return;
    }

    try {
      if (editItem) {
        // Update
        const docRef = doc(db, COLLECTIONS.EQUIPAMENTOS, editItem.id);
        await updateDoc(docRef, {
          ...formData,
          grupo: classifyGroup(formData.descricao),
          atualizadoEm: Timestamp.now()
        });
      } else {
        // Add (using the TAG itself as document ID to enforce uniqueness)
        const docRef = doc(db, COLLECTIONS.EQUIPAMENTOS, formData.tag.trim());
        await setDoc(docRef, {
          ...formData,
          grupo: classifyGroup(formData.descricao),
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now()
        }, { merge: true });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving equipment:", err);
      alert('Erro ao salvar equipamento: ' + err.message);
    }
  };

  const handleDelete = async (item) => {
    const confirmDel = window.confirm(`Deseja realmente excluir o equipamento com a TAG: ${item.tag} - ${item.descricao}?`);
    if (!confirmDel) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.EQUIPAMENTOS, item.id));
    } catch (err) {
      console.error("Error deleting equipment:", err);
      alert("Erro ao excluir equipamento: " + err.message);
    }
  };

  // Helper to extract unique values for filters
  const getUniqueValues = (key) => {
    const vals = equipamentos.map(eq => {
      if (key === 'tag') {
        return eq.tag || eq.cod || eq.id || '-';
      }
      return eq[key] || '-';
    });
    return Array.from(new Set(vals)).sort((a, b) => String(a).localeCompare(String(b)));
  };

  const filteredEquipamentos = equipamentos.filter((eq) => {
    const eqTag = eq.tag || eq.cod || eq.id || '';
    const matchesSearch = 
      search.trim() === '' ||
      eq.descricao.toLowerCase().includes(search.toLowerCase()) ||
      eqTag.toLowerCase().includes(search.toLowerCase()) ||
      (eq.marcaModelo && eq.marcaModelo.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    // Apply header/button bar filter Type
    if (filterType === 'COM_TAG') {
      const isComTag = 
        eq.grupo === 'Elétrica' || 
        eq.grupo === 'Máquina' || 
        eq.grupo === 'Pneumática' || 
        (eqTag !== '' && eqTag !== '-' && eqTag !== '—');
      if (!isComTag) return false;
    }

    if (filterType === 'ELETRICA') {
      if (eq.grupo !== 'Elétrica') return false;
    }

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
      
      let itemVal = '';
      if (colKey === 'tag') {
        itemVal = String(eq.tag || eq.cod || eq.id || '-');
      } else {
        itemVal = String(eq[colKey] || '-');
      }
      return evaluate(itemVal, filterObj);
    });
  });

  const sortedEquipamentos = [...filteredEquipamentos].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];

    if (sortConfig.key === 'quantidadeTotal') {
      valA = Number(a.quantidadeTotal) || 0;
      valB = Number(b.quantidadeTotal) || 0;
    } else if (sortConfig.key === 'tag') {
      valA = String(a.tag || a.cod || a.id || '').toUpperCase();
      valB = String(b.tag || b.cod || b.id || '').toUpperCase();
    } else {
      valA = String(valA || '').toUpperCase();
      valB = String(valB || '').toUpperCase();
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div style={{ padding: '40px 40px 40px 320px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-light)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Inventário de Ativos
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', marginTop: '4px' }}>Catálogo de Equipamentos</h1>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} /> Cadastrar Equipamento
        </button>
      </div>

      {/* Toolbar / Filters */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por TAG, descrição ou marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '44px' }}
          />
        </div>

        {/* Custom filters toolbar */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilterType('TODOS')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'var(--transition-all)',
              backgroundColor: filterType === 'TODOS' ? 'var(--color-primary)' : 'rgba(0,0,0,0.03)',
              color: filterType === 'TODOS' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            Todos
          </button>
          
          <button
            onClick={() => setFilterType('COM_TAG')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'var(--transition-all)',
              backgroundColor: filterType === 'COM_TAG' ? 'var(--color-accent)' : 'rgba(0,0,0,0.03)',
              color: filterType === 'COM_TAG' ? '#0f172a' : 'var(--text-secondary)'
            }}
          >
            <ShieldAlert size={14} /> Com TAG
          </button>

          <button
            onClick={() => setFilterType('ELETRICA')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'var(--transition-all)',
              backgroundColor: filterType === 'ELETRICA' ? 'var(--color-primary-light)' : 'rgba(0,0,0,0.03)',
              color: filterType === 'ELETRICA' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <Cpu size={14} /> Elétricas
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando catálogo...</div>
        ) : sortedEquipamentos.length > 0 ? (
          <div>
            {/* Stat Counter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Exibindo <strong>{sortedEquipamentos.length}</strong> de <strong>{equipamentos.length}</strong> itens</span>
                {sortedEquipamentos.length !== equipamentos.length && (
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
              <div style={{ fontWeight: 700 }}>
                Total em Inventário: <span style={{ color: 'var(--color-primary-light)' }}>{sortedEquipamentos.reduce((acc, eq) => acc + (eq.quantidadeTotal || 0), 0)} un.</span>
              </div>
            </div>
            <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '170px' }}>
                    TAG
                    <ColumnFilterPopover
                      title="TAG"
                      columnKey="tag"
                      uniqueValues={getUniqueValues('tag')}
                      selectedValues={activeFilters.tag.selected}
                      onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, tag: { ...prev.tag, selected: vals } }))}
                      conditionFilter={activeFilters.tag.condition}
                      onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, tag: { ...prev.tag, condition: cond } }))}
                      onSortChange={(dir) => setSortConfig({ key: 'tag', direction: dir })}
                      currentSort={sortConfig.key === 'tag' ? sortConfig.direction : null}
                      align="left"
                    />
                  </th>
                  <th>
                    Descrição
                    <ColumnFilterPopover
                      title="Descrição"
                      columnKey="descricao"
                      uniqueValues={getUniqueValues('descricao')}
                      selectedValues={activeFilters.descricao.selected}
                      onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, descricao: { ...prev.descricao, selected: vals } }))}
                      conditionFilter={activeFilters.descricao.condition}
                      onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, descricao: { ...prev.descricao, condition: cond } }))}
                      onSortChange={(dir) => setSortConfig({ key: 'descricao', direction: dir })}
                      currentSort={sortConfig.key === 'descricao' ? sortConfig.direction : null}
                    />
                  </th>
                  <th>
                    Marca / Modelo
                    <ColumnFilterPopover
                      title="Marca/Modelo"
                      columnKey="marcaModelo"
                      uniqueValues={getUniqueValues('marcaModelo')}
                      selectedValues={activeFilters.marcaModelo.selected}
                      onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, marcaModelo: { ...prev.marcaModelo, selected: vals } }))}
                      conditionFilter={activeFilters.marcaModelo.condition}
                      onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, marcaModelo: { ...prev.marcaModelo, condition: cond } }))}
                      onSortChange={(dir) => setSortConfig({ key: 'marcaModelo', direction: dir })}
                      currentSort={sortConfig.key === 'marcaModelo' ? sortConfig.direction : null}
                    />
                  </th>
                  <th>
                    UND
                    <ColumnFilterPopover
                      title="UND"
                      columnKey="und"
                      uniqueValues={getUniqueValues('und')}
                      selectedValues={activeFilters.und.selected}
                      onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, und: { ...prev.und, selected: vals } }))}
                      conditionFilter={activeFilters.und.condition}
                      onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, und: { ...prev.und, condition: cond } }))}
                      onSortChange={(dir) => setSortConfig({ key: 'und', direction: dir })}
                      currentSort={sortConfig.key === 'und' ? sortConfig.direction : null}
                    />
                  </th>
                  <th>
                    Qtd. Total
                    <ColumnFilterPopover
                      title="Qtd Total"
                      columnKey="quantidadeTotal"
                      uniqueValues={getUniqueValues('quantidadeTotal')}
                      selectedValues={activeFilters.quantidadeTotal.selected}
                      onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, quantidadeTotal: { ...prev.quantidadeTotal, selected: vals } }))}
                      conditionFilter={activeFilters.quantidadeTotal.condition}
                      onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, quantidadeTotal: { ...prev.quantidadeTotal, condition: cond } }))}
                      onSortChange={(dir) => setSortConfig({ key: 'quantidadeTotal', direction: dir })}
                      currentSort={sortConfig.key === 'quantidadeTotal' ? sortConfig.direction : null}
                      isNumeric={true}
                    />
                  </th>
                  <th>
                    Status
                    <ColumnFilterPopover
                      title="Status"
                      columnKey="status"
                      uniqueValues={getUniqueValues('status')}
                      selectedValues={activeFilters.status.selected}
                      onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, status: { ...prev.status, selected: vals } }))}
                      conditionFilter={activeFilters.status.condition}
                      onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, status: { ...prev.status, condition: cond } }))}
                      onSortChange={(dir) => setSortConfig({ key: 'status', direction: dir })}
                      currentSort={sortConfig.key === 'status' ? sortConfig.direction : null}
                    />
                  </th>
                  <th style={{ textAlign: 'right', width: '100px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedEquipamentos.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--color-primary-light)' }}>{item.tag || item.cod || item.id}</td>
                    <td style={{ fontWeight: 500 }}>{item.descricao}</td>
                    <td>{item.marcaModelo || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                    <td>{item.und}</td>
                    <td>{item.quantidadeTotal}</td>
                    <td>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        color: item.status === 'Disponível' ? 'var(--color-success)' : 'var(--color-warning)' 
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="btn btn-secondary"
                          style={{ padding: '6px' }}
                          title="Editar Equipamento"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="btn btn-secondary"
                          style={{ padding: '6px', color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          title="Excluir Equipamento"
                        >
                          <Trash2 size={14} />
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
            Nenhum equipamento correspondente aos filtros.
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(3, 7, 18, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '550px',
            backgroundColor: 'var(--bg-app)',
            padding: '30px',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', right: '20px', top: '20px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', marginBottom: '24px', color: 'var(--text-primary)' }}>
              {editItem ? 'Editar Equipamento' : 'Cadastrar Novo Equipamento'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">TAG do Ativo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: TAG-102"
                  value={formData.tag}
                  onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value.toUpperCase() }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descrição da Ferramenta</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Martelete Perfurador SDS-Plus"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Marca / Modelo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Dewalt / D25133K"
                  value={formData.marcaModelo}
                  onChange={(e) => setFormData(prev => ({ ...prev, marcaModelo: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Unidade</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.und}
                    onChange={(e) => setFormData(prev => ({ ...prev, und: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd Total</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.quantidadeTotal}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantidadeTotal: Number(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status Inicial</label>
                  <select
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  >
                    <option value="Disponível">Disponível</option>
                    <option value="Em Manutenção">Em Manutenção</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-input"
                  rows="2"
                  placeholder="Instruções adicionais..."
                  value={formData.observacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Equipamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Equipamentos;
