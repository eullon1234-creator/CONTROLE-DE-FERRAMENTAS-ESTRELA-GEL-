// Dynamic script loader for ExcelJS to avoid local build/dependency installation issues
let excelJsPromise = null;
function loadExcelJS() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if (excelJsPromise) return excelJsPromise;

  excelJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    script.onload = () => resolve(window.ExcelJS);
    script.onerror = () => {
      excelJsPromise = null;
      reject(new Error('Erro ao carregar a biblioteca de exportação Excel (ExcelJS). Verifique sua conexão com a internet.'));
    };
    document.head.appendChild(script);
  });
  return excelJsPromise;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseDateValue = (date) => {
  if (!date) return null;
  let dateObj = date;
  if (date?.toDate) dateObj = date.toDate();
  if (!(dateObj instanceof Date)) {
    const parsed = Date.parse(dateObj);
    if (!isNaN(parsed)) dateObj = new Date(parsed);
    else return String(dateObj);
  }
  // Keep only date component
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
};

const makeStatusText = (status) => {
  const map = {
    ATIVO: '🟢 ATIVO',
    ATIVA: '🟢 ATIVA',
    DEVOLVIDO: '⚫ DEVOLVIDO',
    'DEVOLVIDO AO FORNECEDOR': '⚫ DEVOLVIDO AO FORNECEDOR',
    'EM CONCERTO': '🟡 EM CONSERTO',
    Enviado: '🟡 ENVIADO',
    'Em Conserto': '🟡 EM CONSERTO',
    Retornado: '⚫ RETORNADO',
    Cancelado: '🔴 CANCELADO',
    Disponível: '🟢 DISPONÍVEL',
    Cautelado: '🔵 CAUTELADO',
    'Devolvido ao Fornecedor': '⚫ DEVOLVIDO AO FORNECEDOR',
    'Em Manutenção': '🟡 Em Manutenção',
    Inativo: '⚫ Inativo',
  };
  return map[status] || status || '-';
};

/** Styles the status cell as a badge with matching colors */
const applyStatusStyle = (cell, text) => {
  if (!text) return;
  const upper = text.toString().toUpperCase();
  let bg = null;
  let fg = null;
  
  if (upper.includes('DISPONÍVEL') || upper.includes('DISPONIVEL')) {
    bg = 'DEF7EC'; // soft green
    fg = '03543F'; // dark green
  } else if (upper.includes('ATIVO') || upper.includes('ATIVA')) {
    bg = 'DEF7EC'; // soft green
    fg = '03543F'; // dark green
  } else if (upper.includes('DEVOLVIDO') || upper.includes('RETORNADO') || upper.includes('INATIVO') || upper.includes('FORNECEDOR')) {
    bg = 'F3F4F6'; // soft gray
    fg = '374151'; // dark gray
  } else if (upper.includes('CAUTELADO')) {
    bg = 'E1EFFE'; // soft blue
    fg = '1E429F'; // dark blue
  } else if (upper.includes('CONSERTO') || upper.includes('MANUTENÇÃO') || upper.includes('MANUTENCAO') || upper.includes('ENVIADO')) {
    bg = 'FEF3C7'; // soft yellow
    fg = '78350F'; // dark yellow
  } else if (upper.includes('CANCELADO')) {
    bg = 'FDE8E8'; // soft red
    fg = '9B1C1C'; // dark red
  }
  
  if (bg && fg) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } };
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: `FF${fg}` } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  }
};

/** Shared row stylers */
const styleHeader = (row) => {
  row.height = 32;
  row.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Deep Blue
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E293B' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      left: { style: 'thin', color: { argb: 'FF1E293B' } },
      right: { style: 'thin', color: { argb: 'FF1E293B' } }
    };
  });
};

const styleDataRow = (row, rowIndex) => {
  const isEven = rowIndex % 2 === 0;
  const bgArgb = isEven ? 'FFF8FAFC' : 'FFFFFFFF'; // Alternate zebra stripes
  
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
};

/** Setup common worksheet options */
const setupSheetView = (sheet) => {
  sheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: true }];
};

