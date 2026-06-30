import React, { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Edit } from 'lucide-react';
import SignaturePad from '../components/SignaturePad';

const ColaboradorHistoryPrint = ({ collaborator, terms, osList, onBack }) => {
  const [signature, setSignature] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!collaborator) return null;

  // Compute Metrics
  const activeCount = terms.filter(t => t.status === 'ATIVO').reduce((acc, t) => acc + (t.quantidade || 1), 0);
  const returnedCount = terms.filter(t => t.status === 'DEVOLVIDO' && !String(t.observacao || '').toLowerCase().includes('descartad')).reduce((acc, t) => acc + (t.quantidade || 1), 0);
  const repairCount = terms.filter(t => t.status === 'EM CONCERTO').reduce((acc, t) => acc + (t.quantidade || 1), 0);
  
  // Discarded terms: status DEVOLVIDO but observation includes 'descartad'
  const discardedCount = terms.filter(t => t.status === 'DEVOLVIDO' && String(t.observacao || '').toLowerCase().includes('descartad')).reduce((acc, t) => acc + (t.quantidade || 1), 0);
  
  // Total damage / OS count associated with this collaborator
  const totalDamageCount = osList.length;

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#ffffff', color: '#000000' }}>
      
      {/* Control Buttons (hidden on actual print) */}
      <div className="no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px', 
        padding: '16px',
        borderBottom: '1px solid var(--border-card)'
      }}>
        <button onClick={onBack} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} /> Voltar para Ficha
        </button>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setShowSignaturePad(!showSignaturePad)} 
            className="btn btn-secondary" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              borderColor: 'var(--color-primary-light)', 
              color: 'var(--color-primary-light)' 
            }}
          >
            <Edit size={16} /> {signature ? 'Alterar Assinatura' : 'Assinar na Tela'}
          </button>
          
          <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={16} /> Imprimir Histórico (PDF)
          </button>
        </div>
      </div>

      {/* Live Signature Drawer Block (hidden on print) */}
      {showSignaturePad && (
        <div className="no-print glass-panel" style={{ 
          padding: '24px', 
          maxWidth: '550px', 
          margin: '0 auto 30px auto', 
          border: '1px solid var(--color-primary-light)' 
        }}>
          <SignaturePad 
            onSave={(dataURL) => {
              setSignature(dataURL);
              setShowSignaturePad(false);
            }}
            onClear={() => setSignature('')}
          />
        </div>
      )}

      {/* Printable Area */}
      <div style={{ 
        maxWidth: '900px', 
        margin: '0 auto', 
        padding: '10px 20px', 
        fontFamily: 'sans-serif', 
        lineHeight: 1.4,
        fontSize: '9.5pt'
      }}>
        
        {/* Document Header */}
        <div style={{ 
          border: '2px solid #000000', 
          padding: '12px', 
          display: 'grid', 
          gridTemplateColumns: '1.5fr 3.5fr', 
          gap: '20px',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{ textAlign: 'center', borderRight: '2px solid #000000', paddingRight: '15px' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 800, margin: 0 }}>GEL</h1>
            <span style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Engenharia</span>
          </div>
          <div>
            <h2 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 5px 0', textTransform: 'uppercase', textAlign: 'center' }}>
              Ficha de Histórico de Movimentações e Danos de Ferramentas
            </h2>
            <div style={{ fontSize: '9px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4px' }}>
              <div><strong>Obra:</strong> UHE / Estrela (Estrela - RS)</div>
              <div><strong>Responsável:</strong> Almoxarifado Estrela</div>
              <div><strong>Data Geração:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
              <div><strong>Centro de Custo:</strong> 60218</div>
            </div>
          </div>
        </div>

        {/* Collaborator Details */}
        <div style={{ marginBottom: '15px', borderBottom: '1.5px solid #000000', paddingBottom: '8px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', color: '#1e3a8a' }}>
            Identificação do Colaborador
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '15px', fontSize: '10pt' }}>
            <div><strong>Nome:</strong> {collaborator.nome}</div>
            <div><strong>Função / Cargo:</strong> {collaborator.funcao}</div>
          </div>
        </div>

        {/* Summary Dashboard metrics */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '10px', 
          marginBottom: '20px' 
        }}>
          {[
            { label: 'Empréstimos Ativos', val: activeCount, color: '#065f46', bg: '#ecfdf5' },
            { label: 'Itens Devolvidos', val: returnedCount, color: '#374151', bg: '#f3f4f6' },
            { label: 'Em Conserto', val: repairCount, color: '#92400e', bg: '#fef3c7' },
            { label: 'Itens Descartados', val: discardedCount, color: '#991b1b', bg: '#fef2f2' },
            { label: 'Danos / OS Abertas', val: totalDamageCount, color: '#7f1d1d', bg: '#fff5f5', border: '1.5px solid #dc2626' }
          ].map((card, i) => (
            <div key={i} style={{ 
              backgroundColor: card.bg, 
              border: card.border || '1px solid #d1d5db', 
              borderRadius: '6px', 
              padding: '10px', 
              textAlign: 'center' 
            }}>
              <span style={{ fontSize: '7.5pt', display: 'block', color: card.color, fontWeight: 'bold', textTransform: 'uppercase' }}>
                {card.label}
              </span>
              <span style={{ fontSize: '16pt', fontWeight: 'bold', color: card.color, display: 'block', marginTop: '2px' }}>
                {card.val} <span style={{ fontSize: '9pt', fontWeight: 'normal' }}>un.</span>
              </span>
            </div>
          ))}
        </div>

        {/* SECTION 1: Loans & Movements History */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #000000', paddingBottom: '3px', color: '#1e3a8a' }}>
            1. Histórico de Retiradas e Devoluções (Termos)
          </h3>
          {terms.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #000000' }}>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'left', width: '75px' }}>Retirada</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'left', width: '75px' }}>Devolução</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'left' }}>Equipamento / Material</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center', width: '90px' }}>TAG / Código</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center', width: '35px' }}>Qtd</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center', width: '80px' }}>Status</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'left' }}>Observação / Histórico</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((term) => {
                  const isDiscarded = String(term.observacao || '').toLowerCase().includes('descartad');
                  return (
                    <tr key={term.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ border: '1px solid #d1d5db', padding: '5px' }}>{term.dateObj.toLocaleDateString('pt-BR')}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '5px' }}>
                        {term.retDateObj ? term.retDateObj.toLocaleDateString('pt-BR') : <span style={{ color: '#9ca3af' }}>-</span>}
                      </td>
                      <td style={{ border: '1px solid #d1d5db', padding: '5px', fontWeight: 600 }}>{term.descricaoMaterial}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center', fontFamily: 'monospace' }}>
                        {term.tag || term.codEquipamento || '-'}
                      </td>
                      <td style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center' }}>{term.quantidade}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center' }}>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: term.status === 'ATIVO' ? '#059669' : isDiscarded ? '#dc2626' : '#4b5563' 
                        }}>
                          {isDiscarded ? 'DESCARTADO' : term.status}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #d1d5db', padding: '5px', fontSize: '8pt', color: '#374151' }}>
                        {term.observacao || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '10px', textAlign: 'center', color: '#6b7280', border: '1px dashed #d1d5db' }}>
              Nenhum termo de empréstimo registrado para este colaborador.
            </div>
          )}
        </div>

        {/* SECTION 2: Damages & Repair History (OS list) */}
        <div style={{ marginBottom: '35px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #000000', paddingBottom: '3px', color: '#1e3a8a' }}>
            2. Histórico de Danos e Consertos (Ordens de Serviço - OS)
          </h3>
          {osList.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #000000' }}>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'left', width: '55px' }}>Nº OS</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'left', width: '70px' }}>Data Envio</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'left', width: '70px' }}>Data Retorno</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'left' }}>Equipamento / Material</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center', width: '90px' }}>TAG / Código</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center', width: '80px' }}>Status OS</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center', width: '40px' }}>Dias</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'left' }}>Laudo / Histórico de Reparo</th>
                </tr>
              </thead>
              <tbody>
                {osList.map((os) => (
                  <tr key={os.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px', fontWeight: 'bold' }}>{os.nOS}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px' }}>
                      {os.dateEnvioObj ? os.dateEnvioObj.toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px' }}>
                      {os.dateRetornoObj ? os.dateRetornoObj.toLocaleDateString('pt-BR') : <span style={{ color: '#9ca3af' }}>-</span>}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px' }}>{os.descricao}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center', fontFamily: 'monospace' }}>{os.tag || '-'}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center' }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: os.status === 'Retornado' ? '#059669' : os.status === 'Descartado' ? '#dc2626' : '#d97706' 
                      }}>
                        {os.status}
                      </span>
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center' }}>{os.diasEmConserto || 0}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '5px', fontSize: '8pt', color: '#374151' }}>
                      {os.observacao || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '10px', textAlign: 'center', color: '#6b7280', border: '1px dashed #d1d5db' }}>
              Nenhuma ocorrência de dano ou conserto registrada para este colaborador.
            </div>
          )}
        </div>

        {/* Declarative Clause */}
        <div style={{ border: '1px solid #000000', padding: '10px', fontSize: '8.5pt', textAlign: 'justify', marginBottom: '40px' }}>
          <strong>DECLARAÇÃO:</strong> Confirmo que as informações históricas de retiradas, devoluções, danos e descartes de ferramentas acima relacionadas são exatas e correspondem ao controle do almoxarifado da obra UHE Estrela. O colaborador declara-se ciente do estado físico das ferramentas sob sua posse ativa e de suas responsabilidades perante o acervo da empresa GEL Engenharia, nos termos do Artigo 462, § 1º da CLT.
        </div>

        {/* Local & Date */}
        <div style={{ textAlign: 'right', marginBottom: '55px', fontSize: '9pt' }}>
          Estrela - RS, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </div>

        {/* Signatures */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '50px', 
          textAlign: 'center',
          fontSize: '9.5pt'
        }}>
          <div>
            <div style={{ 
              minHeight: '60px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '4px'
            }}>
              {signature ? (
                <img 
                  src={signature} 
                  alt="Assinatura Digital Colaborador" 
                  style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }} 
                  className="print-signature"
                />
              ) : (
                <div style={{ height: '30px' }}></div>
              )}
            </div>
            <div style={{ borderTop: '1px solid #000000', paddingTop: '6px' }}>
              <strong>{collaborator.nome}</strong>
              <br />
              Colaborador (Firma / Assinatura)
            </div>
          </div>
          
          <div>
            <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
              <div style={{ height: '30px' }}></div>
            </div>
            <div style={{ borderTop: '1px solid #000000', paddingTop: '6px' }}>
              <strong>Almoxarifado Estrela</strong>
              <br />
              GEL Engenharia (Responsável Almoxarife)
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ColaboradorHistoryPrint;
