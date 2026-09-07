import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Trash2, 
  RefreshCw, 
  Minimize2, 
  Maximize2,
  Copy,
  Check,
  Zap
} from 'lucide-react';
import { sendChatMessageToGemini, getAlmoxarifadoContext } from '../services/aiService.js';
import { useToast } from './Toast';

const QUICK_PROMPTS = [
  { label: '📊 Resumo Geral', query: 'Faça um resumo executivo dos números atuais: termos ativos, saldo disponível e manutenções.' },
  { label: '⚠️ Retenções Antigas', query: 'Quais ferramentas estão emprestadas há mais tempo com colaboradores?' },
  { label: '👷 Quem tem mais ferramentas?', query: 'Quais colaboradores estão com o maior número de ferramentas sob responsabilidade?' },
  { label: '🛠️ Itens em Conserto (OS)', query: 'Quais equipamentos estão atualmente em manutenção ou com OS de conserto aberta?' },
  { label: '📦 O que está disponível?', query: 'Quais são os principais tipos de ferramentas com maior saldo disponível agora no estoque?' },
  { label: '📋 Relatório de Turno', query: 'Gere um resumo formatado para passagem de turno da ferramentaria da obra.' }
];

let messageCounter = 0;
const generateMessageId = () => {
  messageCounter += 1;
  return `msg_${messageCounter}_${Math.random().toString(36).substring(2, 9)}`;
};

