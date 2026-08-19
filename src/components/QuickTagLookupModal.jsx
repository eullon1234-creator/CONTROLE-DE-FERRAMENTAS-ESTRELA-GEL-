import { useState, useEffect, useMemo, useRef } from 'react';
import { db, COLLECTIONS } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Search, 
  X, 
  Tag, 
  User, 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  History 
} from 'lucide-react';

export const QuickTagLookupModal = ({ isOpen, onClose, initialTag = '' }) => {
  const [tagInput, setTagInput] = useState(initialTag);
  const [termos, setTermos] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [osList, setOsList] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (initialTag) {
          setTagInput(initialTag);
        }
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialTag]);

  // Load collections from Firestore (reads from IndexedDB offline seamlessly)
  useEffect(() => {
    if (!isOpen) return;

    const unsubs = [
      onSnapshot(collection(db, COLLECTIONS.TERMOS), (snap) => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setTermos(list);
      }),
      onSnapshot(collection(db, COLLECTIONS.EQUIPAMENTOS), (snap) => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setEquipamentos(list);
      }),
      onSnapshot(collection(db, COLLECTIONS.OS_CONSERTO), (snap) => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setOsList(list);
      })
    ];

    return () => unsubs.forEach(u => u());
  }, [isOpen]);

  const cleanTag = tagInput.trim().toUpperCase();

  // Matched Data
  const matchResult = useMemo(() => {
    if (!cleanTag) return null;

    // 1. Find equipment record
    const eq = equipamentos.find(e => 
      (e.tag || e.cod || e.id || '').toUpperCase().trim() === cleanTag
    );

    // 2. Find active term (who currently has this tool)
    const activeTerm = termos.find(t => 
      t.status === 'ATIVO' && 
      ((t.tag || t.codEquipamento || '').toUpperCase().trim() === cleanTag)
    );

    // 3. Find active OS (is it currently in repair)
    const activeOS = osList.find(o => 
      (o.status === 'Enviado' || o.status === 'Em Conserto') && 
      (o.tag || '').toUpperCase().trim() === cleanTag
    );

    // 4. Find history of terms for this tag
    const historyTerms = termos
      .filter(t => (t.tag || t.codEquipamento || '').toUpperCase().trim() === cleanTag)
      .sort((a, b) => {
        const dateA = a.dataEntrada?.toDate ? a.dataEntrada.toDate() : new Date(0);
        const dateB = b.dataEntrada?.toDate ? b.dataEntrada.toDate() : new Date(0);
        return dateB - dateA;
      });

    // 5. Find history of OS for this tag
    const historyOS = osList
      .filter(o => (o.tag || '').toUpperCase().trim() === cleanTag)
      .sort((a, b) => {
        const dateA = a.dataEnvio?.toDate ? a.dataEnvio.toDate() : new Date(0);
        const dateB = b.dataEnvio?.toDate ? b.dataEnvio.toDate() : new Date(0);
        return dateB - dateA;
      });

    // Calculate days in possession if active term
    let daysWithCollab = 0;
    if (activeTerm?.dataEntrada) {
      const entryDate = activeTerm.dataEntrada.toDate ? activeTerm.dataEntrada.toDate() : new Date(activeTerm.dataEntrada);
      const diffMs = Math.max(0, new Date().getTime() - entryDate.getTime());
      daysWithCollab = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      exists: !!eq || !!activeTerm || historyTerms.length > 0,
      equipment: eq,
      activeTerm,
      activeOS,
      daysWithCollab,
      historyTerms,
      historyOS
    };
  }, [cleanTag, equipamentos, termos, osList]);

  // Quick suggestions for tag input
  const tagSuggestions = useMemo(() => {
    if (!cleanTag || cleanTag.length < 2) return [];
    const allTags = new Set();
    equipamentos.forEach(e => {
      if (e.tag) allTags.add(e.tag.toUpperCase());
    });
    termos.forEach(t => {
      if (t.tag) allTags.add(t.tag.toUpperCase());
    });
    return Array.from(allTags)
      .filter(t => t.includes(cleanTag) && t !== cleanTag)
      .slice(0, 5);
  }, [cleanTag, equipamentos, termos]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '20px 14px',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: 'var(--bg-app)',
          borderRadius: '16px',
          border: '1px solid var(--border-card)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          marginTop: '4vh',
          marginBottom: '40px'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(30, 58, 95, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Tag size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                Consulta Rápida de TAG
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Verificação de posse e status em campo (Offline)
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Search Field */}
        <div style={{ padding: '20px 24px 14px 24px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary-light)', marginBottom: '8px', display: 'block' }}>
            Digite a TAG ou Código da Ferramenta:
          </label>
          <div style={{ position: 'relative' }}>
            <Search 
              size={20} 
              style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary-light)' }} 
            />
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              placeholder="Ex: FUR-001, ESM-005, MAK-12..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value.toUpperCase())}
              style={{
                paddingLeft: '48px',
                fontSize: '1.15rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                borderRadius: '12px',
                height: '52px'
              }}
            />
            {tagInput && (
              <button
                onClick={() => setTagInput('')}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Quick suggestions tags */}
          {tagSuggestions.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sugestões:</span>
              {tagSuggestions.map(sug => (
                <button
                  key={sug}
                  onClick={() => setTagInput(sug)}
                  style={{
                    border: '1px solid var(--border-card)',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--color-primary-light)',
                    fontSize: '0.78rem',
                    padding: '3px 8px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results Container */}
        <div style={{ padding: '10px 24px 24px 24px' }}>
          {!cleanTag ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
              <Tag size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '0.92rem' }}>
                Digite a TAG da ferramenta acima para ver com quem ela está e o histórico completo.
              </p>
            </div>
          ) : !matchResult?.exists ? (
            <div style={{
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              textAlign: 'center'
            }}>
              <AlertTriangle size={32} style={{ color: 'var(--color-danger)', marginBottom: '8px' }} />
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                TAG &ldquo;{cleanTag}&rdquo; não localizada
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Nenhum equipamento ou termo de responsabilidade foi encontrado com este identificador.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* PRIMARY STATUS CARD (WHO HAS IT) */}
              {matchResult.activeTerm ? (
                <div style={{
                  padding: '20px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '2px solid #ef4444',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase'
                    }}>
                      🔴 CAUTELADA / EM USO
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> Há {matchResult.daysWithCollab} dias
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0
                    }}>
                      <User size={26} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        Responsável Atual
                      </span>
                      <h3 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                        {matchResult.activeTerm.colaboradorNome}
                      </h3>
                      <span style={{ fontSize: '0.88rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
                        {matchResult.activeTerm.funcao || 'Colaborador Obra'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem', borderTop: '1px solid rgba(239,68,68,0.2)', paddingTop: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Data da Retirada:</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {matchResult.activeTerm.dataEntrada?.toDate 
                          ? matchResult.activeTerm.dataEntrada.toDate().toLocaleDateString('pt-BR') 
                          : '-'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Assinatura Digital:</span>
                      <div style={{ fontWeight: 600, color: matchResult.activeTerm.assinaturaBase64 ? 'var(--color-success)' : 'var(--text-muted)', marginTop: '2px' }}>
                        {matchResult.activeTerm.assinaturaBase64 ? '✓ Registrada no Termo' : 'Pendente'}
                      </div>
                    </div>
                  </div>

                  {matchResult.activeTerm.observacao && (
                    <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      Obs: &ldquo;{matchResult.activeTerm.observacao}&rdquo;
                    </div>
                  )}
                </div>
              ) : matchResult.activeOS ? (
                <div style={{
                  padding: '20px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  border: '2px solid #f59e0b',
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      backgroundColor: '#f59e0b',
                      color: '#000000',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase'
                    }}>
                      🟡 EM MANUTENÇÃO (CONSERTO)
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      OS #{matchResult.activeOS.nOS || '-'}
                    </span>
                  </div>
                  <h4 style={{ margin: '6px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    {matchResult.activeOS.descricao}
                  </h4>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    Enviada em: {matchResult.activeOS.dataEnvio?.toDate ? matchResult.activeOS.dataEnvio.toDate().toLocaleDateString('pt-BR') : '-'}
                  </div>
                  {matchResult.activeOS.observacao && (
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Motivo: {matchResult.activeOS.observacao}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: '20px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '2px solid #10b981',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <CheckCircle size={22} style={{ color: '#10b981' }} />
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#10b981', fontWeight: 700 }}>
                      DISPONÍVEL NO ALMOXARIFADO
                    </h3>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                    Esta ferramenta não está cautelada para nenhum colaborador no momento e está liberada para empréstimo.
                  </p>
                </div>
              )}

              {/* EQUIPMENT DETAILS CARD */}
              {matchResult.equipment && (
                <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wrench size={16} style={{ color: 'var(--color-primary-light)' }} /> Ficha do Equipamento
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Descrição:</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {matchResult.equipment.descricao || '-'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Marca / Modelo:</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {matchResult.equipment.marcaModelo || '-'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Tipo de Posse:</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {matchResult.equipment.tipoPosse || 'Própria'} {matchResult.equipment.locador ? `(${matchResult.equipment.locador})` : ''}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Grupo / Categoria:</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {matchResult.equipment.grupo || 'Geral'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* HISTORY SECTION */}
              {matchResult.historyTerms.length > 0 && (
                <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={16} style={{ color: 'var(--color-primary-light)' }} /> Histórico de Empréstimos Recentes ({matchResult.historyTerms.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {matchResult.historyTerms.slice(0, 5).map((term) => {
                      const entryDate = term.dataEntrada?.toDate ? term.dataEntrada.toDate().toLocaleDateString('pt-BR') : '-';
                      const returnDate = term.dataDevolucao?.toDate ? term.dataDevolucao.toDate().toLocaleDateString('pt-BR') : null;
                      return (
                        <div 
                          key={term.id} 
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border-card)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.8rem'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {term.colaboradorNome}
                            </span>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>
                              Retirada: {entryDate} {returnDate ? `• Devolvido: ${returnDate}` : ''}
                            </div>
                          </div>
                          <span className={`badge ${term.status === 'ATIVO' ? 'badge-active' : 'badge-returned'}`}>
                            {term.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default QuickTagLookupModal;
