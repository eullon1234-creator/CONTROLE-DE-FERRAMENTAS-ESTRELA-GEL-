import * as XLSX from 'xlsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (val) => {
  if (!val) return '-';
  if (val instanceof Date) return val.toLocaleDateString('pt-BR');
  if (val?.toDate) return val.toDate().toLocaleDateString('pt-BR');
  return String(val);
};

const fmtBool = (val) => (val ? '✅ Sim' : '❌ Não');

const fmtStatus = (status) => {
  const map = {
    ATIVO: '🟢 ATIVO',
    DEVOLVIDO: '⚫ DEVOLVIDO',
    'EM CONCERTO': '🟡 EM CONSERTO',
    Enviado: '🟡 ENVIADO',
    'Em Conserto': '🟡 EM CONSERTO',
    Retornado: '⚫ RETORNADO',
    Cancelado: '🔴 CANCELADO',
    Disponível: '🟢 Disponível',
    'Em Manutenção': '🟡 Em Manutenção',
    Inativo: '⚫ Inativo',
  };
  return map[status] || status || '-';
};

/** Adjust column widths based on data content */
const autoWidth = (ws, data, headers) => {
  const colWidths = headers.map((h) => Math.max(h.length, 10));
  data.forEach((row) => {
    Object.values(row).forEach((val, i) => {
      const len = String(val ?? '').length;
      if (len > colWidths[i]) colWidths[i] = len;
    });
  });
  ws['!cols'] = colWidths.map((w) => ({ wch: Math.min(w + 2, 60) }));
};

// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildResumoSheet(termos, equipamentos, colaboradores, osList) {
  const now = new Date();
  const totalTermos = termos.length;
  const ativos = termos.filter((t) => t.status === 'ATIVO').length;
  const devolvidos = termos.filter((t) => t.status === 'DEVOLVIDO').length;
  const emConserto = termos.filter((t) => t.status === 'EM CONCERTO').length;
  const totalQtdAtiva = termos
    .filter((t) => t.status === 'ATIVO')
    .reduce((a, t) => a + (Number(t.quantidade) || 1), 0);
  const totalEquipamentos = equipamentos.length;
  const eqDisp = equipamentos.filter((e) => e.status === 'Disponível').length;
  const eqManut = equipamentos.filter((e) => e.status === 'Em Manutenção').length;
  const totalColaboradores = colaboradores.length;
  const collabComAtivos = colaboradores.filter((c) => (c.totalItensAtivos || 0) > 0).length;
  const totalOS = osList.length;
  const osPendente = osList.filter((o) => {
    const s = (o.status || '').toLowerCase();
    return s === 'enviado' || s === 'em conserto';
  }).length;
  const osRetornado = osList.filter((o) => o.status?.toLowerCase() === 'retornado').length;

  const rows = [
    ['RELATÓRIO COMPLETO — CONTROLE DE FERRAMENTARIA'],
    ['UHE Estrela | GEL Engenharia'],
    [`Data de Geração: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`],
    [],
    ['━━━ TERMOS DE RESPONSABILIDADE ━━━'],
    ['Total de Termos Cadastrados', totalTermos],
    ['Termos ATIVOS', ativos],
    ['Termos DEVOLVIDOS', devolvidos],
    ['Termos EM CONSERTO', emConserto],
    ['Total de Unidades Ativas (Qtd)', totalQtdAtiva],
    [],
    ['━━━ CATÁLOGO DE EQUIPAMENTOS ━━━'],
    ['Total de Equipamentos no Catálogo', totalEquipamentos],
    ['Equipamentos Disponíveis', eqDisp],
    ['Equipamentos em Manutenção', eqManut],
    [],
    ['━━━ COLABORADORES ━━━'],
    ['Total de Colaboradores', totalColaboradores],
    ['Colaboradores com Itens Ativos', collabComAtivos],
    [],
    ['━━━ ORDENS DE SERVIÇO (CONSERTOS) ━━━'],
    ['Total de OS Registradas', totalOS],
    ['OS Pendentes (Enviado / Em Conserto)', osPendente],
    ['OS Retornadas', osRetornado],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 45 }, { wch: 20 }];
  return ws;
}

