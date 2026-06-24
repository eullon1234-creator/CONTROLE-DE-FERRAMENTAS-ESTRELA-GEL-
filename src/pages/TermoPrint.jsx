import React, { useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

const TermoPrint = ({ term, onBack }) => {
  useEffect(() => {
    // Scroll to top when loading the print view
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!term) return null;

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
          <ArrowLeft size={16} /> Voltar para Termos
        </button>
        <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Printer size={16} /> Imprimir Termo (PDF)
        </button>
      </div>

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
          {/* Logo / GEL Brand info */}
          <div style={{ textAlign: 'center', borderRight: '2px solid #000000', paddingRight: '15px' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 800, margin: 0 }}>GEL</h1>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px' }}>Engenharia</span>
          </div>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 5px 0', textTransform: 'uppercase', textAlign: 'center' }}>
              Termo de Responsabilidade de Equipamento
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
            <div><strong>Nome:</strong> {term.colaboradorNome}</div>
            <div><strong>Função:</strong> {term.colaboradorFuncao}</div>
          </div>
        </div>

        {/* Declarative Text */}
        <div style={{ textAlign: 'justify', marginBottom: '20px' }}>
          <p style={{ marginBottom: '12px' }}>
            Declaro por meio deste Termo que recebi da empresa <strong>GEL ENGENHARIA</strong>, a título de empréstimo para uso exclusivo no desempenho de minhas funções profissionais, o(s) equipamento(s)/material(is) abaixo relacionado(s), em perfeito estado de conservação e funcionamento.
          </p>
          <p style={{ marginBottom: '12px' }}>
            Comprometo-me a zelar pela guarda e conservação dos mesmos, utilizando-os de forma adequada e estritamente profissional. Tenho ciência de que o extravio, quebra ou dano decorrente de negligência, imperícia ou mau uso do equipamento poderá acarretar no desconto do respectivo valor em folha de pagamento, conforme previsto no Artigo 462, § 1º da CLT.
          </p>
        </div>

        {/* Equipment Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          marginBottom: '30px', 
          fontSize: '10.5pt'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ border: '1px solid #000000', padding: '8px', textAlign: 'left' }}>Item / Equipamento</th>
              <th style={{ border: '1px solid #000000', padding: '8px', textAlign: 'left' }}>Código / Marca / Modelo</th>
              <th style={{ border: '2px solid #000000', padding: '8px', textAlign: 'center', width: '110px', fontWeight: 'bold' }}>Tag / Serial</th>
              <th style={{ border: '1px solid #000000', padding: '8px', textAlign: 'center', width: '60px' }}>Qtd.</th>
              <th style={{ border: '1px solid #000000', padding: '8px', textAlign: 'center', width: '100px' }}>Data Entrega</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000000', padding: '8px' }}>
                <strong>{term.descricaoMaterial}</strong>
              </td>
              <td style={{ border: '1px solid #000000', padding: '8px' }}>
                {term.codEquipamento ? `Cód: ${term.codEquipamento}` : 'Item Avulso'} 
                {term.marca ? ` - ${term.marca}` : ''} {term.modelo ? ` / ${term.modelo}` : ''}
              </td>
              <td style={{ 
                border: '2px solid #000000', 
                padding: '8px', 
                textAlign: 'center', 
                fontFamily: 'monospace', 
                fontSize: '14pt', 
                fontWeight: 'bold', 
                backgroundColor: '#f9f9f9' 
              }}>
                {term.tag || '-'}
              </td>
              <td style={{ border: '1px solid #000000', padding: '8px', textAlign: 'center' }}>
                {term.quantidade}
              </td>
              <td style={{ border: '1px solid #000000', padding: '8px', textAlign: 'center' }}>
                {term.dateObj.toLocaleDateString('pt-BR')}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Observations if any */}
        {term.observacao && (
          <div style={{ marginBottom: '40px', border: '1px solid #000000', padding: '10px', borderRadius: '4px' }}>
            <strong>Observações de Entrega:</strong> {term.observacao}
          </div>
        )}

        {/* Local & Date */}
        <div style={{ textAlign: 'right', marginBottom: '60px' }}>
          Estrela - RS, {term.dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
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
              {term.assinaturaBase64 ? (
                <img 
                  src={term.assinaturaBase64} 
                  alt="Assinatura Digital" 
                  style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }} 
                />
              ) : (
                <div style={{ height: '30px' }}></div>
              )}
            </div>
            <div style={{ borderTop: '1px solid #000000', paddingTop: '8px', fontSize: '10pt' }}>
              <strong>{term.colaboradorNome}</strong>
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

export default TermoPrint;