/** Auto-fit column widths based on cell contents */
const autoWidth = (sheet, minWidths = []) => {
  sheet.columns.forEach((column, colIndex) => {
    let maxLen = minWidths[colIndex] || 10;
    column.eachCell({ includeEmpty: false }, (cell) => {
      let val = cell.value;
      if (val && typeof val === 'object' && val.formula) {
        val = ''; // Ignore formula strings length
      }
      let str = '';
      if (val instanceof Date) {
        str = val.toLocaleDateString('pt-BR');
      } else if (val !== null && val !== undefined) {
        str = String(val);
      }
      if (str.length > maxLen) {
        maxLen = str.length;
      }
    });
    column.width = Math.min(maxLen + 4, 60);
  });
};

// ─── Sheet Builders ──────────────────────────────────────────────────────────

function buildResumoSheet(workbook) {
  const sheet = workbook.addWorksheet('📊 Resumo Geral', { views: [{ showGridLines: true }] });
  sheet.getColumn(1).width = 45;
  sheet.getColumn(2).width = 25;

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR');

  // Title Banner
  const r1 = sheet.addRow(['RELATÓRIO COMPLETO — CONTROLE DE FERRAMENTARIA']);
  sheet.mergeCells('A1:B1');
  r1.height = 40;
  r1.getCell(1).font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  r1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Subtitle
  const r2 = sheet.addRow(['UHE Estrela | GEL Engenharia']);
  sheet.mergeCells('A2:B2');
  r2.height = 24;
  r2.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  r2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }; // Blue accent
  r2.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Timestamp
  const r3 = sheet.addRow([`Gerado em: ${dateStr} às ${timeStr}`]);
  sheet.mergeCells('A3:B3');
  r3.height = 20;
  r3.getCell(1).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
  r3.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  r3.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  r3.getCell(1).border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };

  // Blank spacer
  sheet.addRow([]);

  // Sections Data Helper
  const addSection = (title, items) => {
    const headerRow = sheet.addRow([`  ${title}`, '']);
    sheet.mergeCells(`A${headerRow.number}:B${headerRow.number}`);
    headerRow.height = 28;
    const headerCell = headerRow.getCell(1);
    headerCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E40AF' } };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // soft light blue
    headerCell.alignment = { vertical: 'middle', horizontal: 'left' };
    headerCell.border = {
      top: { style: 'thin', color: { argb: 'FF93C5FD' } },
      bottom: { style: 'thin', color: { argb: 'FF93C5FD' } }
    };

    items.forEach(([label, value]) => {
      const row = sheet.addRow([label, value]);
      row.height = 24;
      
      const c1 = row.getCell(1);
      const c2 = row.getCell(2);

      c1.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };
      c1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      
      c2.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      c2.alignment = { vertical: 'middle', horizontal: 'right' };
      
      // If it is a formula object, set it correctly
      if (value && typeof value === 'object' && value.formula) {
        c2.value = value;
      }
      c2.numFmt = '#,##0';

      const borders = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      c1.border = borders;
      c2.border = borders;
    });

    sheet.addRow([]); // Spacer after section
  };

  addSection('TERMOS DE RESPONSABILIDADE', [
    ['Total de Termos Cadastrados', { formula: "COUNTA('📋 Termos de Resp.'!B:B)-1" }],
    ['Termos ATIVOS', { formula: "COUNTIF('📋 Termos de Resp.'!J:J, \"*ATIVO\")" }],
    ['Termos DEVOLVIDOS AO ESTOQUE', { formula: "COUNTIF('📋 Termos de Resp.'!J:J, \"*DEVOLVIDO\")" }],
    ['Termos DEVOLVIDOS AO FORNECEDOR', { formula: "COUNTIF('📋 Termos de Resp.'!J:J, \"*FORNECEDOR\")" }],
    ['Termos EM CONSERTO', { formula: "COUNTIF('📋 Termos de Resp.'!J:J, \"*CONSERTO\")" }],
    ['Total de Unidades Ativas (Qtd)', { formula: "SUMIF('📋 Termos de Resp.'!J:J, \"*ATIVO\", '📋 Termos de Resp.'!I:I)" }]
  ]);

  addSection('CATÁLOGO DE EQUIPAMENTOS', [
    ['Total de Equipamentos no Catálogo', { formula: "COUNTA('🔧 Equipamentos'!B:B)-1" }],
    ['Equipamentos no Almoxarifado (Disponível)', { formula: "COUNTIF('🔧 Equipamentos'!I:I, \"*DISPONÍVEL\")" }],
    ['Equipamentos Cautelados', { formula: "COUNTIF('🔧 Equipamentos'!I:I, \"*CAUTELADO\")" }],
    ['Equipamentos em Manutenção', { formula: "COUNTIF('🔧 Equipamentos'!I:I, \"*Manutenção\")" }],
    ['Equipamentos Devolvidos ao Fornecedor', { formula: "COUNTIF('🔧 Equipamentos'!I:I, \"*FORNECEDOR\")" }]
  ]);

  addSection('COLABORADORES', [
    ['Total de Colaboradores', { formula: "COUNTA('👷 Colaboradores'!A:A)-1" }],
    ['Colaboradores com Itens Ativos', { formula: "COUNTIF('👷 Colaboradores'!C:C, \">0\")" }]
  ]);

  addSection('ORDENS DE SERVIÇO (CONSERTOS)', [
    ['Total de OS Registradas', { formula: "COUNTA('🔨 Ordens de Serviço'!A:A)-1" }],
    ['OS Pendentes (Enviado / Em Conserto)', { formula: "COUNTIF('🔨 Ordens de Serviço'!F:F, \"*ENVIADO\") + COUNTIF('🔨 Ordens de Serviço'!F:F, \"*CONSERTO\")" }],
    ['OS Retornadas', { formula: "COUNTIF('🔨 Ordens de Serviço'!F:F, \"*RETORNADO\")" }]
  ]);
}

