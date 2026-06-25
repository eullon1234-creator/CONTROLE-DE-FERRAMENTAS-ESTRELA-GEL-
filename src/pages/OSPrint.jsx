import React, { useEffect } from "react";
import { ArrowLeft, Printer, FileText, Clock, Wrench, CheckCircle } from "lucide-react";

const OSPrint = ({ os, onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!os) return null;

  const dateOS = os.dateOSObj
    ? os.dateOSObj.toLocaleDateString("pt-BR")
    : os.dateEnvioStr || new Date().toLocaleDateString("pt-BR");

  const dateEnvio =
    os.dateEnvioStr && os.dateEnvioStr !== "-"
      ? os.dateEnvioStr
      : "____/____/________";

  const dateRetorno =
    os.dateRetornoStr && os.dateRetornoStr !== "-"
      ? os.dateRetornoStr
      : "____/____/________";

  const diasConserto =
    os.status === "Retornado" && os.diasEmConserto != null
      ? `${os.diasEmConserto} dia(s)`
      : "________";

  const sh = {
    backgroundColor: "#1e3a5f",
    color: "#ffffff",
    padding: "4px 10px",
    fontSize: "7.5pt",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  };

  const lbl = {
    fontSize: "6.5pt",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    display: "block",
    marginBottom: "2px",
  };

  const val = { fontWeight: "bold", fontSize: "10pt", color: "#000" };

  const cell = { border: "1px solid #ccc", padding: "6px 8px", verticalAlign: "top" };

  const dash = {
    display: "block",
    borderBottom: "1px dashed #aaa",
    height: "18px",
    marginBottom: "5px",
  };

  const OSForm = ({ copy }) => (
    <div
      style={{
        width: "100%",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "9pt",
        color: "#000",
        border: "1.5px solid #1e3a5f",
        borderRadius: "2px",
        overflow: "hidden",
      }}
    >
      {/* CABECALHO */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: "1.5px solid #1e3a5f" }}>
        <tbody>
          <tr>
            <td
              style={{
                width: "90px",
                padding: "8px 10px",
                borderRight: "1.5px solid #1e3a5f",
                textAlign: "center",
                verticalAlign: "middle",
                backgroundColor: "#f0f4f8",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: "20pt",
                  fontFamily: "Arial Black, Arial, sans-serif",
                  color: "#1e3a5f",
                  lineHeight: 1,
                }}
              >
                GEL
              </div>
              <div
                style={{
                  fontSize: "5.5pt",
                  textTransform: "uppercase",
                  letterSpacing: "2.5px",
                  color: "#1e3a5f",
                  marginTop: "1px",
                }}
              >
                Engenharia
              </div>
            </td>

            <td style={{ padding: "6px 12px", textAlign: "center", verticalAlign: "middle" }}>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "11pt",
                  textTransform: "uppercase",
                  color: "#1e3a5f",
                  letterSpacing: "0.3px",
                }}
              >
                Ordem de Servico - Conserto de Ferramenta
              </div>
              <div style={{ fontSize: "7pt", color: "#555", marginTop: "3px" }}>
                GEL Engenharia | Almoxarifado Estrela | Obra: UHE / Estrela | C.C.: 60218
              </div>
              {copy && (
                <div
                  style={{
                    display: "inline-block",
                    marginTop: "4px",
                    padding: "1px 8px",
                    backgroundColor: copy === "ALMOXARIFADO" ? "#1e3a5f" : "#4a7c59",
                    color: "#fff",
                    fontSize: "6pt",
                    fontWeight: "bold",
                    borderRadius: "2px",
                    letterSpacing: "1px",
                  }}
                >
                  VIA: {copy}
                </div>
              )}
            </td>

            <td
              style={{
                width: "120px",
                padding: "6px 10px",
                borderLeft: "1.5px solid #1e3a5f",
                textAlign: "center",
                verticalAlign: "middle",
                backgroundColor: "#f0f4f8",
              }}
            >
              <div
                style={{
                  fontSize: "6pt",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  color: "#666",
                  marginBottom: "2px",
                }}
              >
                N da OS
              </div>
              <div
                style={{
                  fontSize: "22pt",
                  fontWeight: "900",
                  fontFamily: "Courier New, monospace",
                  color: "#1e3a5f",
                  letterSpacing: "1px",
                  lineHeight: 1,
                }}
              >
                {os.nOS}
              </div>
              <div style={{ fontSize: "6pt", color: "#888", marginTop: "3px" }}>
                Emissao: {dateOS}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* DATAS E STATUS */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: "1px solid #ddd" }}>
        <tbody>
          <tr>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", width: "25%" }}>
              <span style={lbl}>Data da OS</span>
              <span style={val}>{dateOS}</span>
            </td>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", width: "25%" }}>
              <span style={lbl}>Data de Envio ao Conserto</span>
              <span style={val}>{dateEnvio}</span>
            </td>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", width: "25%" }}>
              <span style={lbl}>Data de Retorno</span>
              <span style={val}>{dateRetorno}</span>
            </td>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", borderRight: "none", width: "25%" }}>
              <span style={lbl}>Status</span>
              <span
                style={{
                  ...val,
                  color:
                    os.status === "Retornado"
                      ? "#166534"
                      : os.status === "Cancelado"
                      ? "#991b1b"
                      : "#92400e",
                }}
              >
                {(os.status || "Enviado").toUpperCase()}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* IDENTIFICACAO */}
      <div style={sh}>Identificacao do Equipamento / Ferramenta</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", width: "42%" }}>
              <span style={lbl}>Descricao do Material</span>
              <span style={{ ...val, fontSize: "10.5pt" }}>{os.descricao}</span>
            </td>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", width: "18%", textAlign: "center" }}>
              <span style={lbl}>Tag / Codigo</span>
              <span
                style={{
                  fontFamily: "Courier New, monospace",
                  fontWeight: "900",
                  fontSize: "14pt",
                  color: "#1e3a5f",
                  letterSpacing: "1px",
                }}
              >
                {os.tag || "-"}
              </span>
            </td>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", width: "22%" }}>
              <span style={lbl}>Marca / Modelo</span>
              <span style={val}>{os.marcaModelo || "-"}</span>
            </td>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", borderRight: "none", width: "18%" }}>
              <span style={lbl}>N Serie / Patrimonio</span>
              <span style={val}>{os.numSerie || "-"}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* DEFEITO */}
      <div style={sh}>Defeito Relatado / Motivo do Envio</div>
      <div
        style={{
          padding: "8px 10px",
          minHeight: "44px",
          borderBottom: "1px solid #ddd",
          fontSize: "9pt",
          fontStyle: os.observacao ? "normal" : "italic",
          color: os.observacao ? "#000" : "#888",
        }}
      >
        {os.observacao || "Sem observacoes registradas."}
        {!os.observacao && (
          <>
            <span style={dash}></span>
            <span style={{ ...dash, marginBottom: 0 }}></span>
          </>
        )}
      </div>

      {/* SERVICO EXECUTADO */}
      <div style={sh}>Servico Executado / Pecas Substituidas (Preencher na Oficina)</div>
      <div style={{ padding: "8px 10px", minHeight: "52px", borderBottom: "1px solid #ddd" }}>
        <span style={dash}></span>
        <span style={dash}></span>
        <span style={{ ...dash, marginBottom: 0 }}></span>
      </div>

      {/* TECNICO / RETORNO / DIAS */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", width: "40%" }}>
              <span style={lbl}>Tecnico / Oficina Responsavel</span>
              <span style={dash}></span>
            </td>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", width: "35%" }}>
              <span style={lbl}>Data de Retorno Confirmada</span>
              <span style={val}>{dateRetorno}</span>
            </td>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", borderRight: "none", width: "25%" }}>
              <span style={lbl}>Dias em Conserto</span>
              <span style={val}>{diasConserto}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ASSINATURAS */}
      <div style={sh}>Assinaturas e Responsabilidades</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", width: "33%", textAlign: "center", paddingBottom: "22px" }}>
              <div style={{ height: "36px", borderBottom: "1px solid #000", marginBottom: "5px" }}></div>
              <div style={{ fontSize: "7.5pt", fontWeight: "bold", textTransform: "uppercase" }}>Enviado por</div>
              <div style={{ fontSize: "6.5pt", color: "#666" }}>Almoxarifado Estrela / GEL</div>
            </td>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", width: "33%", textAlign: "center", paddingBottom: "22px" }}>
              <div style={{ height: "36px", borderBottom: "1px solid #000", marginBottom: "5px" }}></div>
              <div style={{ fontSize: "7.5pt", fontWeight: "bold", textTransform: "uppercase" }}>Recebido pela Oficina</div>
              <div style={{ fontSize: "6.5pt", color: "#666" }}>Responsavel pelo Conserto</div>
            </td>
            <td style={{ ...cell, borderTop: "none", borderLeft: "none", borderRight: "none", width: "33%", textAlign: "center", paddingBottom: "22px" }}>
              <div style={{ height: "36px", borderBottom: "1px solid #000", marginBottom: "5px" }}></div>
              <div style={{ fontSize: "7.5pt", fontWeight: "bold", textTransform: "uppercase" }}>Conferencia de Retorno</div>
              <div style={{ fontSize: "6.5pt", color: "#666" }}>Almoxarifado Estrela / GEL</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9" }}>
      {/* BARRA DE CONTROLE */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: "#1e3a5f",
          padding: "12px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 18px",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.25)",
            backgroundColor: "transparent",
            color: "#fff",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Voltar para OS
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ textAlign: "right", color: "#cbd5e1" }}>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px" }}>
              Visualizacao de Impressao
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>
              OS {os.nOS} - {os.descricao}
            </div>
          </div>

          <button
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 22px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.9rem",
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
            }}
          >
            <Printer size={18} /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* CARDS DE INFO */}
      <div
        className="no-print"
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          padding: "20px 20px 8px",
          display: "flex",
          gap: "12px",
        }}
      >
        {[
          { icon: <FileText size={14} />, label: "No OS", value: os.nOS, color: "#1e3a5f" },
          { icon: <Wrench size={14} />, label: "Ferramenta", value: os.tag || "-", color: "#4a7c59" },
          { icon: <Clock size={14} />, label: "Envio", value: os.dateEnvioStr || "-", color: "#92400e" },
          {
            icon: <CheckCircle size={14} />,
            label: "Status",
            value: os.status || "Enviado",
            color:
              os.status === "Retornado"
                ? "#166534"
                : os.status === "Cancelado"
                ? "#991b1b"
                : "#92400e",
          },
        ].map((b, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "10px 14px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              borderLeft: `3px solid ${b.color}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                color: b.color,
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "4px",
              }}
            >
              {b.icon} {b.label}
            </div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b" }}>{b.value}</div>
          </div>
        ))}
      </div>

      {/* FOLHA SIMULADA */}
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "12px 20px 40px" }}>
        <div
          style={{
            backgroundColor: "#ffffff",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            borderRadius: "4px",
            padding: "28px 32px",
          }}
        >
          {/* VIA 1 */}
          <OSForm copy="ALMOXARIFADO" />

          {/* SEPARADOR */}
          <div
            className="cut-line"
            style={{
              margin: "18px 0",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#94a3b8",
              fontSize: "7.5pt",
            }}
          >
            <div style={{ flex: 1, borderTop: "1.5px dashed #94a3b8" }}></div>
            <span style={{ whiteSpace: "nowrap", letterSpacing: "1px", fontWeight: 600 }}>
              RECORTAR AQUI - VIA DA OFICINA
            </span>
            <div style={{ flex: 1, borderTop: "1.5px dashed #94a3b8" }}></div>
          </div>

          {/* VIA 2 */}
          <OSForm copy="OFICINA" />

          {/* RODAPE */}
          <div
            style={{
              marginTop: "14px",
              textAlign: "center",
              fontSize: "6.5pt",
              color: "#94a3b8",
              letterSpacing: "0.3px",
            }}
          >
            GEL Engenharia - Almoxarifado Estrela | UHE Estrela | C.C. 60218 - OS impressa em:{" "}
            {new Date().toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      {/* CSS IMPRESSAO */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body {
            margin: 0;
            padding: 0;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: A4 portrait;
            margin: 8mm 12mm;
          }
        }
      `}</style>
    </div>
  );
};

export default OSPrint;
