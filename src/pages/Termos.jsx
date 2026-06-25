import React, { useState, useEffect } from 'react';
import { db, COLLECTIONS } from '../firebase/config';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  runTransaction,
  Timestamp,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Check, 
  Printer, 
  X,
  AlertTriangle,
  Info,
  PenTool,
  CheckCircle,
  XCircle
} from 'lucide-react';
import SignaturePad from '../components/SignaturePad';
import ColumnFilterPopover from '../components/ColumnFilterPopover';
const classifyGroup = (desc) => {
  const d = String(desc || '').toLowerCase();
  if (d.includes('bateria') || d.includes('carregador')) return 'Bateria / Acessório';
  if (d.includes('pneumat') || d.includes('pneumá')) return 'Pneumática';
  if (d.includes('solde') || d.includes('solda') || d.includes('compressor') || d.includes('gerador') || d.includes('bomba')) return 'Máquina';
  if (d.includes('furadeira') || d.includes('lixadeira') || d.includes('esmerilhadeira') || d.includes('serra') || d.includes('martelete') || d.includes('soprador') || d.includes('parafusadeira') || d.includes('tupia') || d.includes('plaina') || d.includes('politriz') || d.includes('gsh') || d.includes('gsb')) return 'Elétrica';
  return 'Ferramenta Manual';
};

