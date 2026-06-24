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
  OS_CONSERTO: 'ferramentas_os_conserto'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const excelDateToJS = (excelDate) => {
  if (!excelDate) return null;
  if (excelDate instanceof Date) return excelDate;
  if (!isNaN(excelDate)) {
    return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  }
  const parsed = Date.parse(excelDate);
  if (!isNaN(parsed)) return new Date(parsed);
  return null;
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
  const excelFilePath = "c:\\Users\\eullon.silva\\OneDrive - GEL\\Área de Trabalho\\TERMO DE RESPONSABILIDADE APP\\OS_Conserto_separado.xlsx";
  console.log(`Lendo arquivo Excel de OS de conserto de: ${excelFilePath}...`);

  if (!fs.existsSync(excelFilePath)) {
    console.error(`Erro: Arquivo não encontrado no caminho ${excelFilePath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(excelFilePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;

  const osSheetName = sheetNames.find(s => s.toLowerCase().includes('estrela'));
  if (!osSheetName) {
    console.error('Erro: A aba de OS "Estrela (E)" não foi encontrada.');
    process.exit(1);
  }

  console.log(`Usando aba de OS: "${osSheetName}"`);
  const osSheet = workbook.Sheets[osSheetName];
  const osRawData = XLSX.utils.sheet_to_json(osSheet, { header: 1 });

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < osRawData.length; i++) {
    const row = osRawData[i];
    if (row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('nº os'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    console.error('Erro: Linha de cabeçalho das OS não encontrada.');
    process.exit(1);
  }

  const headers = osRawData[headerIdx].map(h => String(h || '').trim());
  const rows = osRawData.slice(headerIdx + 1);

  const nOsCol = headers.findIndex(h => h.toLowerCase().includes('nº os'));
  const dataOsCol = headers.findIndex(h => h.toLowerCase().includes('data da os'));
  const dataEnvioCol = headers.findIndex(h => h.toLowerCase().includes('data de envio'));
  const descCol = headers.findIndex(h => h.toLowerCase().includes('descri'));
  const statusCol = headers.findIndex(h => h.toLowerCase().includes('status'));
  const dataRetornoCol = headers.findIndex(h => h.toLowerCase().includes('data de retorno'));
  const diasCol = headers.findIndex(h => h.toLowerCase().includes('dias'));
  const tagCol = headers.findIndex(h => h.toLowerCase().includes('tag'));

  const osToImport = [];

  rows.forEach((row, idx) => {
    const nOS = row[nOsCol];
    const desc = row[descCol];

    if (!nOS || !desc) return; // skip empty rows

    const rawDataOs = row[dataOsCol];
    const rawDataEnvio = row[dataEnvioCol];
    const rawStatus = row[statusCol] || 'Enviado';
    const rawDataRetorno = row[dataRetornoCol];
    const rawDias = row[diasCol];
    const rawTag = row[tagCol] || '';

    const dateOs = excelDateToJS(rawDataOs);
    const dateEnvio = excelDateToJS(rawDataEnvio);
    const dateRetorno = excelDateToJS(rawDataRetorno);

    osToImport.push({
      nOS: String(nOS).trim(),
      dataOS: dateOs ? Timestamp.fromDate(dateOs) : null,
      dataEnvio: dateEnvio ? Timestamp.fromDate(dateEnvio) : null,
      descricao: String(desc).trim(),
      status: String(rawStatus).trim(),
      dataRetorno: dateRetorno ? Timestamp.fromDate(dateRetorno) : null,
      diasEmConserto: Number(rawDias) || 0,
      tag: String(rawTag).trim() === '.' ? '' : String(rawTag).trim(),
      criadoEm: Timestamp.now()
    });
  });

  console.log(`Encontradas ${osToImport.length} Ordens de Serviço para importar.`);

  // Clear existing database
  console.log("\n>>> APAGANDO OS CONSERTOS EXISTENTES NO FIRESTORE...");
  await deleteCollection(COLLECTIONS.OS_CONSERTO);

  // Write new data
  console.log(">>> SALVANDO NOVAS ORDENS DE SERVIÇO...");
  for (let i = 0; i < osToImport.length; i += 300) {
    const batch = writeBatch(db);
    const chunk = osToImport.slice(i, i + 300);
    chunk.forEach(osDoc => {
      const newRef = doc(collection(db, COLLECTIONS.OS_CONSERTO));
      batch.set(newRef, osDoc);
    });
    await batch.commit();
    console.log(`  Gravados ${i + chunk.length} de ${osToImport.length}`);
  }

  console.log("\n>>> IMPORTAÇÃO DE OS CONCLUÍDA COM SUCESSO! <<<");
  process.exit(0);
}

run().catch(err => {
  console.error("Erro na importação das OS:", err);
  process.exit(1);
});
