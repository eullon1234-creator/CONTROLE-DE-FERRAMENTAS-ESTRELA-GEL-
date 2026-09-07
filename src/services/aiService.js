import { db, COLLECTIONS } from '../firebase/config.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || (typeof localStorage !== 'undefined' ? localStorage.getItem('gel_groq_api_key') : '') || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (typeof localStorage !== 'undefined' ? localStorage.getItem('gel_gemini_api_key') : '') || '';

// Modelos Groq ordenados por inteligência e velocidade extrema (0.3s - 0.5s)
const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b'
];

// Modelos Gemini para fallback
const GEMINI_FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite-preview'
];

/**
 * Coleta os dados operacionais do Firestore com indexação inteligente
 */
export async function getAlmoxarifadoContext(userQuery = '') {
  try {
    const now = new Date();

    // 1. Termos Ativos
    const qTermos = query(collection(db, COLLECTIONS.TERMOS), where('status', '==', 'ATIVO'));
    const termosSnap = await getDocs(qTermos);
    
    const activeTerms = [];
    const collaboratorCounts = {};

    termosSnap.forEach(docSnap => {
      const data = docSnap.data();
      const dateEntrada = data.dataEntrada?.toDate ? data.dataEntrada.toDate() : (data.dataEntrada ? new Date(data.dataEntrada) : null);
      
      let daysOut = 0;
      if (dateEntrada) {
        daysOut = Math.floor((now - dateEntrada) / (1000 * 60 * 60 * 24));
      }

      const collab = (data.colaboradorNome || 'Não Identificado').trim();
      const qty = Number(data.quantidade) || 1;
      collaboratorCounts[collab] = (collaboratorCounts[collab] || 0) + qty;

      activeTerms.push({
        colaborador: collab,
        funcao: data.colaboradorFuncao || '-',
        ferramenta: data.descricaoMaterial || 'Item sem descrição',
        tag: data.tag || 'S/ TAG',
        quantidade: qty,
        diasComColaborador: daysOut,
        dataSaida: dateEntrada ? dateEntrada.toLocaleDateString('pt-BR') : 'Data não informada'
      });
    });

    // 2. Equipamentos
    const equipSnap = await getDocs(collection(db, COLLECTIONS.EQUIPAMENTOS));
    const equipamentos = [];
    let totalItensInventario = 0;
    let totalDisponiveis = 0;
    let totalEmprestados = 0;
    let totalEmManutencao = 0;

    equipSnap.forEach(docSnap => {
      const data = docSnap.data();
      const total = Number(data.quantidade) || 1;
      const disp = Number(data.saldoDisponivel ?? data.quantidade) || 0;
      const status = data.status || 'DISPONÍVEL';

      totalItensInventario += total;
      if (status === 'EM MANUTENÇÃO' || status === 'EM CONCERTO') {
        totalEmManutencao += total;
      } else {
        totalDisponiveis += disp;
        totalEmprestados += Math.max(0, total - disp);
      }

      equipamentos.push({
        tag: data.tag || '-',
        descricao: data.descricao || data.nome || 'Sem descrição',
        grupo: data.grupo || 'Geral',
        quantidadeTotal: total,
        saldoDisponivel: disp,
        status: status
      });
    });

    // 3. OS de Conserto Pendentes
    const osPendentes = [];
    try {
      const osSnap = await getDocs(collection(db, COLLECTIONS.OS_CONSERTO));
      osSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.status !== 'FINALIZADO' && data.status !== 'CONCLUÍDO') {
          osPendentes.push({
            numeroOS: data.numeroOS || docSnap.id.slice(0, 6),
            ferramenta: data.equipamentoNome || data.descricao || 'Equipamento',
            tag: data.tag || '-',
            problema: data.defeito || data.motivo || 'Manutenção',
            local: data.localManutencao || data.oficina || 'Oficina Interna',
            dataEnvio: data.dataEnvio?.toDate ? data.dataEnvio.toDate().toLocaleDateString('pt-BR') : '-'
          });
        }
      });
    } catch {
      // ignore
    }

    // Filtragem inteligente baseada na pergunta do usuário (se fornecida)
    let filteredTerms = activeTerms;
    let filteredEquip = equipamentos;

    if (userQuery && userQuery.length > 2) {
      const words = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      const matchedTerms = activeTerms.filter(t => 
        words.some(w => 
          t.colaborador.toLowerCase().includes(w) || 
          t.ferramenta.toLowerCase().includes(w) || 
          t.tag.toLowerCase().includes(w)
        )
      );

      const matchedEquip = equipamentos.filter(e => 
        words.some(w => 
          e.descricao.toLowerCase().includes(w) || 
          e.tag.toLowerCase().includes(w) || 
          e.grupo.toLowerCase().includes(w)
        )
      );

      // Se encontrou termos correspondentes, prioriza eles no início
      if (matchedTerms.length > 0) {
        filteredTerms = [...matchedTerms, ...activeTerms.filter(t => !matchedTerms.includes(t))];
      }
      if (matchedEquip.length > 0) {
        filteredEquip = [...matchedEquip, ...equipamentos.filter(e => !matchedEquip.includes(e))];
      }
    }

    return {
      resumo: {
        totalTermosAtivos: activeTerms.length,
        totalEquipamentosCadastrados: equipamentos.length,
        totalItensFisicos: totalItensInventario,
        totalDisponiveis: totalDisponiveis,
        totalEmprestados: totalEmprestados,
        totalEmManutencao: totalEmManutencao,
        totalOSPendentes: osPendentes.length
      },
      termosAtivos: filteredTerms.slice(0, 100),
      colaboradoresRanking: Object.entries(collaboratorCounts)
        .map(([nome, total]) => ({ nome, totalFerramentas: total }))
        .sort((a, b) => b.totalFerramentas - a.totalFerramentas),
      equipamentos: filteredEquip.slice(0, 150),
      osPendentes: osPendentes
    };
  } catch (error) {
    console.error('Erro ao coletar dados do estoque:', error);
    return null;
  }
}