const Termos = ({ onPrintTerm }) => {
  const [termos, setTermos] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [activeFilters, setActiveFilters] = useState({
    colaboradorNome: { selected: [], condition: { type: '', value: '' } },
    descricaoMaterial: { selected: [], condition: { type: '', value: '' } },
    tag: { selected: [], condition: { type: '', value: '' } },
    status: { selected: [], condition: { type: '', value: '' } },
    quantidade: { selected: [], condition: { type: '', value: '' } },
    dateStr: { selected: [], condition: { type: '', value: '' } }
  });
  const [sortConfig, setSortConfig] = useState({ key: 'dateObj', direction: 'desc' });

  const statusFilter = activeFilters.status?.selected?.length === 1 ? activeFilters.status.selected[0] : 'TODOS';
  const setStatusFilter = (status) => {
    setActiveFilters(prev => ({
      ...prev,
      status: {
        selected: status === 'TODOS' ? [] : [status],
        condition: prev.status?.condition || { type: '', value: '' }
      }
    }));
  };
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [selectedTermToSign, setSelectedTermToSign] = useState(null);
  
  // Autocomplete search states
  const [collabSearch, setCollabSearch] = useState('');
  const [eqSearch, setEqSearch] = useState('');
  const [filteredCollabs, setFilteredCollabs] = useState([]);
  const [filteredEqs, setFilteredEqs] = useState([]);

  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Form State
  const [formData, setFormData] = useState({
    colaboradorId: '',
    colaboradorNome: '',
    colaboradorFuncao: '',
    equipamentoId: '',
    codEquipamento: '',
    descricaoMaterial: '',
    modelo: '',
    marca: '',
    tag: '',
    quantidade: 1,
    observacao: '',
    grupo: 'Ferramenta Manual',
    assinaturaBase64: '' // saved drawing
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  useEffect(() => {
    // 1. Listen to Termos
    const unsubscribeTermos = onSnapshot(collection(db, COLLECTIONS.TERMOS), (snapshot) => {
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
      list.sort((a, b) => b.dateObj - a.dateObj);
      setTermos(list);
      setLoading(false);
    });

    // 2. Fetch Catalog for autocomplete
    const unsubscribeEq = onSnapshot(collection(db, COLLECTIONS.EQUIPAMENTOS), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setEquipamentos(list);
    });

    // 3. Fetch Collaborators for autocomplete
    const unsubscribeCollabs = onSnapshot(collection(db, COLLECTIONS.COLABORADORES), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setColaboradores(list);
    });

    return () => {
      unsubscribeTermos();
      unsubscribeEq();
      unsubscribeCollabs();
    };
  }, []);

  // Autocomplete Filter Logic
  useEffect(() => {
    if (collabSearch.trim() === '') {
      setFilteredCollabs([]);
    } else {
      const matches = colaboradores.filter(c => 
        c.nome.toLowerCase().includes(collabSearch.toLowerCase())
      );
      setFilteredCollabs(matches);
    }
  }, [collabSearch, colaboradores]);

  useEffect(() => {
    if (eqSearch.trim() === '') {
      setFilteredEqs([]);
    } else {
      const matches = equipamentos.filter(e => 
        e.descricao.toLowerCase().includes(eqSearch.toLowerCase()) ||
        e.tag.toLowerCase().includes(eqSearch.toLowerCase())
      );
      setFilteredEqs(matches);
    }
  }, [eqSearch, equipamentos]);

  const selectCollab = (collab) => {
    setFormData(prev => ({
      ...prev,
      colaboradorId: collab.id,
      colaboradorNome: collab.nome,
      colaboradorFuncao: collab.funcao
    }));
    setCollabSearch(collab.nome);
    setFilteredCollabs([]);
  };

  const selectEq = (eq) => {
    setFormData(prev => ({
      ...prev,
      equipamentoId: eq.id,
      codEquipamento: eq.tag,
      descricaoMaterial: eq.descricao,
      marca: eq.marcaModelo ? eq.marcaModelo.split('/')[0].trim() : '',
      modelo: eq.marcaModelo && eq.marcaModelo.split('/')[1] ? eq.marcaModelo.split('/')[1].trim() : '',
      grupo: eq.grupo,
      tag: eq.tag // Pre-fills tag of the term automatically!
    }));
    setEqSearch(eq.descricao);
    setFilteredEqs([]);
  };

  const handleCreateTermo = async (e) => {
    e.preventDefault();
    if (!formData.colaboradorNome || !formData.descricaoMaterial) {
      showToast('Preencha os campos obrigatórios.', 'error');
      return;
    }

    try {
      let finalCollabId = formData.colaboradorId;

      // 1. Create collaborator if new
      if (!finalCollabId) {
        const uppercaseNome = formData.colaboradorNome.toUpperCase().trim();
        const uppercaseFuncao = formData.colaboradorFuncao.toUpperCase().trim();
        
        const existing = colaboradores.find(c => c.nome.toUpperCase() === uppercaseNome);
        if (existing) {
          finalCollabId = existing.id;
        } else {
          // Use transaction to add collaborator
          await runTransaction(db, async (transaction) => {
            const newCollabRef = doc(collection(db, COLLECTIONS.COLABORADORES));
            transaction.set(newCollabRef, {
              nome: uppercaseNome,
              funcao: uppercaseFuncao,
              totalItensAtivos: 0,
              totalItensDevolvidos: 0,
              atualizadoEm: Timestamp.now()
            });
            finalCollabId = newCollabRef.id;
          });
        }
      }

      // 2. Add Term to Firestore
      const termData = {
        dataEntrada: Timestamp.now(),
        dataDevolucao: null,
        colaboradorId: finalCollabId,
        colaboradorNome: formData.colaboradorNome.toUpperCase().trim(),
        colaboradorFuncao: formData.colaboradorFuncao.toUpperCase().trim(),
        equipamentoId: formData.equipamentoId || null,
        codEquipamento: formData.codEquipamento || null,
        descricaoMaterial: formData.descricaoMaterial,
        modelo: formData.modelo || '',
        marca: formData.marca || '',
        tag: formData.tag || '',
        quantidade: Number(formData.quantidade) || 1,
        status: 'ATIVO',
        observacao: formData.observacao,
        grupo: classifyGroup(formData.descricaoMaterial),
        assinaturaBase64: formData.assinaturaBase64 || '', // digital signature
        criadoEm: Timestamp.now()
      };

      await runTransaction(db, async (transaction) => {
        const termRef = doc(collection(db, COLLECTIONS.TERMOS));
        const collabRef = doc(db, COLLECTIONS.COLABORADORES, finalCollabId);

        // 1. All reads must be done first!
        const collabSnap = await transaction.get(collabRef);
        
        // 2. All writes must be done after!
        let finalEqId = formData.equipamentoId || null;
        if (formData.tag && formData.tag.trim() !== '') {
          const tagUpper = formData.tag.toUpperCase().trim();
          const existsInCatalog = equipamentos.some(eq => 
            (eq.tag || eq.cod || eq.id || '').toUpperCase() === tagUpper
          );
          if (!existsInCatalog) {
            const brandModelStr = (formData.marca && formData.modelo) 
              ? `${formData.marca} / ${formData.modelo}` 
              : (formData.marca || formData.modelo || '');

            const eqRef = doc(db, COLLECTIONS.EQUIPAMENTOS, tagUpper);
            transaction.set(eqRef, {
              tag: tagUpper,
              cod: tagUpper,
              grupo: classifyGroup(formData.descricaoMaterial),
              descricao: formData.descricaoMaterial,
              marcaModelo: brandModelStr,
              und: 'Unidade',
              quantidadeTotal: 1,
              status: 'Disponível',
              setor: 'Almoxarifado',
              observacao: 'Cadastrado automaticamente ao gerar termo de empréstimo',
              criadoEm: Timestamp.now(),
              atualizadoEm: Timestamp.now()
            });
            finalEqId = tagUpper;
          } else {
            const matchedEq = equipamentos.find(eq => 
              (eq.tag || eq.cod || eq.id || '').toUpperCase() === tagUpper
            );
            if (matchedEq) finalEqId = matchedEq.id;
          }
        }

        transaction.set(termRef, {
          ...termData,
          equipamentoId: finalEqId
        });

        if (collabSnap.exists()) {
          const currentAtivos = collabSnap.data().totalItensAtivos || 0;
          transaction.update(collabRef, {
            totalItensAtivos: currentAtivos + Number(formData.quantidade),
            atualizadoEm: Timestamp.now()
          });
        }
      });

      showToast('Termo de empréstimo gerado com sucesso!');
      
      // Reset Form & Close Modal
      setFormData({
        colaboradorId: '',
        colaboradorNome: '',
        colaboradorFuncao: '',
        equipamentoId: '',
        codEquipamento: '',
        descricaoMaterial: '',
        modelo: '',
        marca: '',
        tag: '',
        quantidade: 1,
        observacao: '',
        grupo: 'Ferramenta Manual',
        assinaturaBase64: ''
      });
      setCollabSearch('');
      setEqSearch('');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Erro ao criar termo: ' + err.message, 'error');
    }
  };

  const handleReturnItem = async (term, newStatus) => {
    try {
      const termRef = doc(db, COLLECTIONS.TERMOS, term.id);
      const collabRef = doc(db, COLLECTIONS.COLABORADORES, term.colaboradorId);

      let nextOSNumber = 'OS-001';
      if (newStatus === 'EM CONCERTO') {
        try {
          const osCol = collection(db, COLLECTIONS.OS_CONSERTO);
          const q = query(osCol, orderBy('nOS', 'desc'), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const latestOS = snap.docs[0].data().nOS;
            if (latestOS.startsWith('OS-')) {
              const num = parseInt(latestOS.replace('OS-', ''), 10);
              if (!isNaN(num)) {
                nextOSNumber = `OS-${String(num + 1).padStart(3, '0')}`;
              }
            } else if (latestOS.startsWith('E')) {
              const num = parseInt(latestOS.substring(1), 10);
              if (!isNaN(num)) {
                nextOSNumber = `OS-${String(num + 1).padStart(3, '0')}`;
              }
            }
          }
        } catch (err) {
          console.error("Erro ao gerar número de OS, usando fallback:", err);
          nextOSNumber = `OS-${Date.now().toString().slice(-6)}`;
        }
      }

      await runTransaction(db, async (transaction) => {
        // 1. All reads must be done first!
        const collabSnap = await transaction.get(collabRef);
        
        const cleanTag = term.tag || term.codEquipamento || '';
        let eqSnap = null;
        let eqRef = null;
        if (cleanTag) {
          eqRef = doc(db, COLLECTIONS.EQUIPAMENTOS, cleanTag.toUpperCase().trim());
          eqSnap = await transaction.get(eqRef);
        }

        // 2. All writes must be done after!
        transaction.update(termRef, {
          status: newStatus,
          dataDevolucao: Timestamp.now()
        });

        if (collabSnap.exists()) {
          const currentAtivos = collabSnap.data().totalItensAtivos || 0;
          const currentDevolvidos = collabSnap.data().totalItensDevolvidos || 0;
          transaction.update(collabRef, {
            totalItensAtivos: Math.max(0, currentAtivos - term.quantidade),
            totalItensDevolvidos: currentDevolvidos + term.quantidade,
            atualizadoEm: Timestamp.now()
          });
        }

        if (newStatus === 'EM CONCERTO') {
          // Add OS document
          const newOsRef = doc(collection(db, COLLECTIONS.OS_CONSERTO));
          transaction.set(newOsRef, {
            nOS: nextOSNumber,
            dataOS: Timestamp.now(),
            dataEnvio: Timestamp.now(),
            descricao: term.descricaoMaterial,
            status: 'Enviado',
            dataRetorno: null,
            diasEmConserto: 0,
            tag: cleanTag.toUpperCase().trim(),
            observacao: 'Gerado automaticamente ao enviar para conserto',
            criadoEm: Timestamp.now()
          });

          // Update equipment status if it exists
          if (eqSnap && eqSnap.exists()) {
            transaction.update(eqRef, {
              status: 'Em Manutenção',
              atualizadoEm: Timestamp.now()
            });
          }
        }
      });
      showToast(`Item marcado como ${newStatus} com sucesso!`);
    } catch (err) {
      console.error(err);
      showToast("Erro ao processar devolução: " + err.message, "error");
    }
  };

  // Save digital signature to an active term
  const handleSaveSignature = async (signatureDataURL) => {
    if (!selectedTermToSign) return;
    
    try {
      const termRef = doc(db, COLLECTIONS.TERMOS, selectedTermToSign.id);
      await updateDoc(termRef, {
        assinaturaBase64: signatureDataURL
      });
      showToast('Assinatura digital inserida com sucesso!');
      setIsSignModalOpen(false);
      setSelectedTermToSign(null);
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar assinatura: ' + err.message, 'error');
    }
  };

  // Helper to extract unique values for filters
  const getUniqueValues = (key) => {
    if (key === 'tag') {
      const tags = [];
      termos.forEach(t => {
        if (t.tag) tags.push(t.tag);
        if (t.codEquipamento) tags.push(t.codEquipamento);
        if (!t.tag && !t.codEquipamento) tags.push('-');
      });
      return Array.from(new Set(tags)).sort();
    }
    const vals = termos.map(t => t[key] || '-');
    return Array.from(new Set(vals)).sort((a, b) => String(a).localeCompare(String(b)));
  };

  const filteredTermos = termos.filter((t) => {
    const matchesSearch = 
      search.trim() === '' ||
      t.colaboradorNome.toLowerCase().includes(search.toLowerCase()) ||
      t.descricaoMaterial.toLowerCase().includes(search.toLowerCase()) ||
      (t.codEquipamento && t.codEquipamento.toLowerCase().includes(search.toLowerCase())) ||
      (t.tag && t.tag.toLowerCase().includes(search.toLowerCase()));
      
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

    return Object.keys(activeFilters).every(colKey => {
      const filterObj = activeFilters[colKey];
      
      if (colKey === 'tag') {
        const tVal = t.tag || '-';
        const cVal = t.codEquipamento || '-';
        return evaluate(tVal, filterObj) || evaluate(cVal, filterObj);
      }

      if (colKey === 'dateStr') {
        const dVal = t.dateObj.toLocaleDateString('pt-BR');
        return evaluate(dVal, filterObj);
      }

      const itemVal = String(t[colKey] || '-');
      return evaluate(itemVal, filterObj);
    });
  });

  const sortedTermos = [...filteredTermos].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];

    if (sortConfig.key === 'dateObj') {
      valA = a.dateObj.getTime();
      valB = b.dateObj.getTime();
    } else if (sortConfig.key === 'quantidade') {
      valA = Number(a.quantidade) || 0;
      valB = Number(b.quantidade) || 0;
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
            Operações do Almoxarifado
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', marginTop: '4px' }}>Termos de Responsabilidade</h1>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '8px' }}>
          <Plus size={18} /> Novo Empréstimo
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por colaborador, material, tag ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '44px', borderRadius: '8px' }}
          />
        </div>

        {/* Status Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(0,0,0,0.02)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
          {['TODOS', 'ATIVO', 'DEVOLVIDO', 'EM CONCERTO'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'var(--transition-all)',
                backgroundColor: statusFilter === status ? 'var(--color-primary)' : 'transparent',
                color: statusFilter === status ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table List */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando dados do servidor...</div>
        ) : sortedTermos.length > 0 ? (
          <div>
            {/* Stat Counter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Exibindo <strong>{sortedTermos.length}</strong> de <strong>{termos.length}</strong> empréstimos</span>
                {sortedTermos.length !== termos.length && (
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
                Total de Equipamentos: <span style={{ color: 'var(--color-primary-light)' }}>{sortedTermos.reduce((acc, t) => acc + (t.quantidade || 1), 0)} un.</span>
              </div>
            </div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>
                      Data Empréstimo
                      <ColumnFilterPopover
                        title="Data"
                        columnKey="dateObj"
                        uniqueValues={Array.from(new Set(termos.map(t => t.dateObj.toLocaleDateString('pt-BR'))))}
                        selectedValues={activeFilters.dateStr.selected}
                        onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, dateStr: { ...prev.dateStr, selected: vals } }))}
                        conditionFilter={activeFilters.dateStr.condition}
                        onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, dateStr: { ...prev.dateStr, condition: cond } }))}
                        onSortChange={(dir) => setSortConfig({ key: 'dateObj', direction: dir })}
                        currentSort={sortConfig.key === 'dateObj' ? sortConfig.direction : null}
                        isDate={true}
                        align="left"
                      />
                    </th>
                    <th>
                      Colaborador
                      <ColumnFilterPopover
                        title="Colaborador"
                        columnKey="colaboradorNome"
                        uniqueValues={getUniqueValues('colaboradorNome')}
                        selectedValues={activeFilters.colaboradorNome.selected}
                        onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, colaboradorNome: { ...prev.colaboradorNome, selected: vals } }))}
                        conditionFilter={activeFilters.colaboradorNome.condition}
                        onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, colaboradorNome: { ...prev.colaboradorNome, condition: cond } }))}
                        onSortChange={(dir) => setSortConfig({ key: 'colaboradorNome', direction: dir })}
                        currentSort={sortConfig.key === 'colaboradorNome' ? sortConfig.direction : null}
                        align="left"
                      />
                    </th>
                    <th>
                      Equipamento / Material
                      <ColumnFilterPopover
                        title="Material"
                        columnKey="descricaoMaterial"
                        uniqueValues={getUniqueValues('descricaoMaterial')}
                        selectedValues={activeFilters.descricaoMaterial.selected}
                        onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, descricaoMaterial: { ...prev.descricaoMaterial, selected: vals } }))}
                        conditionFilter={activeFilters.descricaoMaterial.condition}
                        onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, descricaoMaterial: { ...prev.descricaoMaterial, condition: cond } }))}
                        onSortChange={(dir) => setSortConfig({ key: 'descricaoMaterial', direction: dir })}
                        currentSort={sortConfig.key === 'descricaoMaterial' ? sortConfig.direction : null}
                      />
                    </th>
                    <th>
                      Código / Tag
                      <ColumnFilterPopover
                        title="Tag"
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
                    <th style={{ textAlign: 'center' }}>
                      Qtd.
                      <ColumnFilterPopover
                        title="Qtd"
                        columnKey="quantidade"
                        uniqueValues={getUniqueValues('quantidade')}
                        selectedValues={activeFilters.quantidade.selected}
                        onSelectChange={(vals) => setActiveFilters(prev => ({ ...prev, quantidade: { ...prev.quantidade, selected: vals } }))}
                        conditionFilter={activeFilters.quantidade.condition}
                        onConditionFilterChange={(cond) => setActiveFilters(prev => ({ ...prev, quantidade: { ...prev.quantidade, condition: cond } }))}
                        onSortChange={(dir) => setSortConfig({ key: 'quantidade', direction: dir })}
                        currentSort={sortConfig.key === 'quantidade' ? sortConfig.direction : null}
                        isNumeric={true}
                      />
                    </th>
                    <th>Assinatura</th>
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
                    <th>Devolução</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTermos.map((term) => (
                    <tr key={term.id}>
                      <td>{term.dateObj.toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{term.colaboradorNome}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{term.colaboradorFuncao}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{term.descricaoMaterial}</div>
                        {term.marca && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{term.marca} {term.modelo}</div>}
                      </td>
                      <td>
                        {term.codEquipamento && (
                          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>Cód: {term.codEquipamento}</div>
                        )}
                        {term.tag && (
                          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-light)' }}>
                            Tag: {term.tag}
                          </div>
                        )}
                        {!term.codEquipamento && !term.tag && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{term.quantidade}</td>
                      <td>
                        {term.assinaturaBase64 ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--color-success)',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            <Check size={12} /> Assinado
                          </span>
                        ) : term.status === 'ATIVO' ? (
                          <button
                            onClick={() => {
                              setSelectedTermToSign(term);
                              setIsSignModalOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              backgroundColor: 'rgba(59, 130, 246, 0.05)',
                              color: 'var(--color-primary-light)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'var(--transition-all)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'}
                          >
                            <PenTool size={12} /> Assinar
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Pendente</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          term.status === 'ATIVO' ? 'badge-active' : 
                          term.status === 'DEVOLVIDO' ? 'badge-returned' : 
                          'badge-repair'
                        }`}>
                          {term.status}
                        </span>
                        {term.osVinculada && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-warning)', fontWeight: 700, marginTop: '3px', fontFamily: 'monospace' }}>
                            OS: {term.osVinculada}
                          </div>
                        )}
                      </td>
                      <td>{term.retDateObj ? term.retDateObj.toLocaleDateString('pt-BR') : <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {term.status === 'ATIVO' && (
                            <>
                              <button
                                onClick={() => handleReturnItem(term, 'DEVOLVIDO')}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--color-success)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                                title="Marcar como Devolvido"
                              >
                                Devolver
                              </button>
                              <button
                                onClick={() => handleReturnItem(term, 'EM CONCERTO')}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--color-warning)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                                title="Enviar para Conserto"
                              >
                                Conserto
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => onPrintTerm(term)}
                            className="btn btn-secondary"
                            style={{ padding: '6px', borderRadius: '6px' }}
                            title="Visualizar Termo Completo (PDF)"
                          >
                            <Printer size={14} />
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
            Nenhum empréstimo encontrado para os filtros selecionados.
          </div>
        )}
      </div>

      {/* Novo Empréstimo Modal */}
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
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            backgroundColor: 'var(--bg-app)',
            padding: '30px',
            position: 'relative',
            borderRadius: '16px'
          }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', right: '20px', top: '20px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', marginBottom: '24px', color: 'var(--text-primary)' }}>Registrar Novo Empréstimo</h2>

            <form onSubmit={handleCreateTermo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Collaborator Search & Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Nome do Colaborador</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Buscar ou digitar..."
                    value={collabSearch}
                    onChange={(e) => {
                      setCollabSearch(e.target.value);
                      setFormData(prev => ({ ...prev, colaboradorNome: e.target.value, colaboradorId: '' }));
                    }}
                    required
                  />
                  {filteredCollabs.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '72px',
                      left: 0,
                      right: 0,
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-card)',
                      borderRadius: '6px',
                      zIndex: 10,
                      maxHeight: '150px',
                      overflowY: 'auto',
                      boxShadow: 'var(--shadow-lg)'
                    }}>
                      {filteredCollabs.map(collab => (
                        <div
                          key={collab.id}
                          onClick={() => selectCollab(collab)}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-card)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{collab.nome}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{collab.funcao}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Função / Cargo</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: MECANICO"
                    value={formData.colaboradorFuncao}
                    onChange={(e) => setFormData(prev => ({ ...prev, colaboradorFuncao: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
              </div>

              {/* Equipment Search & Details */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Buscar Equipamento do Catálogo (Opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Pesquise por descrição ou TAG (ex: TAG-001)..."
                  value={eqSearch}
                  onChange={(e) => {
                    setEqSearch(e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      descricaoMaterial: e.target.value, 
                      equipamentoId: '', 
                      codEquipamento: '' 
                    }));
                  }}
                />
                {filteredEqs.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '72px',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '6px',
                    zIndex: 10,
                    maxHeight: '150px',
                    overflowY: 'auto',
                    boxShadow: 'var(--shadow-lg)'
                  }}>
                    {filteredEqs.map(eq => (
                      <div
                        key={eq.id}
                        onClick={() => selectEq(eq)}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-card)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{eq.descricao}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TAG: {eq.tag}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Descrição do Material Emprestado</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Descrição da ferramenta"
                  value={formData.descricaoMaterial}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricaoMaterial: e.target.value }))}
                  required
                />
              </div>

              {/* Brand, Model & Tag */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.marca}
                    onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.modelo}
                    onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">TAG / Serial (Único)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: TAG-501"
                    value={formData.tag}
                    onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>

              {/* Quantity */}
              <div className="form-group">
                <label className="form-label">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={formData.quantidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantidade: Number(e.target.value) || 1 }))}
                  required
                />
              </div>

              {/* Signature pad directly in creation form */}
              <div style={{ border: '1px solid var(--border-card)', padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <SignaturePad 
                  onSave={(dataURL) => {
                    setFormData(prev => ({ ...prev, assinaturaBase64: dataURL }));
                    showToast('Assinatura salva para este termo!');
                  }}
                  onClear={() => setFormData(prev => ({ ...prev, assinaturaBase64: '' }))}
                />
              </div>

              {/* Observations */}
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-input"
                  rows="2"
                  placeholder="Ex: Entregue na maleta original."
                  value={formData.observacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Gravar Empréstimo</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Signature drawing modal for active terms */}
      {isSignModalOpen && selectedTermToSign && (
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
            maxWidth: '500px',
            backgroundColor: 'var(--bg-app)',
            padding: '30px',
            position: 'relative',
            borderRadius: '16px'
          }}>
            <button 
              onClick={() => {
                setIsSignModalOpen(false);
                setSelectedTermToSign(null);
              }}
              style={{ position: 'absolute', right: '20px', top: '20px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Coletar Assinatura Digital</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Colaborador: <strong>{selectedTermToSign.colaboradorNome}</strong> <br />
              Material: <strong>{selectedTermToSign.descricaoMaterial}</strong>
            </p>

            <div style={{ border: '1px solid var(--border-card)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <SignaturePad 
                onSave={handleSaveSignature}
                onClear={() => {}}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => {
                  setIsSignModalOpen(false);
                  setSelectedTermToSign(null);
                }} 
                className="btn btn-secondary"
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

export default Termos;
