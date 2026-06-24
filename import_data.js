import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
  apiKey: "AIzaSyBty7Tz3RQ8bScCw4oH2b_iqA6FPc6W0t8",
  authDomain: "controle-de-ferramentas-efde4.firebaseapp.com",
  projectId: "controle-de-ferramentas-efde4",
  storageBucket: "controle-de-ferramentas-efde4.firebasestorage.app",
  messagingSenderId: "313513963680",
  appId: "1:313513963680:web:52b4df54cfd88de51899c5",
  measurementId: "G-XNJHJN417B"
};

const COLLECTIONS = {
  EQUIPAMENTOS: 'ferramentas_equipamentos',
  COLABORADORES: 'ferramentas_colaboradores',
  TERMOS: 'ferramentas_termos'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const classifyGroup = (desc) => {
  const d = String(desc || '').toLowerCase();
  if (d.includes('bateria') || d.includes('carregador')) return 'Bateria / Acessório';
  if (d.includes('pneumat') || d.includes('pneumá')) return 'Pneumática';
  if (d.includes('solde') || d.includes('solda') || d.includes('compressor') || d.includes('gerador') || d.includes('bomba')) return 'Máquina';
  if (d.includes('furadeira') || d.includes('lixadeira') || d.includes('esmerilhadeira') || d.includes('serra') || d.includes('martelete') || d.includes('soprador') || d.includes('parafusadeira') || d.includes('tupia') || d.includes('plaina') || d.includes('politriz') || d.includes('gsh') || d.includes('gsb')) return 'Elétrica';
  return 'Ferramenta Manual';
};

const excelDateToJS = (excelDate) => {
  if (!excelDate) return new Date();
  if (excelDate instanceof Date) return excelDate;
  if (!isNaN(excelDate)) {
    return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  }
  const parsed = Date.parse(excelDate);
  if (!isNaN(parsed)) return new Date(parsed);
  return new Date();
};

async function deleteCollection(collectionPath) {
  const colRef = collection(db, collectionPath);
  const snapshot = await getDocs(colRef);
  console.log(`Deletando ${snapshot.size} documentos da coleção ${collectionPath}...`);
  if (snapshot.empty) return;

  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 500);
    chunk.forEach(d => {
      batch.delete(d.ref);
    });
    await batch.commit();
    console.log(`  Deletados ${i + chunk.length} de ${docs.length}`);
  }
}