/**
 * Cria o prompt de sistema especializado com dados do estoque
 */
function buildSystemPrompt(stockContext) {
  let prompt = `Você é o "GEL Assistente IA", o assistente inteligente oficial do Almoxarifado e Ferramentaria da GEL Engenharia na obra UHE Estrela.
Seu trabalho é ajudar os almoxarifes, encarregados e gestores com respostas rápidas, precisas e objetivas.

DIRETRIZES DE RESPOSTA:
1. Responda em Português do Brasil com tom profissional, ágil e técnico.
2. Formate as respostas com elegância: use tópicos com marcadores, destaques em **negrito** e pequenas tabelas se houver muitos dados.
3. SEMPRE use os dados fornecidos abaixo no contexto para responder. Não invente nomes de ferramentas nem nomes de colaboradores.
4. Se perguntarem quem está com alguma ferramenta, informe o nome do colaborador, a TAG da ferramenta, a quantidade e há quantos dias está com ele.
5. Se uma ferramenta estiver disponível no estoque, informe o saldo disponível para empréstimo.
6. Ao final da resposta, se relevante, adicione uma dica curta prática para o almoxarife.`;

  if (stockContext) {
    prompt += `\n\n=== DADOS ATUALIZADOS EM TEMPO REAL (FIRESTORE) ===
RESUMO GERAL:
• Termos de cautela ativos: ${stockContext.resumo.totalTermosAtivos}
• Total de tipos de ferramentas: ${stockContext.resumo.totalEquipamentosCadastrados}
• Saldo disponível para empréstimo: ${stockContext.resumo.totalDisponiveis}
• Ferramentas em uso no canteiro: ${stockContext.resumo.totalEmprestados}
• Ferramentas em conserto / manutenção: ${stockContext.resumo.totalEmManutencao}
• Ordens de Serviço (OS) abertas: ${stockContext.resumo.totalOSPendentes}

TOP COLABORADORES COM MAIS FERRAMENTAS:
${JSON.stringify(stockContext.colaboradoresRanking.slice(0, 12), null, 2)}

CAUTELAS / TERMOS ATIVOS:
${JSON.stringify(stockContext.termosAtivos.slice(0, 80), null, 2)}

ORDENS DE SERVIÇO EM CONSERTO:
${JSON.stringify(stockContext.osPendentes, null, 2)}

CATÁLOGO DE EQUIPAMENTOS (SALDO E STATUS):
${JSON.stringify(stockContext.equipamentos.slice(0, 100), null, 2)}
=====================================================`;
  }

  return prompt;
}

/**
 * Envia mensagem para a API Groq (super veloz com LPU)
 */
async function callGroqAPI(userMessage, chatHistory, systemPrompt) {
  if (!GROQ_API_KEY) throw new Error('Chave da API Groq não informada.');

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Adicionar histórico recente
  const recent = chatHistory.slice(-6);
  for (const m of recent) {
    messages.push({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    });
  }

  // Mensagem do usuário
  messages.push({ role: 'user', content: userMessage });

  let lastError = null;

  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 1200
        }),
        signal: AbortSignal.timeout(8000)
      });

      const data = await response.json();

      if (response.ok && data.choices && data.choices[0]?.message?.content) {
        return {
          text: data.choices[0].message.content.trim(),
          modelUsed: `⚡ Groq (${model.split('/').pop()})`,
          provider: 'groq'
        };
      }

      const errMsg = data.error?.message || `HTTP ${response.status}`;
      console.warn(`Groq ${model} falhou:`, errMsg);
      lastError = new Error(errMsg);
    } catch (err) {
      console.warn(`Erro na Groq ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Todos os modelos Groq falharam.');
}

/**
 * Fallback para a API Gemini caso a Groq falhe
 */
async function callGeminiFallback(userMessage, chatHistory, systemPrompt) {
  if (!GEMINI_API_KEY) throw new Error('Chave da API Gemini não configurada.');

  const contents = [
    { role: 'user', parts: [{ text: `[INSTRUÇÕES]\n${systemPrompt}` }] },
    { role: 'model', parts: [{ text: 'Entendido perfeitamente! Estou pronto para auxiliar com os dados da ferramentaria da GEL.' }] }
  ];

  const recent = chatHistory.slice(-6);
  for (const m of recent) {
    contents.push({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  for (const model of GEMINI_FALLBACK_MODELS) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 1200 }
        }),
        signal: AbortSignal.timeout(10000)
      });

      const data = await response.json();
      if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return {
          text: data.candidates[0].content.parts[0].text,
          modelUsed: `Google Gemini (${model})`,
          provider: 'gemini'
        };
      }
    } catch (err) {
      console.warn(`Gemini fallback ${model} erro:`, err.message);
    }
  }

  throw new Error('Falha nos provedores de IA (Groq e Gemini).');
}

/**
 * Função principal consumida pela interface do chat
 */
export async function sendChatMessageToGemini(userMessage, chatHistory = [], stockContext = null) {
  const systemPrompt = buildSystemPrompt(stockContext);

  // 1. Tenta prioritariamente a Groq (resposta instantânea em ~300-500ms)
  try {
    return await callGroqAPI(userMessage, chatHistory, systemPrompt);
  } catch (groqError) {
    console.warn('Falha na Groq, acionando fallback para Google Gemini...', groqError);
    // 2. Fallback automático para o Gemini
    return await callGeminiFallback(userMessage, chatHistory, systemPrompt);
  }
}
