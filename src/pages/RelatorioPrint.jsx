import { useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

const RelatorioPrint = ({ type, items, onBack }) => {
  useEffect(() => {
    // Scroll to top when loading the print view
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const isAtivas = type === 'ativas';
  const title = isAtivas 
    ? 'Relatório de Ferramentas Ativas (Empréstimos)' 
    : 'Relatório de Ferramentas Danificadas (Em Manutenção)';

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#ffffff', color: '#000000' }}>
      
      {/* CSS Stylesheet injected for forced landscape print layout */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          .no-print {
            display: none !important;
          }
          body {
            background-color: #ffffff;
            color: #000000;
            margin: 0;
            padding: 0;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #000000 !important;
            padding: 6px 8px !important;
            font-size: 9pt !important;
          }
          th {
            background-color: #f2f2f2 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

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
          <ArrowLeft size={16} /> Voltar
        </button>
        <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Printer size={16} /> Imprimir Relatório (PDF / Paisagem)
        </button>
      </div>

      {/* Printable Area */}
      <div className="print-container" style={{ 
        width: '100%', 
        margin: '0 auto', 
        padding: '10px', 
        fontFamily: 'system-ui, -apple-system, sans-serif', 
        lineHeight: 1.4
      }}>
        
        {/* Document Header */}
        <div style={{ 
          border: '2px solid #000000', 
          padding: '12px 15px', 
          display: 'grid', 
          gridTemplateColumns: '1.5fr 4fr', 
          gap: '20px',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          {/* Logo / GEL Brand info */}
          <div style={{ textAlign: 'center', borderRight: '2px solid #000000', paddingRight: '15px' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 800, margin: 0, color: '#0f172a' }}>GEL</h1>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>Engenharia</span>
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 5px 0', textTransform: 'uppercase', textAlign: 'center' }}>
              {title}
            </h2>
            <div style={{ fontSize: '9.5px', display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.3fr', gap: '8px' }}>
              <div><strong>Obra:</strong> UHE / Estrela</div>
              <div><strong>CC:</strong> 60218</div>
              <div style={{ textAlign: 'right' }}><strong>Data Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>

        {/* Info text */}
        <div style={{ fontSize: '10px', color: '#374151', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span>* Este relatório apresenta a relação atual de ferramentas registradas no sistema de controle.</span>
          <span>Total de itens listados: <strong>{items.length}</strong></span>
        </div>

        {/* Equipment Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          marginBottom: '20px', 
          fontSize: '9.5pt'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', width: '40px' }}>Nº</th>
              <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', width: '130px' }}>TAG / Código</th>
              <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'left', width: '220px' }}>Descrição da Ferramenta</th>
              <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'left', width: '200px' }}>Colaborador Responsável</th>
              <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'left', width: '150px' }}>Função / Cargo</th>
              <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', width: '90px' }}>{isAtivas ? 'Empréstimo' : 'Data Envio'}</th>
              <th style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', width: '130px' }}>Visto / Assinatura</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              let dateStr;
              if (isAtivas) {
                const dateObj = item.dateObj || (item.dataEntrada?.toDate ? item.dataEntrada.toDate() : item.dataEntrada);
                dateStr = dateObj instanceof Date ? dateObj.toLocaleDateString('pt-BR') : String(dateObj || '-');
              } else {
                const dateObj = item.dateEnvioObj || (item.dataEnvio?.toDate ? item.dataEnvio.toDate() : item.dataEnvio);
                dateStr = dateObj instanceof Date ? dateObj.toLocaleDateString('pt-BR') : String(dateObj || '-');
              }

              return (
                <tr key={item.id || index}>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {isAtivas ? (item.tag || item.codEquipamento || '-') : (item.tag || '-')}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px' }}>
                    <strong>{isAtivas ? item.descricaoMaterial : item.descricao}</strong>
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px' }}>{item.colaboradorNome || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px' }}>{item.colaboradorFuncao || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center' }}>{dateStr}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px', backgroundColor: '#fafafa' }}></td>
                </tr>
              );
            })}

            {/* Exactly 10 empty rows for manual pen filling */}
            {Array.from({ length: 10 }).map((_, idx) => {
              const serialNum = items.length + idx + 1;
              return (
                <tr key={`empty-${idx}`} style={{ height: '28px' }}>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', color: '#9ca3af' }}>{serialNum}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px' }}></td>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px' }}></td>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px' }}></td>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px' }}></td>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px' }}></td>
                  <td style={{ border: '1px solid #000000', padding: '6px 8px' }}></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer info for manual writing */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#6b7280' }}>
          <span>* As linhas vazias acima servem para anotação e controle manual temporário no campo.</span>
          <span>Visto do Responsável pelo Almoxarifado: ____________________________________</span>
        </div>

      </div>
    </div>
  );
};

export default RelatorioPrint;
