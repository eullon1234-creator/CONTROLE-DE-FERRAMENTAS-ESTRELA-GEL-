import React, { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Edit } from 'lucide-react';
import SignaturePad from '../components/SignaturePad';

const TermoConsolidatedPrint = ({ collaborator, items, onBack }) => {
  const [signature, setSignature] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!collaborator || !items || items.length === 0) return null;

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#ffffff', color: '#000000' }}>
      
      {/* Control Buttons (hidden on actual print) */}
      <div className="no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '40px', 
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
            <Printer size={16} /> Imprimir Termo Consolidado (PDF)
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
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '20px', 
        fontFamily: 'serif', 
        lineHeight: 1.5,
        fontSize: '11pt'
      }}>
        
        {/* Document Header */}
        <div style={{ 
          border: '2px solid #000000', 
          padding: '15px', 
          display: 'grid', 
          gridTemplateColumns: '1.5fr 3fr', 
          gap: '20px',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <div style={{ textAlign: 'center', borderRight: '2px solid #000000', paddingRight: '15px' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 800, margin: 0 }}>GEL</h1>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px' }}>Engenharia</span>
          </div>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 5px 0', textTransform: 'uppercase', textAlign: 'center' }}>
              Termo de Responsabilidade Consolidado
            </h2>
            <div style={{ fontSize: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <div><strong>Obra:</strong> UHE / Estrela</div>
              <div><strong>Centro de Custo:</strong> 60218</div>
              <div><strong>Responsável:</strong> Almoxarifado Estrela</div>
              <div><strong>Data Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>
        </div>

        {/* Collaborator Details */}
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #000000', paddingBottom: '10px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>Identificação do Colaborador</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
            <div><strong>Nome:</strong> {collaborator.nome}</div>
            <div><strong>Função:</strong> {collaborator.funcao}</div>
          </div>
        </div>

        {/* Declarative Text */}
        <div style={{ textAlign: 'justify', marginBottom: '20px' }}>
          <p style={{ marginBottom: '12px' }}>
            Declaro por meio deste Termo Consolidado que recebi da empresa <strong>GEL ENGENHARIA</strong>, a título de empréstimo para uso exclusivo no desempenho de minhas funções profissionais, as ferramentas/materiais relacionados na tabela abaixo, encontrando-se todos em perfeito estado de conservação e funcionamento.
          </p>
          <p style={{ marginBottom: '12px' }}>
            Comprometo-me a zelar pela guarda e conservação dos mesmos, utilizando-os de forma adequada e estritamente profissional. Tenho ciência de que o extravio, quebra ou dano decorrente de negligência, imperícia ou mau uso de qualquer um dos itens poderá acarretar no desconto do respectivo valor em folha de pagamento, conforme previsto no Artigo 462, § 1º da CLT.
          </p>
        </div>

        {/* Equipment Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          marginBottom: '30px', 
          fontSize: '10pt'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ border: '1px solid #000000', padding: '6px', textAlign: 'left', width: '40px' }}>Item</th>
              <th style={{ border: '1px solid #000000', padding: '6px', textAlign: 'left' }}>Equipamento / Material</th>
              <th style={{ border: '1px solid #000000', padding: '6px', textAlign: 'left' }}>Código / Marca / Modelo</th>
              <th style={{ border: '2px solid #000000', padding: '6px', textAlign: 'center', width: '100px', fontWeight: 'bold' }}>Tag / Serial</th>
              <th style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', width: '40px' }}>Qtd.</th>
              <th style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', width: '80px' }}>Data Retirada</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center' }}>{index + 1}</td>
                <td style={{ border: '1px solid #000000', padding: '6px' }}><strong>{item.descricaoMaterial}</strong></td>
                <td style={{ border: '1px solid #000000', padding: '6px', fontSize: '9pt' }}>
                  {item.codEquipamento ? `Cód: ${item.codEquipamento}` : 'Item Avulso'}
                  {item.marca ? ` - ${item.marca}` : ''} {item.modelo ? ` / ${item.modelo}` : ''}
                </td>
                <td style={{ 
                  border: '2px solid #000000', 
                  padding: '6px', 
                  textAlign: 'center', 
                  fontFamily: 'monospace', 
                  fontSize: '13pt', 
                  fontWeight: 'bold', 
                  backgroundColor: '#f9f9f9' 
                }}>
                  {item.tag || '-'}
                </td>
                <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center' }}>{item.quantidade}</td>
                <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center' }}>
                  {item.dateObj.toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Local & Date */}
        <div style={{ textAlign: 'right', marginBottom: '65px' }}>
          Estrela - RS, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </div>

        {/* Signatures */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '50px', 
          marginTop: '40px',
          textAlign: 'center'
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
                  alt="Assinatura Digital" 
                  style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }} 
                />
              ) : (
                <div style={{ height: '30px' }}></div>
              )}
            </div>
            <div style={{ borderTop: '1px solid #000000', paddingTop: '8px', fontSize: '10pt' }}>
              <strong>{collaborator.nome}</strong>
              <br />
              Colaborador (Assinatura)
            </div>
          </div>
          
          <div>
            <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
              <div style={{ height: '30px' }}></div>
            </div>
            <div style={{ borderTop: '1px solid #000000', paddingTop: '8px', fontSize: '10pt' }}>
              <strong>Almoxarifado Estrela</strong>
              <br />
              GEL Engenharia (Entregue por)
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TermoConsolidatedPrint;
