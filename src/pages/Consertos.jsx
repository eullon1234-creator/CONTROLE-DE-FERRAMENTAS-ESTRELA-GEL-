import React, { useState, useEffect } from 'react';
import { db, COLLECTIONS } from '../firebase/config';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Hammer, 
  Check, 
  X, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Wrench,
  Undo2,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import ColumnFilterPopover from '../components/ColumnFilterPopover';
import { Printer } from 'lucide-react';

const Consertos = ({ onPrintOS }) => {
  const [osList, setOsList] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatusTab, setFilterStatusTab] = useState('TODOS'); // TODOS, EM_CONSERTO, RETORNADO, CANCELADO

  const [activeFilters, setActiveFilters] = useState({
    nOS: { selected: [], condition: { type: '', value: '' } },
    tag: { selected: [], condition: { type: '', value: '' } },
    descricao: { selected: [], condition: { type: '', value: '' } },
    status: { selected: [], condition: { type: '', value: '' } },
    diasEmConserto: { selected: [], condition: { type: '', value: '' } },
    dateEnvioStr: { selected: [], condition: { type: '', value: '' } },
    dateRetornoStr: { selected: [], condition: { type: '', value: '' } }
  });
  const [sortConfig, setSortConfig] = useState({ key: 'nOS', direction: 'desc' });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedOs, setSelectedOs] = useState(null);

  // Toast Notification
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Form States
  const [addFormData, setAddFormData] = useState({
    nOS: '',
    tag: '',
    descricao: '',
    dataOS: new Date().toISOString().substring(0, 10),
    dataEnvio: new Date().toISOString().substring(0, 10),
    status: 'Enviado',
    observacao: ''
  });

  const [returnFormData, setReturnFormData] = useState({
    dataRetorno: new Date().toISOString().substring(0, 10),
    observacao: ''
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  useEffect(() => {
    // 1. Fetch OS list
    const unsubscribeOs = onSnapshot(collection(db, COLLECTIONS.OS_CONSERTO), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const dateOSObj = data.dataOS?.toDate() || null;
        const dateEnvioObj = data.dataEnvio?.toDate() || null;
        const dateRetornoObj = data.dataRetorno?.toDate() || null;

        list.push({
          id: doc.id,
          ...data,
          dateOSObj,
          dateEnvioObj,
          dateRetornoObj,
          dateOSStr: dateOSObj ? dateOSObj.toLocaleDateString('pt-BR') : '-',
          dateEnvioStr: dateEnvioObj ? dateEnvioObj.toLocaleDateString('pt-BR') : '-',
          dateRetornoStr: dateRetornoObj ? dateRetornoObj.toLocaleDateString('pt-BR') : '-'
        });
      });
      setOsList(list);
      setLoading(false);
    });

    // 2. Fetch Equipments to check valid tags and update status
    const unsubscribeEq = onSnapshot(collection(db, COLLECTIONS.EQUIPAMENTOS), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setEquipamentos(list);
    });

    return () => {
      unsubscribeOs();
      unsubscribeEq();
    };
  }, []);

  // Helper to suggest next OS number
  useEffect(() => {
    if (isAddModalOpen && !addFormData.nOS) {
      // Find highest E OS
      const eOsNumbers = osList
        .map(o => o.nOS)
        .filter(n => n.startsWith('E'))
        .map(n => Number(n.substring(1)))
        .filter(num => !isNaN(num));
      const nextNum = eOsNumbers.length > 0 ? Math.max(...eOsNumbers) + 1 : 1;
      setAddFormData(prev => ({
        ...prev,
        nOS: `E${String(nextNum).padStart(2, '0')}`
      }));
    }
  }, [isAddModalOpen, osList]);

  // Autocomplete suggestion when entering TAG in Add OS Modal
  const handleTagChangeInForm = (val) => {
    const uppercaseVal = val.toUpperCase();
    setAddFormData(prev => ({ ...prev, tag: uppercaseVal }));
    
    // Auto-fill description if tag matches an equipment
    const match = equipamentos.find(e => e.tag?.toUpperCase() === uppercaseVal || e.id?.toUpperCase() === uppercaseVal);
    if (match) {
      setAddFormData(prev => ({ ...prev, descricao: match.descricao }));
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addFormData.nOS || !addFormData.descricao) {
      showToast('Nº OS e Descrição são obrigatórios.', 'error');
      return;
    }

    try {
      const dateOsVal = new Date(addFormData.dataOS + 'T12:00:00');
      const dateEnvioVal = new Date(addFormData.dataEnvio + 'T12:00:00');

      const newOs = {
        nOS: addFormData.nOS.toUpperCase().trim(),
        tag: addFormData.tag.toUpperCase().trim(),
        descricao: addFormData.descricao.trim(),
        dataOS: Timestamp.fromDate(dateOsVal),
        dataEnvio: Timestamp.fromDate(dateEnvioVal),
        status: addFormData.status,
        dataRetorno: null,
        diasEmConserto: 0,
        observacao: addFormData.observacao.trim(),
        criadoEm: Timestamp.now()
      };

      // 1. Add OS document
      await addDoc(collection(db, COLLECTIONS.OS_CONSERTO), newOs);

      // 2. If tag is provided and equipment exists, mark equipment as "Em Manutenção"
      if (newOs.tag) {
        const matchedEq = equipamentos.find(eq => eq.tag?.toUpperCase() === newOs.tag.toUpperCase() || eq.id?.toUpperCase() === newOs.tag.toUpperCase());
        if (matchedEq) {
          const eqRef = doc(db, COLLECTIONS.EQUIPAMENTOS, matchedEq.id);
          await updateDoc(eqRef, {
            status: 'Em Manutenção',
            atualizadoEm: Timestamp.now()
          });
        }
      }

      showToast('Ordem de Serviço criada com sucesso!');
      setIsAddModalOpen(false);
      setAddFormData({
        nOS: '',
        tag: '',
        descricao: '',
        dataOS: new Date().toISOString().substring(0, 10),
        dataEnvio: new Date().toISOString().substring(0, 10),
        status: 'Enviado',
        observacao: ''
      });
    } catch (err) {
      console.error(err);
      showToast('Erro ao criar OS: ' + err.message, 'error');
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOs) return;

    try {
      const dateRetornoVal = new Date(returnFormData.dataRetorno + 'T12:00:00');
      const dateEnvioVal = selectedOs.dateEnvioObj || new Date();
      
      // Calculate days in repair
      const diffTime = Math.max(0, dateRetornoVal.getTime() - dateEnvioVal.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const osRef = doc(db, COLLECTIONS.OS_CONSERTO, selectedOs.id);
      
      // 1. Update OS document
      await updateDoc(osRef, {
        status: 'Retornado',
        dataRetorno: Timestamp.fromDate(dateRetornoVal),
        diasEmConserto: diffDays,
        observacao: returnFormData.observacao.trim() ? `${selectedOs.observacao ? selectedOs.observacao + ' | ' : ''}Retorno: ${returnFormData.observacao.trim()}` : (selectedOs.observacao || '')
      });

      // 2. Automatically make equipment "Disponível" again if tag is provided
      if (selectedOs.tag) {
        const matchedEq = equipamentos.find(eq => eq.tag?.toUpperCase() === selectedOs.tag.toUpperCase() || eq.id?.toUpperCase() === selectedOs.tag.toUpperCase());
        if (matchedEq) {
          const eqRef = doc(db, COLLECTIONS.EQUIPAMENTOS, matchedEq.id);
          await updateDoc(eqRef, {
            status: 'Disponível',
            atualizadoEm: Timestamp.now()
          });
        }
      }

      showToast('Retorno de conserto registrado com sucesso!');
      setIsReturnModalOpen(false);
      setSelectedOs(null);
      setReturnFormData({
        dataRetorno: new Date().toISOString().substring(0, 10),
        observacao: ''
      });
    } catch (err) {
      console.error(err);
      showToast('Erro ao registrar retorno: ' + err.message, 'error');
    }
  };

  const handleDelete = async (osItem) => {
    const confirmDel = window.confirm(`Deseja realmente excluir a Ordem de Serviço ${osItem.nOS} - ${osItem.descricao}?`);
    if (!confirmDel) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.OS_CONSERTO, osItem.id));
      showToast('Ordem de Serviço excluída com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir OS: ' + err.message, 'error');
    }
  };

  // Helper to extract unique values for column filter popover
  const getUniqueValues = (key) => {
    const vals = osList.map(os => os[key] || '-');
    return Array.from(new Set(vals)).sort((a, b) => String(a).localeCompare(String(b)));
  };

  // Calculate dynamic days in repair for open OS
  const getDaysInRepair = (osItem) => {
    if (osItem.status === 'Retornado' || osItem.status === 'Cancelado') {
      return osItem.diasEmConserto || 0;
    }
    if (!osItem.dateEnvioObj) return 0;
    const diffTime = Math.max(0, new Date().getTime() - osItem.dateEnvioObj.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filter List Logic
  const filteredOsList = osList.filter(os => {
    const matchesSearch = 
      search.trim() === '' ||
      os.nOS.toLowerCase().includes(search.toLowerCase()) ||
      os.descricao.toLowerCase().includes(search.toLowerCase()) ||
      (os.tag && os.tag.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    // Apply header/button bar tab filters
    const statusNorm = (os.status || '').toLowerCase().trim();
    if (filterStatusTab === 'EM_CONSERTO') {
      if (statusNorm !== 'enviado' && statusNorm !== 'em conserto') return false;
    }
    if (filterStatusTab === 'RETORNADO' && statusNorm !== 'retornado') return false;
    if (filterStatusTab === 'CANCELADO' && statusNorm !== 'cancelado') return false;

    // Apply Excel Column Filters
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

    return Object.keys(activeFilters).every(colKey => {
      const filterObj = activeFilters[colKey];
      let val = '';
      if (colKey === 'diasEmConserto') {
        val = getDaysInRepair(os);
      } else {
        val = os[colKey] || '-';
      }
      return evaluate(val, filterObj);
    });
  });

  const sortedOsList = [...filteredOsList].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];

    if (sortConfig.key === 'diasEmConserto') {
      valA = getDaysInRepair(a);
      valB = getDaysInRepair(b);
    } else if (sortConfig.key === 'dateEnvioStr') {
      valA = a.dateEnvioObj ? a.dateEnvioObj.getTime() : 0;
      valB = b.dateEnvioObj ? b.dateEnvioObj.getTime() : 0;
    } else if (sortConfig.key === 'dateRetornoStr') {
      valA = a.dateRetornoObj ? a.dateRetornoObj.getTime() : 0;
      valB = b.dateRetornoObj ? b.dateRetornoObj.getTime() : 0;
    } else {
      valA = String(valA || '').toUpperCase();
      valB = String(valB || '').toUpperCase();
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const activeOSCount = osList.filter(o => o.status.toLowerCase() === 'enviado' || o.status.toLowerCase() === 'em conserto').length;

  return (
    <div style={{ padding: '40px 40px 40px 320px', minHeight: '100vh' }}>
      
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 24px',
          borderRadius: '10px',
          backgroundColor: toast.type === 'success' ? '#064e3b' : '#7f1d1d',
          color: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
          border: `1px solid ${toast.type === 'success' ? '#059669' : '#dc2626'}`,
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: 'translateX(0)',
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          {toast.type === 'success' ? <CheckCircle size={20} style={{ color: '#34d399' }} /> : <XCircle size={20} style={{ color: '#f87171' }} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-light)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Manutenção de Ferramentas
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', marginTop: '4px' }}>Controle de Ordens de Serviço (OS)</h1>
        </div>

        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '8px' }}>
          <Plus size={18} /> Novo Conserto / OS
        </button>
      </div>

      {/* Toolbar Filters */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por Nº OS, descrição ou TAG..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '44px', borderRadius: '8px' }}
          />
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(0,0,0,0.02)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
          {['TODOS', 'EM_CONSERTO', 'RETORNADO', 'CANCELADO'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatusTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'var(--transition-all)',
                backgroundColor: filterStatusTab === tab ? 'var(--color-primary)' : 'transparent',
                color: filterStatusTab === tab ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              {tab === 'EM_CONSERTO' ? 'EM CONSERTO' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* OS Table List */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando ordens de serviço...</div>
        ) : sortedOsList.length > 0 ? (
          <div>
            {/* Stat Counter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Exibindo <strong>{sortedOsList.length}</strong> de <strong>{osList.length}</strong> ordens de serviço</span>
                {sortedOsList.length !== osList.length && (
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
                Total Pendente em Conserto: <span style={{ color: 'var(--color-warning)' }}>{activeOSCount} un.</span>
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>
                      Nº OS
                      <ColumnFilterPopover
                        title="Nº OS"
                        columnKey="nOS"
                        uniqueValues={getUniqueValues('nOS')}
                        selectedValues={activeFilters.nOS.selected}
                        onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, nOS: { ...prev.nOS, selected: vals } }))}
                        conditionFilter={activeFilters.nOS.condition}
                        onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, nOS: { ...prev.nOS, condition: cond } }))}
                        onSortChange={(dir) => setSortConfig({ key: 'nOS', direction: dir })}
                        currentSort={sortConfig.key === 'nOS' ? sortConfig.direction : null}
                      />
                    </th>
                    <th>
                      Data Envio
                      <ColumnFilterPopover
                        title="Envio"
                        columnKey="dateEnvioStr"
                        uniqueValues={getUniqueValues('dateEnvioStr')}
                        selectedValues={activeFilters.dateEnvioStr.selected}
                        onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, dateEnvioStr: { ...prev.dateEnvioStr, selected: vals } }))}
                        conditionFilter={activeFilters.dateEnvioStr.condition}
                        onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, dateEnvioStr: { ...prev.dateEnvioStr, condition: cond } }))}
                        onSortChange={(dir) => setSortConfig({ key: 'dateEnvioStr', direction: dir })}
                        currentSort={sortConfig.key === 'dateEnvioStr' ? sortConfig.direction : null}
                      />
                    </th>
                    <th>
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
                      />
                    </th>
                    <th>
                      Descrição do Material
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
                    <th>
                      Data Retorno
                      <ColumnFilterPopover
                        title="Retorno"
                        columnKey="dateRetornoStr"
                        uniqueValues={getUniqueValues('dateRetornoStr')}
                        selectedValues={activeFilters.dateRetornoStr.selected}
                        onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, dateRetornoStr: { ...prev.dateRetornoStr, selected: vals } }))}
                        conditionFilter={activeFilters.dateRetornoStr.condition}
                        onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, dateRetornoStr: { ...prev.dateRetornoStr, condition: cond } }))}
                        onSortChange={(dir) => setSortConfig({ key: 'dateRetornoStr', direction: dir })}
                        currentSort={sortConfig.key === 'dateRetornoStr' ? sortConfig.direction : null}
                      />
                    </th>
                    <th style={{ textAlign: 'center' }}>
                      Dias
                      <ColumnFilterPopover
                        title="Dias"
                        columnKey="diasEmConserto"
                        uniqueValues={Array.from(new Set(osList.map(o => getDaysInRepair(o)))).sort((a,b)=>a-b)}
                        selectedValues={activeFilters.diasEmConserto.selected}
                        onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, diasEmConserto: { ...prev.diasEmConserto, selected: vals } }))}
                        conditionFilter={activeFilters.diasEmConserto.condition}
                        onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, diasEmConserto: { ...prev.diasEmConserto, condition: cond } }))}
                        onSortChange={(dir) => setSortConfig({ key: 'diasEmConserto', direction: dir })}
                        currentSort={sortConfig.key === 'diasEmConserto' ? sortConfig.direction : null}
                        isNumeric={true}
                      />
                    </th>
                    <th style={{ textAlign: 'right', width: '120px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOsList.map((os) => {
                    const days = getDaysInRepair(os);
                    const statusNorm = (os.status || '').toLowerCase().trim();
                    const isPending = statusNorm === 'enviado' || statusNorm === 'em conserto';
                    const isReturned = statusNorm === 'retornado';
                    const isCancelled = statusNorm === 'cancelado';
                    
                    return (
                      <tr key={os.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{os.nOS}</td>
                        <td>{os.dateEnvioStr}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: os.tag ? 'var(--color-primary-light)' : 'var(--text-muted)' }}>
                          {os.tag || '-'}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{os.descricao}</div>
                          {os.observacao && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Obs: {os.observacao}</div>}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: isPending
                                ? 'rgba(245, 158, 11, 0.15)'
                                : isReturned
                                ? 'rgba(71, 85, 105, 0.15)'
                                : isCancelled
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(16, 185, 129, 0.15)',
                              color: isPending
                                ? 'var(--color-warning)'
                                : isReturned
                                ? 'var(--text-secondary)'
                                : isCancelled
                                ? 'var(--color-danger)'
                                : 'var(--color-success)',
                            }}
                          >
                            {os.status}
                          </span>
                        </td>
                        <td>{os.dateRetornoStr}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                          <span style={{ color: isPending && days > 30 ? 'var(--color-danger)' : 'inherit' }}>
                            {days}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            {/* Print OS button (always visible) */}
                            <button
                              onClick={() => onPrintOS && onPrintOS(os)}
                              className="btn btn-secondary"
                              style={{ padding: '6px', color: 'var(--color-primary-light)', borderColor: 'rgba(59, 130, 246, 0.2)' }}
                              title="Imprimir Ordem de Serviço"
                            >
                              <Printer size={14} />
                            </button>
                            {isPending && (
                              <button
                                onClick={() => {
                                  setSelectedOs(os);
                                  setIsReturnModalOpen(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--color-success)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                                title="Marcar como Retornado"
                              >
                                Retorno
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(os)}
                              className="btn btn-secondary"
                              style={{ padding: '6px', color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                              title="Excluir OS"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Nenhuma Ordem de Serviço encontrada para os filtros selecionados.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(3, 7, 18, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 999, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '550px', backgroundColor: 'var(--bg-app)', padding: '30px', position: 'relative' }}>
            <button onClick={() => setIsAddModalOpen(false)} style={{ position: 'absolute', right: '20px', top: '20px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '24px', color: 'var(--text-primary)' }}>Registrar Envio para Conserto (Nova OS)</h2>
            
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nº OS</label>
                  <input
                    type="text"
                    className="form-input"
                    value={addFormData.nOS}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, nOS: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">TAG do Ativo</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: FUR-01"
                    value={addFormData.tag}
                    onChange={(e) => handleTagChangeInForm(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição do Material</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Furadeira de Impacto Bosch"
                  value={addFormData.descricao}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Data da OS</label>
                  <input
                    type="date"
                    className="form-input"
                    value={addFormData.dataOS}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, dataOS: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data de Envio</label>
                  <input
                    type="date"
                    className="form-input"
                    value={addFormData.dataEnvio}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, dataEnvio: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={addFormData.observacao}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, observacao: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar OS</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {isReturnModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(3, 7, 18, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 999, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--bg-app)', padding: '30px', position: 'relative' }}>
            <button onClick={() => { setIsReturnModalOpen(false); setSelectedOs(null); }} style={{ position: 'absolute', right: '20px', top: '20px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Registrar Retorno do Conserto</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Ao confirmar o retorno, a OS <strong>{selectedOs?.nOS}</strong> será fechada e a ferramenta <strong>{selectedOs?.tag ? `TAG: ${selectedOs.tag}` : selectedOs?.descricao}</strong> retornará automaticamente para o status <strong>Disponível</strong> no almoxarifado.
            </p>
            
            <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Data de Retorno</label>
                <input
                  type="date"
                  className="form-input"
                  value={returnFormData.dataRetorno}
                  onChange={(e) => setReturnFormData(prev => ({ ...prev, dataRetorno: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observação sobre o Conserto (Ex: Troca de carvão, induzido)</label>
                <input
                  type="text"
                  className="form-input"
                  value={returnFormData.observacao}
                  onChange={(e) => setReturnFormData(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="O que foi reparado?"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => { setIsReturnModalOpen(false); setSelectedOs(null); }} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}>Registrar Retorno</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Consertos;