function buildTermosSheet(termos) {
  const headers = [
    'Data Empréstimo',
    'Colaborador',
    'Função / Cargo',
    'Equipamento / Material',
    'Marca',
    'Modelo',
    'Código / TAG',
    'Categoria',
    'Quantidade',
    'Status',
    'Assinado Digitalmente',
    'Data Devolução / OS',
    'Observação',
  ];

  const rows = termos.map((t) => ({
    'Data Empréstimo': fmtDate(t.dateObj || t.dataEntrada),
    Colaborador: t.colaboradorNome || '-',
    'Função / Cargo': t.colaboradorFuncao || '-',
    'Equipamento / Material': t.descricaoMaterial || '-',
    Marca: t.marca || '-',
    Modelo: t.modelo || '-',
    'Código / TAG': t.tag || t.codEquipamento || '-',
    Categoria: t.grupo || '-',
    Quantidade: Number(t.quantidade) || 1,
    Status: fmtStatus(t.status),
    'Assinado Digitalmente': fmtBool(!!t.assinaturaBase64),
    'Data Devolução / OS': fmtDate(t.retDateObj || t.dataDevolucao),
    Observação: t.observacao || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  autoWidth(ws, rows, headers);
  return ws;
}

function buildEquipamentosSheet(equipamentos) {
  const headers = [
    'TAG',
    'Descrição',
    'Marca / Modelo',
    'Categoria',
    'Unidade',
    'Qtd Total',
    'Status',
    'Setor',
    'Observação',
  ];

  const rows = equipamentos.map((e) => ({
    TAG: e.tag || e.cod || e.id || '-',
    Descrição: e.descricao || '-',
    'Marca / Modelo': e.marcaModelo || '-',
    Categoria: e.grupo || '-',
    Unidade: e.und || 'Unidade',
    'Qtd Total': Number(e.quantidadeTotal) || 0,
    Status: fmtStatus(e.status),
    Setor: e.setor || 'Almoxarifado',
    Observação: e.observacao || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  autoWidth(ws, rows, headers);
  return ws;
}

function buildColaboradoresSheet(colaboradores, termos) {
  const headers = [
    'Colaborador',
    'Função / Cargo',
    'Itens Ativos (Qtd)',
    'Itens Devolvidos (Qtd)',
    'Total de Registros',
    'Último Empréstimo',
  ];

  const rows = colaboradores.map((c) => {
    const collabTermos = termos.filter((t) => t.colaboradorId === c.id || t.colaboradorNome === c.nome);
    const lastTermo = collabTermos.sort((a, b) => {
      const da = a.dateObj instanceof Date ? a.dateObj : (a.dataEntrada?.toDate?.() || new Date(0));
      const db_ = b.dateObj instanceof Date ? b.dateObj : (b.dataEntrada?.toDate?.() || new Date(0));
      return db_ - da;
    })[0];

    return {
      Colaborador: c.nome || '-',
      'Função / Cargo': c.funcao || '-',
      'Itens Ativos (Qtd)': Number(c.totalItensAtivos) || 0,
      'Itens Devolvidos (Qtd)': Number(c.totalItensDevolvidos) || 0,
      'Total de Registros': collabTermos.length,
      'Último Empréstimo': lastTermo
        ? fmtDate(lastTermo.dateObj instanceof Date ? lastTermo.dateObj : lastTermo.dataEntrada?.toDate?.())
        : '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  autoWidth(ws, rows, headers);
  return ws;
}

function buildOSSheet(osList) {
  const headers = [
    'Nº OS',
    'Data da OS',
    'Data Envio',
    'TAG',
    'Descrição do Material',
    'Status',
    'Data Retorno',
    'Dias em Conserto',
    'Observação',
  ];

  const getDays = (os) => {
    const s = (os.status || '').toLowerCase();
    if (s === 'retornado' || s === 'cancelado') return os.diasEmConserto || 0;
    const envio = os.dateEnvioObj instanceof Date
      ? os.dateEnvioObj
      : (os.dataEnvio?.toDate?.() || null);
    if (!envio) return 0;
    return Math.floor((new Date() - envio) / (1000 * 60 * 60 * 24));
  };

  const rows = osList.map((os) => ({
    'Nº OS': os.nOS || '-',
    'Data da OS': fmtDate(os.dateOSObj || os.dataOS),
    'Data Envio': fmtDate(os.dateEnvioObj || os.dataEnvio),
    TAG: os.tag || '-',
    'Descrição do Material': os.descricao || '-',
    Status: fmtStatus(os.status),
    'Data Retorno': fmtDate(os.dateRetornoObj || os.dataRetorno),
    'Dias em Conserto': getDays(os),
    Observação: os.observacao || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  autoWidth(ws, rows, headers);
  return ws;
}

// ─── Main Export Function ─────────────────────────────────────────────────────

/**
 * Generates and downloads a full Excel report with 5 sheets.
 * @param {{ termos: Array, equipamentos: Array, colaboradores: Array, osList: Array }} data
 */
export function exportFullReport({ termos, equipamentos, colaboradores, osList }) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  XLSX.utils.book_append_sheet(wb, buildResumoSheet(termos, equipamentos, colaboradores, osList), '📊 Resumo Geral');

  // Sheet 2: Termos
  XLSX.utils.book_append_sheet(wb, buildTermosSheet(termos), '📋 Termos de Resp.');

  // Sheet 3: Equipamentos
  XLSX.utils.book_append_sheet(wb, buildEquipamentosSheet(equipamentos), '🔧 Equipamentos');

  // Sheet 4: Colaboradores
  XLSX.utils.book_append_sheet(wb, buildColaboradoresSheet(colaboradores, termos), '👷 Colaboradores');

  // Sheet 5: Ordens de Serviço
  XLSX.utils.book_append_sheet(wb, buildOSSheet(osList), '🔨 Ordens de Serviço');

  // Generate filename with current date
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const filename = `Relatorio_Ferramentaria_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}
