import React, { useState } from 'react';
import { db, COLLECTIONS } from '../firebase/config';
import { 
  collection, 
  writeBatch, 
  doc, 
  Timestamp,
  addDoc,
  getDocs
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Upload, AlertCircle, CheckCircle, Database, HelpCircle } from 'lucide-react';

const classifyGroup = (desc) => {
  const d = String(desc || '').toLowerCase();
  if (d.includes('bateria') || d.includes('carregador')) return 'Bateria / Acessório';
  if (d.includes('pneumat') || d.includes('pneumá')) return 'Pneumática';
  if (d.includes('solde') || d.includes('solda') || d.includes('compressor') || d.includes('gerador') || d.includes('bomba')) return 'Máquina';
  if (d.includes('furadeira') || d.includes('lixadeira') || d.includes('esmerilhadeira') || d.includes('serra') || d.includes('martelete') || d.includes('soprador') || d.includes('parafusadeira') || d.includes('tupia') || d.includes('plaina') || d.includes('politriz') || d.includes('gsh') || d.includes('gsb')) return 'Elétrica';
  return 'Ferramenta Manual';
};

const Importador = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // Filtering states matching user request
  const [filterElectricAndTagOnly, setFilterElectricAndTagOnly] = useState(false);
  const [importType, setImportType] = useState('TERMOS'); // 'TERMOS' or 'CONSERTOS'

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus({ type: '', msg: '' });
    }
  };

  const processImport = async () => {
    if (!file) {
      alert('Selecione um arquivo Excel primeiro.');
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', msg: 'Lendo arquivo Excel...' });
    setProgress({ current: 0, total: 0 });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetNames = workbook.SheetNames;

          const termSheetName = sheetNames.find(s => s.toLowerCase().includes('termos'));
          const eqSheetName = sheetNames.find(s => s.toLowerCase().includes('rela') && s.toLowerCase().includes('equip'));

          const excelDateToJSForOS = (excelDate) => {
            if (!excelDate) return null;
            if (excelDate instanceof Date) return excelDate;
            if (!isNaN(excelDate)) {
              return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
            }
            const parsed = Date.parse(excelDate);
            if (!isNaN(parsed)) return new Date(parsed);
            return null;
          };

          if (importType === 'CONSERTOS') {
            const osSheetName = sheetNames.find(s => s.toLowerCase().includes('estrela'));
            if (!osSheetName) {
              throw new Error('A aba de OS "Estrela (E)" não foi encontrada no arquivo.');
            }

            setStatus({ type: 'info', msg: 'Analisando Ordens de Serviço (Consertos)...' });
            const osSheet = workbook.Sheets[osSheetName];
            const osRawData = XLSX.utils.sheet_to_json(osSheet, { header: 1 });

            let headerIdx = -1;
            for (let i = 0; i < osRawData.length; i++) {
              const row = osRawData[i];
              if (row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('nº os'))) {
                headerIdx = i;
                break;
              }
            }

            if (headerIdx === -1) {
              throw new Error('Linha de cabeçalho das Ordens de Serviço não encontrada.');
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

            rows.forEach(row => {
              const nOS = row[nOsCol];
              const desc = row[descCol];
              if (!nOS || !desc) return;

              const rawDataOs = row[dataOsCol];
              const rawDataEnvio = row[dataEnvioCol];
              const rawStatus = row[statusCol] || 'Enviado';
              const rawDataRetorno = row[dataRetornoCol];
              const rawDias = row[diasCol];
              const rawTag = row[tagCol] || '';

              const dateOs = excelDateToJSForOS(rawDataOs);
              const dateEnvio = excelDateToJSForOS(rawDataEnvio);
              const dateRetorno = excelDateToJSForOS(rawDataRetorno);

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

            const totalOps = osToImport.length;
            setProgress({ current: 0, total: totalOps });
            setStatus({ type: 'info', msg: `Gravando ${totalOps} Ordens de Serviço no Firestore...` });

            const osCollectionRef = collection(db, COLLECTIONS.OS_CONSERTO);
            const snapshot = await getDocs(osCollectionRef);
            if (!snapshot.empty) {
              const oldDocs = snapshot.docs;
              for (let i = 0; i < oldDocs.length; i += 300) {
                const batch = writeBatch(db);
                const chunk = oldDocs.slice(i, i + 300);
                chunk.forEach(d => batch.delete(d.ref));
                await batch.commit();
              }
            }

            let currentOpCount = 0;
            for (let i = 0; i < osToImport.length; i += 300) {
              const batch = writeBatch(db);
              const chunk = osToImport.slice(i, i + 300);
              chunk.forEach(osDoc => {
                const newRef = doc(collection(db, COLLECTIONS.OS_CONSERTO));
                batch.set(newRef, osDoc);
              });
              await batch.commit();
              currentOpCount += chunk.length;
              setProgress({ current: currentOpCount, total: totalOps });
            }

            setStatus({ 
              type: 'success', 
              msg: `Importação de Consertos realizada com sucesso! Foram cadastradas ${osToImport.length} Ordens de Serviço (OS).` 
            });
            setFile(null);
            return;
          }

          if (!termSheetName) {
            throw new Error('A aba "Termos_De_Responsabilidades" não foi encontrada no arquivo.');
          }

          // --- SECTION A: PARSE EQUIPAMENTOS ---
          const equipamentosToImport = [];
          
          if (eqSheetName) {
            setStatus({ type: 'info', msg: 'Analisando Catálogo de Equipamentos...' });
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

            if (eqHeaderIdx === -1) {
              throw new Error('Linha de cabeçalho do Catálogo de Equipamentos não encontrada.');
            }

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

              const isElectric = grupo.toLowerCase().includes('elétr') || grupo.toLowerCase().includes('eletri');
              const hasTag = grupo.toLowerCase().includes('máquin') || grupo.toLowerCase().includes('pneumát') || obs.toLowerCase().includes('tag') || isElectric;
              
              if (filterElectricAndTagOnly && !isElectric && !hasTag) {
                return;
              }

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
        }

          // --- SECTION B: PARSE TERMOS & COLABORADORES ---
          setStatus({ type: 'info', msg: 'Analisando Termos de Responsabilidade...' });
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
            throw new Error('Linha de cabeçalho dos Termos de Responsabilidade não encontrada.');
          }

          const termHeaders = termRawData[termHeaderIdx];
          const termRows = termRawData.slice(termHeaderIdx + 1);

          const termsToImport = [];
          const collaboratorsMap = new Map(); // Key: name, Value: { nome, funcao, ativosCount, devCount }

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

            // Apply filter based on user selection: TAG and Electrical Tools
            const materialStr = String(materialDesc).toLowerCase();
            const tagStr = String(tag).toLowerCase();
            const isElectricMaterial = 
              materialStr.includes('furadeira') || 
              materialStr.includes('lixadeira') || 
              materialStr.includes('martelete') || 
              materialStr.includes('esmerilhadeira') ||
              materialStr.includes('serra') ||
              materialStr.includes('alicate') || // can be tagged manually
              materialStr.includes('cabo') ||
              materialStr.includes('maquina');
            
            const hasTagLoan = tagStr.trim() !== '' && tagStr !== '-';

            if (filterElectricAndTagOnly && !isElectricMaterial && !hasTagLoan) {
              return; // Skip non-tagged/non-electric borrow records
            }

            // Convert Excel dates to JS dates
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

            // Aggregate Collaborator counts
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

            // Check if this loan has a registered TAG that is NOT in the equipments list.
            // If so, add it dynamically so it's registered as an equipment.
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
                  tag: cleanTag, // Keep casing
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

          // --- SECTION C: WRITE CHUNKS TO FIRESTORE ---
          const totalOps = equipamentosToImport.length + collaboratorsMap.size + termsToImport.length;
          setProgress({ current: 0, total: totalOps });
          setStatus({ type: 'info', msg: `Gravando dados no Firebase (Total de ${totalOps} registros)...` });

          let currentOpCount = 0;

          // 1. Upload Equipamentos
          for (let i = 0; i < equipamentosToImport.length; i += 300) {
            const batch = writeBatch(db);
            const chunk = equipamentosToImport.slice(i, i + 300);
            chunk.forEach(eq => {
              // Use TAG as document ID to avoid duplicates
              const docRef = doc(db, COLLECTIONS.EQUIPAMENTOS, eq.tag);
              batch.set(docRef, {
                ...eq,
                cod: eq.tag, // Set both for maximum compatibility!
                criadoEm: Timestamp.now(),
                atualizadoEm: Timestamp.now()
              });
            });
            await batch.commit();
            currentOpCount += chunk.length;
            setProgress(prev => ({ ...prev, current: currentOpCount }));
          }

          // 2. Upload Collaborators
          // Since we need their generated IDs for Terms reference, we can upload them first and keep track
          const collabsList = Array.from(collaboratorsMap.values());
          const collabIdMap = new Map(); // Name -> Generated ID

          for (let i = 0; i < collabsList.length; i += 300) {
            const batch = writeBatch(db);
            const chunk = collabsList.slice(i, i + 300);
            
            // To get IDs, we need to create references with auto-generated IDs manually in the batch
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
            currentOpCount += chunk.length;
            setProgress(prev => ({ ...prev, current: currentOpCount }));
          }

          // 3. Upload Terms
          for (let i = 0; i < termsToImport.length; i += 300) {
            const batch = writeBatch(db);
            const chunk = termsToImport.slice(i, i + 300);
            chunk.forEach(term => {
              const newRef = doc(collection(db, COLLECTIONS.TERMOS));
              const finalCollabId = collabIdMap.get(term.colaboradorNome) || '';
              
              // Find equipment ID in catalog if matching code
              let finalEqId = null;
              if (term.codEquipamento) {
                finalEqId = term.codEquipamento;
              } else {
                // Try matching description in equipmentsToImport
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
            currentOpCount += chunk.length;
            setProgress(prev => ({ ...prev, current: currentOpCount }));
          }

          setStatus({ 
            type: 'success', 
            msg: `Importação realizada com sucesso! Foram cadastrados ${equipamentosToImport.length} equipamentos, ${collaboratorsMap.size} colaboradores e ${termsToImport.length} empréstimos.` 
          });
          setFile(null);
        } catch (err) {
          console.error(err);
          setStatus({ type: 'error', msg: 'Erro ao processar as planilhas: ' + err.message });
        } finally {
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Falha ao ler arquivo: ' + err.message });
      setLoading(false);
    }
  };

  // Helper to convert Excel serial dates or strings into JS Date
  const excelDateToJS = (excelDate) => {
    if (!excelDate) return new Date();
    // Check if it's already a Date object
    if (excelDate instanceof Date) return excelDate;
    // Check if it's a number (Excel Serial Date)
    if (!isNaN(excelDate)) {
      return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    }
    // Try standard parsing
    const parsed = Date.parse(excelDate);
    if (!isNaN(parsed)) return new Date(parsed);
    
    return new Date();
  };

  return (
    <div style={{ padding: '40px 40px 40px 320px', minHeight: '100vh' }}>
      {/* Header */}
      <div>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-light)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Configurações Iniciais
        </span>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', marginTop: '4px', marginBottom: '30px' }}>Importador de Planilha</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        
        {/* Upload form */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Carga de Dados do Excel</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              {importType === 'TERMOS' ? (
                <>
                  Faça o upload do arquivo <code>TERMO_DE_RESPONSABILIDADE.xlsx</code> para carregar o histórico de termos de responsabilidade e o catálogo de equipamentos.
                </>
              ) : (
                <>
                  Faça o upload do arquivo de consertos <code>OS_Conserto_separado.xlsx</code> para carregar o histórico de Ordens de Serviço (OS).
                </>
              )}
            </p>
            
            <h4 style={{ fontSize: '0.95rem', color: 'var(--color-primary-light)', marginBottom: '10px', fontWeight: 700 }}>Tipo de Importação</h4>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                type="button"
                onClick={() => { setImportType('TERMOS'); setStatus({ type: '', msg: '' }); setFile(null); }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid ' + (importType === 'TERMOS' ? 'var(--color-primary)' : 'var(--border-card)'),
                  backgroundColor: importType === 'TERMOS' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: importType === 'TERMOS' ? 'var(--color-primary-light)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
              >
                Termos & Equipamentos
              </button>
              <button
                type="button"
                onClick={() => { setImportType('CONSERTOS'); setStatus({ type: '', msg: '' }); setFile(null); }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid ' + (importType === 'CONSERTOS' ? 'var(--color-primary)' : 'var(--border-card)'),
                  backgroundColor: importType === 'CONSERTOS' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: importType === 'CONSERTOS' ? 'var(--color-primary-light)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
              >
                Histórico de Consertos (OS)
              </button>
            </div>
          </div>

          {/* Filtering options based on user request */}
          {importType === 'TERMOS' && (
            <div style={{ padding: '16px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--color-primary-light)', marginBottom: '8px', fontWeight: 700 }}>Filtro de Carga Selecionada</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filterElectricAndTagOnly}
                  onChange={(e) => setFilterElectricAndTagOnly(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <strong>Importar apenas ferramentas elétricas ou com TAG (Foco do App)</strong>
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', paddingLeft: '26px' }}>
                Ao marcar essa opção, o sistema filtrará a planilha e importará apenas itens classificados como elétricos (ex: furadeiras, lixadeiras) ou que possuam códigos TAG de controle específico, limpando o banco de dados de itens manuais menores.
              </p>
            </div>
          )}

          {/* File selector input */}
          <div style={{
            border: '2px dashed var(--border-card)',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'var(--transition-all)',
            backgroundColor: file ? 'rgba(59, 130, 246, 0.02)' : 'transparent'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-light)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-card)'}
          >
            <input
              type="file"
              id="excel-file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="excel-file" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Upload size={40} style={{ color: 'var(--text-muted)' }} />
              <div>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {file ? file.name : 'Selecionar arquivo Excel'}
                </span>
                {!file && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Clique para navegar no seu computador</p>}
              </div>
            </label>
          </div>

          {file && (
            <button 
              onClick={processImport} 
              disabled={loading} 
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px' }}
            >
              <Database size={18} /> Iniciar Carga de Dados no Firestore
            </button>
          )}

          {/* Feedback alerts */}
          {status.msg && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: 
                status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
                status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 
                'rgba(59, 130, 246, 0.1)',
              color: 
                status.type === 'success' ? 'var(--color-success)' : 
                status.type === 'error' ? 'var(--color-danger)' : 
                'var(--color-primary-light)',
              border: `1px solid ${
                status.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 
                status.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 
                'rgba(59, 130, 246, 0.2)'
              }`
            }}>
              {status.type === 'success' ? <CheckCircle size={20} style={{ flexShrink: 0 }} /> : <AlertCircle size={20} style={{ flexShrink: 0 }} />}
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{status.msg}</span>
                {loading && progress.total > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${(progress.current / progress.total) * 100}%`, 
                        height: '100%', 
                        backgroundColor: 'var(--color-primary-light)',
                        transition: 'width 0.2s ease'
                      }}></div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                      Progresso: {progress.current} / {progress.total}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Requirements and Info sidebar */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={16} /> Regras de Carga
          </h4>
          
          {importType === 'TERMOS' ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p>
                O importador espera encontrar as seguintes colunas na aba de <strong>Termos</strong>:
              </p>
              <ul style={{ paddingLeft: '20px' }}>
                <li><code>NOME COLABORADOR</code></li>
                <li><code>FUNÇÃO</code> (ou similar)</li>
                <li><code>DESCRIÇÃO MATERIAL</code></li>
                <li><code>TAG</code> (para controle de TAG)</li>
                <li><code>QUANT.</code></li>
                <li><code>STATUS</code></li>
              </ul>
              <p>
                E as seguintes na aba de <strong>Equipamentos</strong>:
              </p>
              <ul style={{ paddingLeft: '20px' }}>
                <li><code>COD.</code> (ex: FER-001)</li>
                <li><code>GRUPO</code> (ex: Elétrica)</li>
                <li><code>DESCRIÇÃO</code></li>
                <li><code>QUANT.</code></li>
              </ul>
              <p>
                Os dados de <em>Resumo por Colaborador</em> serão calculados e estruturados automaticamente na nuvem a partir destas duas planilhas.
              </p>
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p>
                O importador de consertos espera encontrar a aba <strong>Estrela (E)</strong> no arquivo Excel.
              </p>
              <p>
                Ela deve conter a linha de cabeçalho com as seguintes colunas:
              </p>
              <ul style={{ paddingLeft: '20px' }}>
                <li><code>Nº OS</code> (ex: E01, OS-001)</li>
                <li><code>Data da OS</code></li>
                <li><code>Data de Envio</code></li>
                <li><code>Descrição do Material</code></li>
                <li><code>Status</code> (ex: Enviado, Retornado, Cancelado)</li>
                <li><code>Data de Retorno</code></li>
                <li><code>Dias</code> (Quantidade de dias em conserto)</li>
                <li><code>TAG</code> (Código único do ativo)</li>
              </ul>
              <p>
                O importador apagará os registros anteriores da coleção de consertos e fará uma nova carga limpa com todo o histórico fornecido.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Importador;