function buildTermosSheet(workbook, termos) {
  const sheet = workbook.addWorksheet('📋 Termos de Resp.');
  setupSheetView(sheet);

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
    'Observação'
  ];

  const headerRow = sheet.addRow(headers);
  styleHeader(headerRow);

  termos.forEach((t, i) => {
    const statusVal = makeStatusText(t.status);
    const row = sheet.addRow([
      parseDateValue(t.dateObj || t.dataEntrada),
      t.colaboradorNome || '-',
      t.colaboradorFuncao || '-',
      t.descricaoMaterial || '-',
      t.marca || '-',
      t.modelo || '-',
      t.tag || t.codEquipamento || '-',
      t.grupo || '-',
      Number(t.quantidade || 1),
      statusVal,
      t.assinaturaBase64 ? '✅ Sim' : '❌ Não',
      parseDateValue(t.retDateObj || t.dataDevolucao),
      t.observacao || '-'
    ]);

    styleDataRow(row, i);

    // Apply specific formatters
    row.getCell(1).numFmt = 'dd/mm/yyyy';
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(9).numFmt = '#,##0';
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
    
    applyStatusStyle(row.getCell(10), statusVal);
    
    row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(12).numFmt = 'dd/mm/yyyy';
    row.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  sheet.autoFilter = `A1:M${termos.length + 1}`;
  autoWidth(sheet, [15, 25, 20, 30, 15, 15, 15, 18, 12, 18, 20, 18, 30]);
}

function buildEquipamentosSheet(workbook, equipamentos, termos) {
  const sheet = workbook.addWorksheet('🔧 Equipamentos');
  setupSheetView(sheet);

  const headers = [
    'TAG',
    'Descrição',
    'Marca / Modelo',
    'Categoria',
    'Unidade',
    'Qtd Total',
    'Tipo de Posse',
    'Locador / Fornecedor',
    'Status',
    'Setor',
    'Observação'
  ];

  const headerRow = sheet.addRow(headers);
  styleHeader(headerRow);

  equipamentos.forEach((e, i) => {
    const isCautelado = e.tag && termos.some(t => t.status === 'ATIVO' && (t.tag || t.codEquipamento || '').toUpperCase().trim() === e.tag.toUpperCase().trim());
    let statusText = e.status || 'Disponível';
    if (statusText === 'Disponível' || statusText === 'ATIVO' || statusText === 'ATIVA') {
      statusText = isCautelado ? 'Cautelado' : 'Disponível';
    }
    const statusVal = makeStatusText(statusText);

    const row = sheet.addRow([
      e.tag || e.cod || e.id || '-',
      e.descricao || '-',
      e.marcaModelo || '-',
      e.grupo || '-',
      e.und || 'Unidade',
      Number(e.quantidadeTotal || 0),
      e.tipoPosse || 'Própria',
      e.locador || '-',
      statusVal,
      e.setor || 'Almoxarifado',
      e.observacao || '-'
    ]);

    styleDataRow(row, i);

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).numFmt = '#,##0';
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    
    applyStatusStyle(row.getCell(9), statusVal);
    
    row.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  sheet.autoFilter = `A1:K${equipamentos.length + 1}`;
  autoWidth(sheet, [15, 30, 20, 18, 12, 12, 15, 20, 18, 18, 30]);
}

function buildColaboradoresSheet(workbook, colaboradores, termos) {
  const sheet = workbook.addWorksheet('👷 Colaboradores');
  setupSheetView(sheet);

  const headers = [
    'Colaborador',
    'Função / Cargo',
    'Itens Ativos (Qtd)',
    'Itens Devolvidos (Qtd)',
    'Total de Registros',
    'Último Empréstimo'
  ];

  const headerRow = sheet.addRow(headers);
  styleHeader(headerRow);

  colaboradores.forEach((c, i) => {
    const collabTermos = termos.filter((t) => t.colaboradorId === c.id || t.colaboradorNome === c.nome);
    const lastTermo = collabTermos.sort((a, b) => {
      const da = a.dateObj instanceof Date ? a.dateObj : (a.dataEntrada?.toDate?.() || new Date(0));
      const db_ = b.dateObj instanceof Date ? b.dateObj : (b.dataEntrada?.toDate?.() || new Date(0));
      return db_ - da;
    })[0];

    const row = sheet.addRow([
      c.nome || '-',
      c.funcao || '-',
      Number(c.totalItensAtivos || 0),
      Number(c.totalItensDevolvidos || 0),
      collabTermos.length,
      parseDateValue(lastTermo ? (lastTermo.dateObj instanceof Date ? lastTermo.dateObj : lastTermo.dataEntrada?.toDate?.()) : null)
    ]);

    styleDataRow(row, i);

    row.getCell(3).numFmt = '#,##0';
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).numFmt = '#,##0';
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).numFmt = '#,##0';
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    
    row.getCell(6).numFmt = 'dd/mm/yyyy';
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  sheet.autoFilter = `A1:F${colaboradores.length + 1}`;
  autoWidth(sheet, [30, 25, 18, 20, 18, 18]);
}

function buildOSSheet(workbook, osList) {
  const sheet = workbook.addWorksheet('🔨 Ordens de Serviço');
  setupSheetView(sheet);

  const headers = [
    'Nº OS',
    'Data da OS',
    'Data Envio',
    'TAG',
    'Descrição do Material',
    'Status',
    'Data Retorno',
    'Dias em Conserto',
    'Observação'
  ];

  const headerRow = sheet.addRow(headers);
  styleHeader(headerRow);

  osList.forEach((os, idx) => {
    const rowNum = idx + 2; // Data rows start at 2
    const statusVal = makeStatusText(os.status);
    
    // Formula for dynamically calculating repair days:
    // If Status (col F) equals returned status, subtract return date (col G) - send date (col C).
    // Otherwise, subtract TODAY() - send date (col C)
    const formula = `IF(F${rowNum}="⚫ RETORNADO", G${rowNum}-C${rowNum}, TODAY()-C${rowNum})`;

    const row = sheet.addRow([
      os.nOS || '-',
      parseDateValue(os.dateOSObj || os.dataOS),
      parseDateValue(os.dateEnvioObj || os.dataEnvio),
      os.tag || '-',
      os.descricao || '-',
      statusVal,
      parseDateValue(os.dateRetornoObj || os.dataRetorno),
      { formula: formula },
      os.observacao || '-'
    ]);

    styleDataRow(row, idx);

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).numFmt = 'dd/mm/yyyy';
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).numFmt = 'dd/mm/yyyy';
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    
    applyStatusStyle(row.getCell(6), statusVal);
    
    row.getCell(7).numFmt = 'dd/mm/yyyy';
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(8).numFmt = '#,##0';
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  sheet.autoFilter = `A1:I${osList.length + 1}`;
  autoWidth(sheet, [12, 15, 15, 15, 30, 18, 15, 18, 30]);
}

// ─── Main Export Function ─────────────────────────────────────────────────────

/**
 * Generates and downloads a beautiful, fully-styled Excel report with 5 sheets.
 * @param {{ termos: Array, equipamentos: Array, colaboradores: Array, osList: Array }} data
 */
export async function exportFullReport({ termos, equipamentos, colaboradores, osList }) {
  try {
    // Dynamically load ExcelJS from CDN
    const ExcelJS = await loadExcelJS();
    
    // Create new Workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Controle de Ferramentaria — UHE Estrela';
    wb.lastModifiedBy = 'Controle de Ferramentaria';
    wb.created = new Date();
    wb.modified = new Date();

    // Sheet 1: Summary Dashboard
    buildResumoSheet(wb);

    // Sheet 2: Termos
    buildTermosSheet(wb, termos);

    // Sheet 3: Equipamentos
    buildEquipamentosSheet(wb, equipamentos, termos);

    // Sheet 4: Colaboradores
    buildColaboradoresSheet(wb, colaboradores, termos);

    // Sheet 5: Ordens de Serviço
    buildOSSheet(wb, osList);

    // Generate filename with current date
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    const filename = `Relatorio_Ferramentaria_${dateStr}.xlsx`;

    // Write to buffer and trigger browser download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Erro ao exportar planilha:', error);
    throw error;
  }
}

/**
 * Exporta a planilha de Ferramentas Ativas (empréstimos ativos) com 10 linhas vazias.
 * @param {Array} termosAtivos
 */
export async function exportActiveToolsExcel(termosAtivos) {
  try {
    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Controle de Ferramentaria — UHE Estrela';
    wb.lastModifiedBy = 'Controle de Ferramentaria';
    wb.created = new Date();
    wb.modified = new Date();

    const sheet = wb.addWorksheet('🔧 Ferramentas Ativas');
    setupSheetView(sheet);

    const headers = [
      'Nº',
      'TAG / Código',
      'Descrição da Ferramenta',
      'Colaborador (Quem está com)',
      'Função / Cargo',
      'Total Ferramentas da Pessoa',
      'Data Empréstimo',
      'Assinatura / Visto'
    ];

    const headerRow = sheet.addRow(headers);
    styleHeader(headerRow);

    termosAtivos.forEach((t, i) => {
      const row = sheet.addRow([
        i + 1,
        t.tag || t.codEquipamento || '-',
        t.descricaoMaterial || '-',
        t.colaboradorNome || '-',
        t.colaboradorFuncao || '-',
        t.totalFerramentasColaborador || t.quantidade || 1,
        parseDateValue(t.dateObj || t.dataEntrada),
        ''
      ]);

      styleDataRow(row, i);
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(7).numFmt = 'dd/mm/yyyy';
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Adicionar 10 linhas em branco com bordas para preenchimento manual
    const dataRowsCount = termosAtivos.length;
    for (let idx = 0; idx < 10; idx++) {
      const row = sheet.addRow([
        dataRowsCount + idx + 1,
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]);

      styleDataRow(row, dataRowsCount + idx);
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Forçar aplicação de bordas em todas as células (mesmo vazias)
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    }

    autoWidth(sheet, [8, 18, 32, 28, 20, 18, 16, 22]);

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    const filename = `Relatorio_Ferramentas_Ativas_${dateStr}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Erro ao exportar planilha de ferramentas ativas:', error);
    throw error;
  }
}

/**
 * Exporta a planilha de Ferramentas Danificadas (em conserto pendente) com 10 linhas vazias.
 * @param {Array} osDanificadas
 * @param {Array} colaboradores
 */
export async function exportDamagedToolsExcel(osDanificadas, colaboradores) {
  try {
    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Controle de Ferramentaria — UHE Estrela';
    wb.lastModifiedBy = 'Controle de Ferramentaria';
    wb.created = new Date();
    wb.modified = new Date();

    const sheet = wb.addWorksheet('🔧 Ferramentas Danificadas');
    setupSheetView(sheet);

    const headers = [
      'Nº',
      'TAG / Código',
      'Descrição da Ferramenta',
      'Colaborador Responsável',
      'Função / Cargo',
      'Data Envio',
      'Status Conserto'
    ];

    const headerRow = sheet.addRow(headers);
    styleHeader(headerRow);

    osDanificadas.forEach((os, i) => {
      const collab = colaboradores.find(c => c.id === os.colaboradorId || c.nome.toUpperCase() === os.colaboradorNome?.toUpperCase());
      const role = collab ? collab.funcao : '-';

      const row = sheet.addRow([
        i + 1,
        os.tag || '-',
        os.descricao || '-',
        os.colaboradorNome || '-',
        role,
        parseDateValue(os.dateEnvioObj || os.dataEnvio),
        os.status || 'Enviado'
      ]);

      styleDataRow(row, i);
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).numFmt = 'dd/mm/yyyy';
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      
      const statusText = makeStatusText(os.status || 'Enviado');
      applyStatusStyle(row.getCell(7), statusText);
    });

    // Adicionar 10 linhas em branco com bordas para preenchimento manual
    const dataRowsCount = osDanificadas.length;
    for (let idx = 0; idx < 10; idx++) {
      const row = sheet.addRow([
        dataRowsCount + idx + 1,
        '',
        '',
        '',
        '',
        '',
        ''
      ]);

      styleDataRow(row, dataRowsCount + idx);
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Forçar aplicação de bordas em todas as células (mesmo vazias)
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    }

    autoWidth(sheet, [10, 18, 30, 25, 20, 18, 20]);

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    const filename = `Relatorio_Ferramentas_Danificadas_${dateStr}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Erro ao exportar planilha de ferramentas danificadas:', error);
    throw error;
  }
}

/**
 * Exporta a planilha detalhada completa de Ordens de Serviço (OS).
 * @param {Array} osList Lista de todas as OSs
 * @param {Array} colaboradores Lista de colaboradores para enriquecer cargos
 */
export async function exportOSDetailExcel(osList, colaboradores) {
  try {
    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Controle de Ferramentaria — UHE Estrela';
    wb.lastModifiedBy = 'Controle de Ferramentaria';
    wb.created = new Date();
    wb.modified = new Date();

    const sheet = wb.addWorksheet('📋 Relatório Detalhado OS');
    setupSheetView(sheet);

    const headers = [
      'Nº OS',
      'TAG / Código',
      'Descrição da Ferramenta',
      'Colaborador Responsável',
      'Função / Cargo',
      'Data da OS',
      'Data Envio',
      'Data Retorno',
      'Dias Conserto',
      'Status',
      'Valor Orçamento (R$)',
      'Observações'
    ];

    const headerRow = sheet.addRow(headers);
    styleHeader(headerRow);

    let totalBudget = 0;

    osList.forEach((os, i) => {
      const collab = (colaboradores || []).find(c => c.id === os.colaboradorId || c.nome.toUpperCase() === os.colaboradorNome?.toUpperCase());
      const role = collab ? collab.funcao : '-';

      const valorNum = os.valorOrcamento ? parseFloat(os.valorOrcamento) : 0;
      if (!isNaN(valorNum)) {
        totalBudget += valorNum;
      }

      let dias = os.diasEmConserto != null ? os.diasEmConserto : '-';
      if (dias === '-' && os.dateEnvioObj) {
        const endDate = os.dateRetornoObj || new Date();
        const diffMs = endDate - os.dateEnvioObj;
        dias = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      const row = sheet.addRow([
        os.nOS || '-',
        os.tag || '-',
        os.descricao || '-',
        os.colaboradorNome || '-',
        role,
        parseDateValue(os.dateOSObj || os.dataOS),
        parseDateValue(os.dateEnvioObj || os.dataEnvio),
        parseDateValue(os.dateRetornoObj || os.dataRetorno),
        typeof dias === 'number' ? dias : '-',
        os.status || 'Enviado',
        valorNum > 0 ? valorNum : 0,
        os.observacao || '-'
      ]);

      styleDataRow(row, i);
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).numFmt = 'dd/mm/yyyy';
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(7).numFmt = 'dd/mm/yyyy';
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(8).numFmt = 'dd/mm/yyyy';
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };

      const statusText = makeStatusText(os.status || 'Enviado');
      applyStatusStyle(row.getCell(10), statusText);

      // Format currency
      row.getCell(11).numFmt = '"R$"#,##0.00;("R$"#,##0.00);"-"';
      row.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell(12).alignment = { vertical: 'middle', horizontal: 'left' };
    });

    // Add Summary Row at Bottom of Sheet 1
    const totalRow = sheet.addRow([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalBudget,
      `Total de ${osList.length} Ordem(ns) de Serviço registrada(s)`
    ]);

    totalRow.font = { bold: true, color: { argb: 'FF1E293B' }, size: 10, name: 'Calibri' };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    totalRow.getCell(11).numFmt = '"R$"#,##0.00;("R$"#,##0.00);"-"';
    totalRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };

    autoWidth(sheet, [12, 18, 32, 26, 20, 16, 16, 16, 15, 18, 22, 35]);

    // ─── ABA 2: Histórico e Frequência por Ferramenta ─────────────────────────
    const sheet2 = wb.addWorksheet('📊 Histórico por Ferramenta');
    setupSheetView(sheet2);

    const headers2 = [
      'Nº',
      'TAG / Código',
      'Descrição da Ferramenta',
      'Qtd. Idas ao Conserto',
      'Nº das OSs',
      'Datas dos Envios / OSs',
      'Custo Acumulado (R$)'
    ];

    const header2Row = sheet2.addRow(headers2);
    styleHeader(header2Row);

    // Agrupar OSs por TAG (ou descrição caso sem TAG)
    const toolGroupMap = new Map();

    osList.forEach(os => {
      const tagClean = (os.tag && os.tag.trim()) ? os.tag.trim().toUpperCase() : null;
      const key = tagClean || (os.descricao || 'SEM TAG').trim().toUpperCase();

      if (!toolGroupMap.has(key)) {
        toolGroupMap.set(key, {
          tag: tagClean || '-',
          descricao: os.descricao || '-',
          osList: []
        });
      }
      toolGroupMap.get(key).osList.push(os);
    });

    // Ordenar grupos pela quantidade de idas ao conserto (decrescente)
    const sortedToolGroups = Array.from(toolGroupMap.values()).sort((a, b) => b.osList.length - a.osList.length);

    let totalGlobalIdas = 0;
    let totalGlobalCusto = 0;

    sortedToolGroups.forEach((group, i) => {
      const qteConsertos = group.osList.length;
      totalGlobalIdas += qteConsertos;

      // Ordenar OSs do grupo por data
      const sortedOsInGroup = [...group.osList].sort((a, b) => {
        const dA = a.dateEnvioObj || new Date(a.dataEnvio || 0);
        const dB = b.dateEnvioObj || new Date(b.dataEnvio || 0);
        return dA - dB;
      });

      const numerosOS = sortedOsInGroup.map(o => o.nOS || '-').join(', ');
      
      const datasStr = sortedOsInGroup.map(o => {
        const dt = parseDateValue(o.dateEnvioObj || o.dataEnvio);
        if (dt instanceof Date) {
          return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
        }
        return '-';
      }).join(', ');

      const custoGrupo = sortedOsInGroup.reduce((sum, o) => sum + (parseFloat(o.valorOrcamento) || 0), 0);
      totalGlobalCusto += custoGrupo;

      const row = sheet2.addRow([
        i + 1,
        group.tag,
        group.descricao,
        qteConsertos,
        numerosOS,
        datasStr,
        custoGrupo
      ]);

      styleDataRow(row, i);
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
      
      // Destaque se a ferramenta foi ao conserto 2 ou mais vezes
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(4).font = { bold: true, size: 10, name: 'Calibri', color: { argb: qteConsertos > 1 ? 'FFDC2626' : 'FF1E293B' } };
      
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
      
      row.getCell(7).numFmt = '"R$"#,##0.00;("R$"#,##0.00);"-"';
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
    });

    // Linha de Total na Aba 2
    const total2Row = sheet2.addRow([
      'TOTAL',
      '',
      `Total de ${sortedToolGroups.length} ferramenta(s) distinta(s)`,
      totalGlobalIdas,
      '',
      '',
      totalGlobalCusto
    ]);

    total2Row.font = { bold: true, color: { argb: 'FF1E293B' }, size: 10, name: 'Calibri' };
    total2Row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    total2Row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    total2Row.getCell(7).numFmt = '"R$"#,##0.00;("R$"#,##0.00);"-"';
    total2Row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };

    autoWidth(sheet2, [8, 18, 34, 22, 22, 38, 22]);

    // ─── GERAR E BAIXAR ARQUIVO EXCEL ──────────────────────────────────────────
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    const filename = `Relatorio_Detalhado_OS_${dateStr}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Erro ao exportar planilha detalhada de OS:', error);
    throw error;
  }
}