const AiAssistantModal = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem('gel_ai_chat_history');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [
      {
        id: 'welcome',
        sender: 'ai',
        text: 'Olá! Sou o **GEL Assistente IA** da UHE Estrela ⚡\n\nAgora estou equipado com **Groq LPU (Ultra Rápido)** e conectado em tempo real aos termos, cautelas e catálogo de equipamentos do Firestore.\n\nVocê pode me perguntar sobre quem está com alguma ferramenta, saldos disponíveis, ferramentas em conserto ou estatísticas.\n\nComo posso te ajudar agora?',
        modelUsed: '⚡ Groq LPU',
        time: 'Agora'
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stockContext, setStockContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const refreshStockData = useCallback(async () => {
    setLoadingContext(true);
    try {
      const ctx = await getAlmoxarifadoContext();
      setStockContext(ctx);
    } catch (err) {
      console.error('Falha ao atualizar dados do estoque para IA:', err);
    } finally {
      setLoadingContext(false);
    }
  }, []);

  // Carregar contexto do estoque ao abrir o chat se ainda não carregado
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      inputRef.current?.focus();
      setLoadingContext(true);
      try {
        const ctx = await getAlmoxarifadoContext();
        if (isMounted) setStockContext(ctx);
      } catch (err) {
        console.error('Falha ao atualizar dados do estoque para IA:', err);
      } finally {
        if (isMounted) setLoadingContext(false);
      }
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Salvar histórico de chat na sessão e rolar para o fim
  useEffect(() => {
    sessionStorage.setItem('gel_ai_chat_history', JSON.stringify(messages));
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleCopyText = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Resposta copiada para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: generateMessageId(),
      sender: 'user',
      text: text,
      time: currentTime
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      // Coleta contexto inteligente baseado na pergunta do usuário
      const currentContext = await getAlmoxarifadoContext(text) || stockContext;

      const response = await sendChatMessageToGemini(text, messages, currentContext);

      const aiMsg = {
        id: generateMessageId(),
        sender: 'ai',
        text: response.text,
        modelUsed: response.modelUsed,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Erro ao consultar IA:', error);
      toast.error(`Erro na IA: ${error.message || 'Falha na comunicação'}`);
      
      const errorMsg = {
        id: generateMessageId(),
        sender: 'ai',
        isError: true,
        text: `⚠️ **Não foi possível responder no momento:** ${error.message || 'Verifique sua conexão.'}\n\nPor favor, tente novamente em instantes.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Deseja limpar o histórico desta conversa?')) {
      const initial = [
        {
          id: 'welcome-reset',
          sender: 'ai',
          text: 'Histórico reiniciado! Em que posso ajudar com a ferramentaria agora?',
          time: 'Agora'
        }
      ];
      setMessages(initial);
      sessionStorage.removeItem('gel_ai_chat_history');
      toast.info('Conversa reiniciada.');
    }
  };

  // Formatador simples para negrito, código e quebras de linha em Markdown
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;

    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
      const content = isBullet ? line.trim().substring(2) : line;

      const parts = content.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '4px 0', paddingLeft: '4px' }}>
            <span style={{ color: 'var(--color-primary-light)', fontSize: '0.9rem', lineHeight: 1.4 }}>•</span>
            <span style={{ flex: 1, lineHeight: 1.5 }}>{formattedParts}</span>
          </div>
        );
      }

      return (
        <p key={idx} style={{ margin: line === '' ? '8px 0' : '3px 0', minHeight: line === '' ? '6px' : 'auto', lineHeight: 1.5 }}>
          {formattedParts}
        </p>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="ai-chat-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        padding: isExpanded ? '0' : '20px',
        zIndex: 9999,
        transition: 'all 0.2s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="ai-chat-window"
        style={{
          width: isExpanded ? '100vw' : '480px',
          maxWidth: '100%',
          height: isExpanded ? '100vh' : '670px',
          maxHeight: isExpanded ? '100vh' : '90vh',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: isExpanded ? '0' : '16px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.9) 0%, rgba(15, 23, 42, 0.98) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.4)'
            }}>
              <Zap size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, letterSpacing: '0.3px' }}>
                  GEL Assistente IA
                </h3>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(249, 115, 22, 0.25)',
                  color: '#fb923c',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <Zap size={10} /> GROQ LPU
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                UHE Estrela • Resposta Ultra Rápida (~0.4s)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={refreshStockData}
              disabled={loadingContext}
              title="Sincronizar dados do almoxarifado"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '6px',
                cursor: loadingContext ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <RefreshCw size={16} className={loadingContext ? 'spin' : ''} />
            </button>

            <button
              onClick={handleClearHistory}
              title="Limpar conversa"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Trash2 size={16} />
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Restaurar tamanho' : 'Maximizar'}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              onClick={onClose}
              title="Fechar"
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: 'none',
                color: '#f87171',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Status Bar do Estoque */}
        {stockContext?.resumo && (
          <div style={{
            padding: '6px 14px',
            backgroundColor: 'rgba(249, 115, 22, 0.08)',
            borderBottom: '1px solid var(--border-card)',
            fontSize: '0.73rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            gap: '12px'
          }}>
            <span>📦 Saldo Disponível: <strong style={{ color: '#22c55e' }}>{stockContext.resumo.totalDisponiveis}</strong></span>
            <span>📋 Cautelas Ativas: <strong style={{ color: '#3b82f6' }}>{stockContext.resumo.totalTermosAtivos}</strong></span>
            <span>🛠️ Consertos (OS): <strong style={{ color: '#f59e0b' }}>{stockContext.resumo.totalEmManutencao}</strong></span>
          </div>
        )}

        {/* Messages Body */}
        <div style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          backgroundColor: 'var(--bg-app)'
        }}>
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';
            const isCopied = copiedId === msg.id;

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                  flexDirection: isAi ? 'row' : 'row-reverse'
                }}
              >
                {isAi && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                    boxShadow: '0 2px 6px rgba(249, 115, 22, 0.3)'
                  }}>
                    <Bot size={18} color="#ffffff" />
                  </div>
                )}

                <div style={{
                  maxWidth: '84%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isAi ? 'flex-start' : 'flex-end'
                }}>
                  <div style={{
                    position: 'relative',
                    padding: '12px 16px',
                    borderRadius: isAi ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                    backgroundColor: isAi ? 'var(--bg-card)' : 'var(--color-primary)',
                    color: isAi ? 'var(--text-primary)' : '#ffffff',
                    border: isAi ? '1px solid var(--border-card)' : 'none',
                    boxShadow: isAi ? '0 2px 8px rgba(0,0,0,0.08)' : '0 3px 10px rgba(59, 130, 246, 0.3)',
                    fontSize: '0.88rem',
                    wordBreak: 'break-word',
                    lineHeight: 1.5
                  }}>
                    {renderFormattedText(msg.text)}

                    {/* Botão de copiar resposta da IA */}
                    {isAi && msg.id !== 'welcome' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '6px' }}>
                        <button
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          title="Copiar resposta"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isCopied ? '#22c55e' : 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 4px',
                            borderRadius: '4px'
                          }}
                        >
                          {isCopied ? <Check size={13} /> : <Copy size={13} />}
                          <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '4px',
                    padding: '0 4px',
                    fontSize: '0.67rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <span>{msg.time}</span>
                    {msg.modelUsed && (
                      <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
                        {msg.modelUsed}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Bot size={18} color="#ffffff" />
              </div>
              <div style={{
                padding: '12px 18px',
                borderRadius: '4px 14px 14px 14px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div className="dot-flashing" />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={14} color="#f97316" /> Processando com Groq LPU...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Suggestions */}
        <div style={{
          padding: '8px 14px',
          backgroundColor: 'var(--bg-card)',
          borderTop: '1px solid var(--border-card)',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => handleSendMessage(qp.query)}
              style={{
                fontSize: '0.74rem',
                padding: '5px 10px',
                borderRadius: '16px',
                border: '1px solid var(--border-card)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--text-secondary)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.15)';
                  e.currentTarget.style.color = '#fb923c';
                  e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-card)';
              }}
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div style={{
          padding: '12px 14px',
          backgroundColor: 'var(--bg-card)',
          borderTop: '1px solid var(--border-card)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-app)',
            borderRadius: '12px',
            border: '1px solid var(--border-card)',
            padding: '4px 6px 4px 14px',
            transition: 'border-color 0.2s'
          }}>
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre ferramentas, cautelas, consertos..."
              disabled={loading}
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                color: 'var(--text-primary)',
                maxHeight: '80px',
                padding: '6px 0'
              }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || loading}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                background: !inputMessage.trim() || loading ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: !inputMessage.trim() || loading ? 'var(--text-secondary)' : '#ffffff',
                cursor: !inputMessage.trim() || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0,
                boxShadow: !inputMessage.trim() || loading ? 'none' : '0 2px 8px rgba(249, 115, 22, 0.4)'
              }}
              aria-label="Enviar mensagem"
            >
              <Send size={16} />
            </button>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '6px',
            padding: '0 4px',
            fontSize: '0.67rem',
            color: 'var(--text-secondary)'
          }}>
            <span>Pressione Enter para enviar</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Zap size={11} color="#f97316" /> Powered by Groq LPU
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantModal;
