import * as XLSX from 'xlsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeDateCell = (date) => {
  if (!date) return { v: '-', t: 's' };
  let dateObj = date;
  if (date?.toDate) dateObj = date.toDate();
  if (!(dateObj instanceof Date)) {
    const parsed = Date.parse(dateObj);
    if (!isNaN(parsed)) dateObj = new Date(parsed);
    else return { v: String(dateObj), t: 's' };
  }
  // Remove time component to keep it clean as date
  const cleanDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  return { v: cleanDate, t: 'd', z: 'dd/mm/yyyy' };
};

const makeNumberCell = (val) => {
  const num = Number(val);
  if (isNaN(num)) return { v: val || 0, t: 'n', z: '#,##0' };
  return { v: num, t: 'n', z: '#,##0' };
};

const makeBoolCell = (val) => {
  return { v: val ? '✅ Sim' : '❌ Não', t: 's' };
};

const makeStatusCell = (status) => {
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
  return { v: map[status] || status || '-', t: 's' };
};

/** Convert column index to Excel column letter (e.g. 0 -> A, 1 -> B, 26 -> AA) */
function getColLetter(colIndex) {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/** Adjust column widths based on data content */
const autoWidth = (ws, data, headers) => {
  const colWidths = headers.map((h) => Math.max(h.length, 10));
  data.forEach((row) => {
    Object.values(row).forEach((val, i) => {
      let displayVal = val;
      if (val && typeof val === 'object' && 'v' in val) {
        displayVal = val.v;
      } else if (val && typeof val === 'object' && 'f' in val) {
        displayVal = val.f;
      }
      
      let strVal = '';
      if (displayVal instanceof Date) {
        strVal = displayVal.toLocaleDateString('pt-BR');
      } else {
        strVal = String(displayVal ?? '');
      }

      const len = strVal.length;
      if (len > colWidths[i]) colWidths[i] = len;
    });
  });
  ws['!cols'] = colWidths.map((w) => ({ wch: Math.min(w + 2, 60) }));
};

// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildResumoSheet(termos, equipamentos, colaboradores, osList) {
  const now = new Date();

  const rows = [
    ['RELATÓRIO COMPLETO — CONTROLE DE FERRAMENTARIA'],
    ['UHE Estrela | GEL Engenharia'],
    [`Data de Geração: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`],
    [],
    ['━━━ TERMOS DE RESPONSABILIDADE ━━━'],
    ['Total de Termos Cadastrados', { f: "COUNTA('📋 Termos de Resp.'!B:B)-1", t: 'n', z: '#,##0' }],
    ['Termos ATIVOS', { f: "COUNTIF('📋 Termos de Resp.'!J:J, \"*ATIVO\")", t: 'n', z: '#,##0' }],
    ['Termos DEVOLVIDOS', { f: "COUNTIF('📋 Termos de Resp.'!J:J, \"*DEVOLVIDO\")", t: 'n', z: '#,##0' }],
    ['Termos EM CONSERTO', { f: "COUNTIF('📋 Termos de Resp.'!J:J, \"*CONSERTO\")", t: 'n', z: '#,##0' }],
    ['Total de Unidades Ativas (Qtd)', { f: "SUMIF('📋 Termos de Resp.'!J:J, \"*ATIVO\", '📋 Termos de Resp.'!I:I)", t: 'n', z: '#,##0' }],
    [],
    ['━━━ CATÁLOGO DE EQUIPAMENTOS ━━━'],
    ['Total de Equipamentos no Catálogo', { f: "COUNTA('🔧 Equipamentos'!B:B)-1", t: 'n', z: '#,##0' }],
    ['Equipamentos Disponíveis', { f: "COUNTIF('🔧 Equipamentos'!G:G, \"*Disponível\")", t: 'n', z: '#,##0' }],
    ['Equipamentos em Manutenção', { f: "COUNTIF('🔧 Equipamentos'!G:G, \"*Manutenção\")", t: 'n', z: '#,##0' }],
    [],
    ['━━━ COLABORADORES ━━━'],
    ['Total de Colaboradores', { f: "COUNTA('👷 Colaboradores'!A:A)-1", t: 'n', z: '#,##0' }],
    ['Colaboradores com Itens Ativos', { f: "COUNTIF('👷 Colaboradores'!C:C, \">0\")", t: 'n', z: '#,##0' }],
    [],
    ['━━━ ORDENS DE SERVIÇO (CONSERTOS) ━━━'],
    ['Total de OS Registradas', { f: "COUNTA('🔨 Ordens de Serviço'!A:A)-1", t: 'n', z: '#,##0' }],
    ['OS Pendentes (Enviado / Em Conserto)', { f: "COUNTIF('🔨 Ordens de Serviço'!F:F, \"*ENVIADO\") + COUNTIF('🔨 Ordens de Serviço'!F:F, \"*CONSERTO\")", t: 'n', z: '#,##0' }],
    ['OS Retornadas', { f: "COUNTIF('🔨 Ordens de Serviço'!F:F, \"*RETORNADO\")", t: 'n', z: '#,##0' }],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 45 }, { wch: 20 }];
  
  // Exibir linhas de grade
  ws['!views'] = [{ showGridLines: true }];
  
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
    'Data Empréstimo': makeDateCell(t.dateObj || t.dataEntrada),
    Colaborador: t.colaboradorNome || '-',
    'Função / Cargo': t.colaboradorFuncao || '-',
    'Equipamento / Material': t.descricaoMaterial || '-',
    Marca: t.marca || '-',
    Modelo: t.modelo || '-',
    'Código / TAG': t.tag || t.codEquipamento || '-',
    Categoria: t.grupo || '-',
    Quantidade: makeNumberCell(t.quantidade || 1),
    Status: makeStatusCell(t.status),
    'Assinado Digitalmente': makeBoolCell(!!t.assinaturaBase64),
    'Data Devolução / OS': makeDateCell(t.retDateObj || t.dataDevolucao),
    Observação: t.observacao || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  
  // Configurar autofiltro e congelar cabeçalho
  const lastColChar = getColLetter(headers.length - 1);
  const totalRows = rows.length + 1;
  ws['!autofilter'] = { ref: `A1:${lastColChar}${totalRows}` };
  ws['!views'] = [{ state: 'frozen', ySplit: 1, showGridLines: true }];

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
    'Qtd Total': makeNumberCell(e.quantidadeTotal || 0),
    Status: makeStatusCell(e.status),
    Setor: e.setor || 'Almoxarifado',
    Observação: e.observacao || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Configurar autofiltro e congelar cabeçalho
  const lastColChar = getColLetter(headers.length - 1);
  const totalRows = rows.length + 1;
  ws['!autofilter'] = { ref: `A1:${lastColChar}${totalRows}` };
  ws['!views'] = [{ state: 'frozen', ySplit: 1, showGridLines: true }];

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
      'Itens Ativos (Qtd)': makeNumberCell(c.totalItensAtivos || 0),
      'Itens Devolvidos (Qtd)': makeNumberCell(c.totalItensDevolvidos || 0),
      'Total de Registros': makeNumberCell(collabTermos.length),
      'Último Empréstimo': makeDateCell(lastTermo ? (lastTermo.dateObj instanceof Date ? lastTermo.dateObj : lastTermo.dataEntrada?.toDate?.()) : null),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Configurar autofiltro e congelar cabeçalho
  const lastColChar = getColLetter(headers.length - 1);
  const totalRows = rows.length + 1;
  ws['!autofilter'] = { ref: `A1:${lastColChar}${totalRows}` };
  ws['!views'] = [{ state: 'frozen', ySplit: 1, showGridLines: true }];

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

  const rows = osList.map((os, idx) => {
    const rowNum = idx + 2; // Cabeçalho é linha 1, dados começam na 2
    
    // Fórmula para calcular dias de conserto dinamicamente no Excel:
    // Se a coluna F (Status) for igual a "⚫ RETORNADO", calcula a diferença G (Retorno) - C (Envio).
    // Caso contrário, calcula a diferença TODAY() - C (Envio)
    const formula = `=IF(F${rowNum}="⚫ RETORNADO", G${rowNum}-C${rowNum}, TODAY()-C${rowNum})`;

    return {
      'Nº OS': os.nOS || '-',
      'Data da OS': makeDateCell(os.dateOSObj || os.dataOS),
      'Data Envio': makeDateCell(os.dateEnvioObj || os.dataEnvio),
      TAG: os.tag || '-',
      'Descrição do Material': os.descricao || '-',
      Status: makeStatusCell(os.status),
      'Data Retorno': makeDateCell(os.dateRetornoObj || os.dataRetorno),
      'Dias em Conserto': { f: formula, t: 'n', z: '#,##0' },
      Observação: os.observacao || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Configurar autofiltro e congelar cabeçalho
  const lastColChar = getColLetter(headers.length - 1);
  const totalRows = rows.length + 1;
  ws['!autofilter'] = { ref: `A1:${lastColChar}${totalRows}` };
  ws['!views'] = [{ state: 'frozen', ySplit: 1, showGridLines: true }];

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