async function run() {
  const excelFilePath = "c:\\Users\\eullon.silva\\OneDrive - GEL\\Área de Trabalho\\TERMO DE RESPONSABILIDADE APP\\TERMO_DE_RESPONSABILIDADE FF.xlsx";
  console.log(`Lendo arquivo Excel de: ${excelFilePath}...`);

  if (!fs.existsSync(excelFilePath)) {
    console.error(`Erro: Arquivo não encontrado no caminho ${excelFilePath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(excelFilePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  console.log("Abas encontradas na planilha:", sheetNames);

  const termSheetName = sheetNames.find(s => s.toLowerCase().includes('termos'));
  const eqSheetName = sheetNames.find(s => s.toLowerCase().includes('rela') && s.toLowerCase().includes('equip'));

  if (!termSheetName) {
    console.error('Erro: A aba de Termos_De_Responsabilidades não foi encontrada.');
    process.exit(1);
  }

  console.log(`Usando aba de Termos: "${termSheetName}"`);
  const equipamentosToImport = [];

  if (eqSheetName) {
    console.log(`Usando aba de Equipamentos: "${eqSheetName}"`);
    // --- PARSE EQUIPAMENTOS ---
    console.log("Analisando Catálogo de Equipamentos...");
    const eqSheet = workbook.Sheets[eqSheetName];
    const eqRawData = XLSX.utils.sheet_to_json(eqSheet, { header: 1 });

    let eqHeaderIdx = -1;
    for (let i = 0; i < eqRawData.length; i++) {
      const row = eqRawData[i];
      if (row.some(cell => typeof cell === 'string' && cell.includes('DESCRI'))) {
        eqHeaderIdx = i;
        break;
      }
    }

    if (eqHeaderIdx !== -1) {
      const eqHeaders = eqRawData[eqHeaderIdx];
      const eqRows = eqRawData.slice(eqHeaderIdx + 1);

      eqRows.forEach(row => {
        if (row.length === 0 || !row[eqHeaders.findIndex(h => typeof h === 'string' && h.includes('DESCRI'))]) return;

        const cod = row[eqHeaders.findIndex(h => typeof h === 'string' && h.includes('COD'))] || '';
        const grupo = row[eqHeaders.findIndex(h => typeof h === 'string' && h.includes('GRUPO'))] || '';
        const descricao = row[eqHeaders.findIndex(h => typeof h === 'string' && h.includes('DESCRI'))] || '';
        const marcaModelo = row[eqHeaders.findIndex(h => typeof h === 'string' && h.includes('MARCA'))] || '';
        const und = row[eqHeaders.findIndex(h => typeof h === 'string' && h.includes('UND'))] || 'Unidade';
        const quant = row[eqHeaders.findIndex(h => typeof h === 'string' && h.includes('QUANT'))] || 0;
        const status = row[eqHeaders.findIndex(h => typeof h === 'string' && h.includes('STATUS'))] || 'Disponível';
        const setor = row[eqHeaders.findIndex(h => typeof h === 'string' && h.includes('SETOR'))] || 'Almoxarifado';
        const obs = row[eqHeaders.findIndex(h => typeof h === 'string' && h.includes('OBSERVA'))] || '';

        if (!descricao) return;

        equipamentosToImport.push({
          tag: String(cod).trim(),
          grupo: String(grupo).trim(),
          descricao: String(descricao).trim(),
          marcaModelo: String(marcaModelo).trim(),
          und: String(und).trim(),
          quantidadeTotal: Number(quant) || 1,
          status: String(status).trim() || 'Disponível',
          setor: String(setor).trim(),
          observacao: String(obs).trim()
        });
      });
    } else {
      console.log('Linha de cabeçalho do Catálogo de Equipamentos não encontrada. Pulando parse do catálogo.');
    }
  } else {
    console.log("Aba de Equipamentos não encontrada. O inventário será preenchido dinamicamente com base nas tags dos Termos de Responsabilidade.");
  }

  console.log(`Encontrados ${equipamentosToImport.length} equipamentos inicializados para importar.`);

  // --- PARSE TERMOS & COLABORADORES ---
  console.log("Analisando Termos de Responsabilidade...");
  const termSheet = workbook.Sheets[termSheetName];
  const termRawData = XLSX.utils.sheet_to_json(termSheet, { header: 1 });

  let termHeaderIdx = -1;
  for (let i = 0; i < termRawData.length; i++) {
    const row = termRawData[i];
    if (row.some(cell => typeof cell === 'string' && cell.includes('COLABORADOR'))) {
      termHeaderIdx = i;
      break;
    }
  }

  if (termHeaderIdx === -1) {
    console.error('Erro: Linha de cabeçalho dos Termos de Responsabilidade não encontrada.');
    process.exit(1);
  }

  const termHeaders = termRawData[termHeaderIdx];
  const termRows = termRawData.slice(termHeaderIdx + 1);

  const termsToImport = [];
  const collaboratorsMap = new Map();

  termRows.forEach(row => {
    const collabName = row[termHeaders.findIndex(h => typeof h === 'string' && h.includes('COLABORADOR'))];
    const materialDesc = row[termHeaders.findIndex(h => typeof h === 'string' && h.includes('MATERIAL'))];

    if (!collabName || !materialDesc) return;

    const dataEntrExcel = row[termHeaders.findIndex(h => typeof h === 'string' && h.includes('DATA ENTR'))];
    const funcao = row[termHeaders.findIndex(h => typeof h === 'string' && h.includes('FUN'))] || 'OUTROS';
    const modelo = row[termHeaders.findIndex(h => typeof h === 'string' && h.includes('MODELO'))] || '';
    const marca = row[termHeaders.findIndex(h => typeof h === 'string' && h.includes('MARCA'))] || '';
    const tag = row[termHeaders.findIndex(h => typeof h === 'string' && h.includes('TAG'))] || '';
    const quant = row[termHeaders.findIndex(h => typeof h === 'string' && h.includes('QUANT'))] || 1;
    const dataDevolExcel = row[termHeaders.findIndex(h => typeof h === 'string' && h.includes('DEVOLU'))];
    const termStatus = row[termHeaders.findIndex(h => typeof h === 'string' && h.includes('STATUS'))] || 'ATIVO';
    const obs = row[termHeaders.findIndex(h => typeof h === 'string' && h.includes('OBSERVA'))] || '';

    let dateEntrada = new Date();
    if (dataEntrExcel) {
      dateEntrada = excelDateToJS(dataEntrExcel);
    }
    let dateDevolucao = null;
    if (dataDevolExcel && String(dataDevolExcel).trim() !== '') {
      dateDevolucao = excelDateToJS(dataDevolExcel);
    }

    const formattedStatus = String(termStatus).toUpperCase().trim();
    const formattedCollabName = String(collabName).toUpperCase().trim();
    const formattedFuncao = String(funcao).toUpperCase().trim();

    termsToImport.push({
      dataEntrada: Timestamp.fromDate(dateEntrada),
      dataDevolucao: dateDevolucao ? Timestamp.fromDate(dateDevolucao) : null,
      colaboradorNome: formattedCollabName,
      colaboradorFuncao: formattedFuncao,
      descricaoMaterial: String(materialDesc).trim(),
      modelo: String(modelo).trim(),
      marca: String(marca).trim(),
      tag: String(tag).trim(),
      quantidade: Number(quant) || 1,
      status: formattedStatus === 'ATIVO' || formattedStatus === 'DEVOLVIDO' || formattedStatus === 'EM CONCERTO' ? formattedStatus : 'ATIVO',
      observacao: String(obs).trim()
    });

    if (!collaboratorsMap.has(formattedCollabName)) {
      collaboratorsMap.set(formattedCollabName, {
        nome: formattedCollabName,
        funcao: formattedFuncao,
        ativosCount: 0,
        devolvidosCount: 0
      });
    }

    const cData = collaboratorsMap.get(formattedCollabName);
    const itemQtd = Number(quant) || 1;
    if (formattedStatus === 'ATIVO') {
      cData.ativosCount += itemQtd;
    } else {
      cData.devolvidosCount += itemQtd;
    }

    // Dynamic catalog insertion for loans with tags not present in Equipamentos sheet
    const cleanTag = String(tag).trim();
    if (cleanTag && cleanTag !== '-' && cleanTag !== '—') {
      const tagUpper = cleanTag.toUpperCase();
      const existsInCatalog = equipamentosToImport.some(e => e.tag.toUpperCase() === tagUpper);
      if (!existsInCatalog) {
        const detectedGroup = classifyGroup(materialDesc);
        const brandVal = String(marca || '').trim();
        const modelVal = String(modelo || '').trim();
        const brandModelStr = (brandVal && modelVal) ? `${brandVal} / ${modelVal}` : (brandVal || modelVal || '');

        equipamentosToImport.push({
          tag: cleanTag,
          grupo: detectedGroup,
          descricao: String(materialDesc).trim(),
          marcaModelo: brandModelStr,
          und: 'Unidade',
          quantidadeTotal: 1,
          status: 'Disponível',
          setor: 'Almoxarifado',
          observacao: 'Importado automaticamente dos Termos de Responsabilidade'
        });
      }
    }
  });

  console.log(`Encontrados ${termsToImport.length} termos de responsabilidade.`);
  console.log(`Encontrados ${collaboratorsMap.size} colaboradores.`);

  // --- FIRESTORE OPERATIONS ---
  console.log("\n>>> APAGANDO TODOS OS DADOS EXISTENTES DO FIRESTORE...");
  await deleteCollection(COLLECTIONS.TERMOS);
  await deleteCollection(COLLECTIONS.EQUIPAMENTOS);
  await deleteCollection(COLLECTIONS.COLABORADORES);
  console.log("Todos os dados antigos foram apagados com sucesso.\n");

  console.log(">>> SALVANDO NOVOS DADOS...");

  // 1. Upload Equipamentos
  console.log(`Salvando ${equipamentosToImport.length} Equipamentos...`);
  for (let i = 0; i < equipamentosToImport.length; i += 300) {
    const batch = writeBatch(db);
    const chunk = equipamentosToImport.slice(i, i + 300);
    chunk.forEach(eq => {
      const docRef = doc(db, COLLECTIONS.EQUIPAMENTOS, eq.tag);
      batch.set(docRef, {
        ...eq,
        cod: eq.tag,
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now()
      });
    });
    await batch.commit();
    console.log(`  Gravados ${i + chunk.length} de ${equipamentosToImport.length}`);
  }

  // 2. Upload Collaborators
  const collabsList = Array.from(collaboratorsMap.values());
  const collabIdMap = new Map();
  console.log(`Salvando ${collabsList.length} Colaboradores...`);
  for (let i = 0; i < collabsList.length; i += 300) {
    const batch = writeBatch(db);
    const chunk = collabsList.slice(i, i + 300);
    chunk.forEach(collab => {
      const newRef = doc(collection(db, COLLECTIONS.COLABORADORES));
      collabIdMap.set(collab.nome, newRef.id);
      batch.set(newRef, {
        nome: collab.nome,
        funcao: collab.funcao,
        totalItensAtivos: collab.ativosCount,
        totalItensDevolvidos: collab.devolvidosCount,
        atualizadoEm: Timestamp.now()
      });
    });
    await batch.commit();
    console.log(`  Gravados ${i + chunk.length} de ${collabsList.length}`);
  }

  // 3. Upload Terms
  console.log(`Salvando ${termsToImport.length} Termos de Responsabilidade...`);
  for (let i = 0; i < termsToImport.length; i += 300) {
    const batch = writeBatch(db);
    const chunk = termsToImport.slice(i, i + 300);
    chunk.forEach(term => {
      const newRef = doc(collection(db, COLLECTIONS.TERMOS));
      const finalCollabId = collabIdMap.get(term.colaboradorNome) || '';
      
      let finalEqId = null;
      if (term.tag) {
        finalEqId = term.tag;
      } else {
        const matchEq = equipamentosToImport.find(e => e.descricao.toLowerCase() === term.descricaoMaterial.toLowerCase());
        if (matchEq) finalEqId = matchEq.tag;
      }

      batch.set(newRef, {
        ...term,
        colaboradorId: finalCollabId,
        equipamentoId: finalEqId,
        criadoEm: Timestamp.now()
      });
    });
    await batch.commit();
    console.log(`  Gravados ${i + chunk.length} de ${termsToImport.length}`);
  }

  console.log("\n>>> IMPORTAÇÃO FINALIZADA COM SUCESSO! <<<");
  process.exit(0);
}

run().catch(err => {
  console.error("Erro durante o processamento:", err);
  process.exit(1);
});
