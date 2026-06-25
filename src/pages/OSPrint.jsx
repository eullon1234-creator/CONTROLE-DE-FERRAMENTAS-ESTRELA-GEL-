import React, { useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

const OSPrint = ({ os, onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!os) return null;

  const dateOS = os.dateOSObj
    ? os.dateOSObj.toLocaleDateString('pt-BR')
    : os.dateEnvioStr || new Date().toLocaleDateString('pt-BR');

  const dateEnvio = os.dateEnvioStr || '-';
  const dateRetorno = os.dateRetornoStr && os.dateRetornoStr !== '-' ? os.dateRetornoStr : '_____ / _____ / __________';

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#ffffff', color: '#000000' }}>

      {/* Control Buttons - hidden on print */}
      <div className="no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px',
        padding: '16px',
        borderBottom: '1px solid #ddd'
      }}>
        <button onClick={onBack} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} /> Voltar para OS
        </button>
        <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Printer size={16} /> Imprimir OS (PDF)
        </button>
      </div>

      {/* ==================== PRINTABLE AREA ==================== */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
        fontSize: '10pt',
        lineHeight: 1.4,
        color: '#000000'
      }}>

        {/* CABEÇALHO */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
          <tbody>
            <tr>
              {/* Logo GEL */}
              <td style={{
                border: '1px solid #000',
                padding: '8px 12px',
                width: '120px',
                textAlign: 'center',
                verticalAlign: 'middle'
              }}>
                <div style={{ fontWeight: 900, fontSize: '22pt', fontFamily: 'Arial Black, Arial, sans-serif', letterSpacing: '-1px' }}>GEL</div>
                <div style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '-2px' }}>Engenharia</div>
              </td>

              {/* Título central */}
              <td style={{
                border: '1px solid #000',
                borderLeft: 'none',
                padding: '6px 12px',
                textAlign: 'center',
                verticalAlign: 'middle'
              }}>
                <div style={{ fontWeight: 'bold', fontSize: '12pt', textTransform: 'uppercase' }}>
                  Ordem de Serviço — Conserto de Ferramenta
                </div>
                <div style={{ fontSize: '8pt', marginTop: '4px', color: '#444' }}>
                  GEL Engenharia | Almoxarifado Estrela | Obra: UHE / Estrela | C.C.: 60218
                </div>
              </td>

              {/* Nº OS */}
              <td style={{
                border: '1px solid #000',
                borderLeft: 'none',
                padding: '6px 12px',
                width: '140px',
                textAlign: 'center',
                verticalAlign: 'middle'
              }}>
                <div style={{ fontSize: '8pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Nº da OS</div>
                <div style={{
                  fontSize: '20pt',
                  fontWeight: '900',
                  fontFamily: 'Courier New, monospace',
                  letterSpacing: '2px',
                  color: '#000'
                }}>
                  {os.nOS}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* INFO GERAIS */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '-1px' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', borderTop: 'none', padding: '6px 10px', width: '33%' }}>
                <span style={{ fontSize: '7.5pt', color: '#555', display: 'block', marginBottom: '2px' }}>DATA DA OS</span>
                <span style={{ fontWeight: 'bold' }}>{dateOS}</span>
              </td>
              <td style={{ border: '1px solid #000', borderTop: 'none', borderLeft: 'none', padding: '6px 10px', width: '33%' }}>
                <span style={{ fontSize: '7.5pt', color: '#555', display: 'block', marginBottom: '2px' }}>DATA DE ENVIO AO CONSERTO</span>
                <span style={{ fontWeight: 'bold' }}>{dateEnvio}</span>
              </td>
              <td style={{ border: '1px solid #000', borderTop: 'none', borderLeft: 'none', padding: '6px 10px', width: '33%' }}>
                <span style={{ fontSize: '7.5pt', color: '#555', display: 'block', marginBottom: '2px' }}>STATUS</span>
                <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{os.status || 'Enviado'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* IDENTIFICAÇÃO DO EQUIPAMENTO */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '-1px' }}>
          <thead>
            <tr>
              <th colSpan={4} style={{
                border: '1px solid #000',
                borderTop: 'none',
                padding: '5px 10px',
                backgroundColor: '#f0f0f0',
                textAlign: 'left',
                fontSize: '8.5pt',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                Identificação do Equipamento / Ferramenta
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', borderTop: 'none', padding: '8px 10px', width: '45%' }}>
                <span style={{ fontSize: '7.5pt', color: '#555', display: 'block', marginBottom: '3px' }}>DESCRIÇÃO DO MATERIAL</span>
                <span style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>{os.descricao}</span>
              </td>
              <td style={{ border: '1px solid #000', borderTop: 'none', borderLeft: 'none', padding: '8px 10px', width: '18%', textAlign: 'center' }}>
                <span style={{ fontSize: '7.5pt', color: '#555', display: 'block', marginBottom: '3px' }}>TAG / CÓDIGO</span>
                <span style={{
                  fontFamily: 'Courier New, monospace',
                  fontWeight: '900',
                  fontSize: '13pt',
                  letterSpacing: '1px'
                }}>
                  {os.tag || '—'}
                </span>
              </td>
              <td style={{ border: '1px solid #000', borderTop: 'none', borderLeft: 'none', padding: '8px 10px', width: '20%' }}>
                <span style={{ fontSize: '7.5pt', color: '#555', display: 'block', marginBottom: '3px' }}>MARCA / MODELO</span>
                <span style={{ fontWeight: 'bold' }}>{os.marcaModelo || '—'}</span>
              </td>
              <td style={{ border: '1px solid #000', borderTop: 'none', borderLeft: 'none', padding: '8px 10px', width: '17%' }}>
                <span style={{ fontSize: '7.5pt', color: '#555', display: 'block', marginBottom: '3px' }}>Nº SÉRIE / PATRIM.</span>
                <span style={{ fontWeight: 'bold' }}>{os.numSerie || '—'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* DEFEITO RELATADO */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '-1px' }}>
          <thead>
            <tr>
              <th style={{
                border: '1px solid #000',
                borderTop: 'none',
                padding: '5px 10px',
                backgroundColor: '#f0f0f0',
                textAlign: 'left',
                fontSize: '8.5pt',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                Defeito Relatado / Motivo do Envio
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', borderTop: 'none', padding: '10px 10px', height: '55px', verticalAlign: 'top' }}>
                <span style={{ fontStyle: os.observacao ? 'normal' : 'italic', color: os.observacao ? '#000' : '#777' }}>
                  {os.observacao || 'Sem observações registradas.'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* SERVIÇO EXECUTADO */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '-1px' }}>
          <thead>
            <tr>
              <th style={{
                border: '1px solid #000',
                borderTop: 'none',
                padding: '5px 10px',
                backgroundColor: '#f0f0f0',
                textAlign: 'left',
                fontSize: '8.5pt',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                Serviço Executado / Peças Substituídas
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', borderTop: 'none', padding: '10px 10px', height: '65px', verticalAlign: 'top' }}>
                &nbsp;
              </td>
            </tr>
          </tbody>
        </table>

        {/* DATAS RETORNO */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '-1px' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', borderTop: 'none', padding: '8px 10px', width: '50%' }}>
                <span style={{ fontSize: '7.5pt', color: '#555', display: 'block', marginBottom: '3px' }}>DATA DE RETORNO DO CONSERTO</span>
                <span style={{ fontWeight: 'bold' }}>{dateRetorno}</span>
              </td>
              <td style={{ border: '1px solid #000', borderTop: 'none', borderLeft: 'none', padding: '8px 10px', width: '50%' }}>
                <span style={{ fontSize: '7.5pt', color: '#555', display: 'block', marginBottom: '3px' }}>DIAS EM CONSERTO</span>
                <span style={{ fontWeight: 'bold' }}>
                  {os.status === 'Retornado' && os.diasEmConserto != null
                    ? `${os.diasEmConserto} dia(s)`
                    : '____________'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ASSINATURAS */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '-1px' }}>
          <thead>
            <tr>
              <th colSpan={3} style={{
                border: '1px solid #000',
                borderTop: 'none',
                padding: '5px 10px',
                backgroundColor: '#f0f0f0',
                textAlign: 'left',
                fontSize: '8.5pt',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                Assinaturas e Responsabilidades
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{
                border: '1px solid #000',
                borderTop: 'none',
                padding: '10px 10px 32px 10px',
                width: '33%',
                textAlign: 'center'
              }}>
                <div style={{ height: '45px', borderBottom: '1px solid #000', marginBottom: '6px' }}></div>
                <div style={{ fontSize: '8pt', fontWeight: 'bold' }}>ENVIADO POR</div>
                <div style={{ fontSize: '7.5pt', color: '#555' }}>Almoxarifado Estrela / GEL</div>
              </td>
              <td style={{
                border: '1px solid #000',
                borderTop: 'none',
                borderLeft: 'none',
                padding: '10px 10px 32px 10px',
                width: '33%',
                textAlign: 'center'
              }}>
                <div style={{ height: '45px', borderBottom: '1px solid #000', marginBottom: '6px' }}></div>
                <div style={{ fontSize: '8pt', fontWeight: 'bold' }}>RECEBIDO PELA OFICINA</div>
                <div style={{ fontSize: '7.5pt', color: '#555' }}>Responsável pelo Conserto</div>
              </td>
              <td style={{
                border: '1px solid #000',
                borderTop: 'none',
                borderLeft: 'none',
                padding: '10px 10px 32px 10px',
                width: '33%',
                textAlign: 'center'
              }}>
                <div style={{ height: '45px', borderBottom: '1px solid #000', marginBottom: '6px' }}></div>
                <div style={{ fontSize: '8pt', fontWeight: 'bold' }}>CONFERÊNCIA DE RETORNO</div>
                <div style={{ fontSize: '7.5pt', color: '#555' }}>Almoxarifado Estrela / GEL</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* RODAPÉ */}
        <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '7.5pt', color: '#888', borderTop: '1px solid #ccc', paddingTop: '6px' }}>
          GEL Engenharia — Almoxarifado Estrela | UHE Estrela | C.C. 60218 | OS impressa em: {new Date().toLocaleDateString('pt-BR')}
        </div>

      </div>

      {/* Print-only CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          @page { margin: 12mm; size: A4 portrait; }
        }
      `}</style>
    </div>
  );
};

export default OSPrint;
