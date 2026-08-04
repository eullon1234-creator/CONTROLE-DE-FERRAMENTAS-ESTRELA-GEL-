import { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Check, PenTool, CheckCircle, RotateCcw } from 'lucide-react';

/**
 * SignaturePad — Componente de Assinatura Digital
 *
 * PROBLEMAS CORRIGIDOS nesta versão:
 * 1. ctx.strokeStyle com 'var(--css-variable)' NÃO funciona no canvas HTML.
 *    O canvas não resolve variáveis CSS, então a cor ficava como 'black' no
 *    modo escuro mas TRANSPARENTE/inválida no modo claro, tornando a assinatura
 *    invisível. Agora usamos cores fixas (hex) baseadas no tema do documento.
 *
 * 2. O DPI scaling (canvas.width = rect.width * 2; ctx.scale(2,2)) criava um
 *    desenho com coordenadas incorretas: o traço aparecia no dobro do lugar
 *    esperado. Agora a conversão de coordenadas usa corretamente a proporção
 *    entre o tamanho CSS do canvas e seu tamanho real em pixels.
 *
 * 3. O contexto perdia sua configuração (strokeStyle, lineWidth, etc.) após
 *    redimensionamento pois o ctx não era salvo nem recriado corretamente.
 *    Agora o contexto é reconfigurado a cada operação de escrita.
 */
const SignaturePad = ({ onSave, onClear }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPreview, setSavedPreview] = useState(null);

  // Detecta o tema atual olhando o atributo data-theme no <html>
  const getTheme = () =>
    document.documentElement.getAttribute('data-theme') || 'light';

  // Retorna a cor correta para a caneta com base no tema
  const getStrokeColor = () => (getTheme() === 'dark' ? '#f1f5f9' : '#0f172a');

  // Configura o canvas com a resolução correta para telas de alta densidade (Retina/HiDPI)
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return; // canvas ainda não está visível

    // dpr = Device Pixel Ratio. Em telas Retina é 2, em normais é 1.
    const dpr = window.devicePixelRatio || 1;

    // Define o tamanho REAL em pixels do buffer do canvas (multiplicado pelo dpr)
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    // O tamanho CSS continua o mesmo (não mexemos em canvas.style)
    const ctx = canvas.getContext('2d');

    // Escala o contexto para que 1 unidade lógica = 1 pixel CSS (sem distorção)
    ctx.scale(dpr, dpr);

    // Configurações do traço
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getStrokeColor();
    ctx.lineWidth = 2.5;
    ctx.imageSmoothingEnabled = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Pequeno delay para garantir que o DOM já renderizou o canvas
    const timer = setTimeout(() => {
      setupCanvas();
    }, 50);

    const handleResize = () => {
      // Ao redimensionar, o canvas é reiniciado (perdemos o conteúdo desenhado)
      // Resetamos também o estado para refletir isso
      setupCanvas();
      setHasSigned(false);
      setIsSaved(false);
      setSavedPreview(null);
      if (onClear) onClear();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [setupCanvas, onClear]);

  /**
   * Converte coordenadas do evento (mouse ou touch) para coordenadas
   * LÓGICAS do canvas (espaço CSS), levando em conta o scroll e o offset do elemento.
   */
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext('2d');

    // Reaplica a cor (pode ter mudado de tema, ou pode ter sido recriado)
    ctx.strokeStyle = getStrokeColor();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x, y);

    setIsDrawing(true);
    setIsSaved(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext('2d');

    ctx.lineTo(x, y);
    ctx.stroke();

    if (!hasSigned) setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    // Limpa toda a área do canvas no espaço de pixel real
    ctx.clearRect(0, 0, rect.width * dpr, rect.height * dpr);

    setHasSigned(false);
    setIsSaved(false);
    setSavedPreview(null);
    if (onClear) onClear();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSigned) return;

    const dataURL = canvas.toDataURL('image/png');
    setSavedPreview(dataURL);
    setIsSaved(true);
    onSave(dataURL);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>

      {/* Cabeçalho do painel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PenTool size={16} style={{ color: 'var(--color-primary-light)' }} />
          <span className="form-label" style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>
            Assinatura Digital do Colaborador
          </span>
        </div>
        {isSaved && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--color-success)',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '20px',
            padding: '2px 10px'
          }}>
            <CheckCircle size={12} /> Assinatura Salva
          </span>
        )}
      </div>

      {/* Instrução */}
      <p style={{
        margin: 0,
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
        backgroundColor: 'rgba(59, 130, 246, 0.06)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        borderRadius: '6px',
        padding: '8px 12px',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start'
      }}>
        <span style={{ fontSize: '1rem' }}>✍️</span>
        <span>
          Desenhe a assinatura do colaborador na área abaixo usando o <strong>mouse</strong> (clique e arraste) ou o <strong>dedo</strong> em tela touch. Após assinar, clique em <strong>"Confirmar Assinatura"</strong> para salvar.
        </span>
      </p>

      {/* Área de desenho */}
      <div
        style={{
          position: 'relative',
          border: isSaved
            ? '2px solid rgba(16, 185, 129, 0.5)'
            : isDrawing
            ? '2px solid var(--color-primary-light)'
            : '2px dashed var(--border-card)',
          borderRadius: '10px',
          overflow: 'hidden',
          backgroundColor: getTheme() === 'dark'
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(255,255,255,0.85)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: isDrawing
            ? '0 0 0 3px rgba(59, 130, 246, 0.12)'
            : isSaved
            ? '0 0 0 3px rgba(16, 185, 129, 0.1)'
            : 'none',
          touchAction: 'none', // Impede scroll ao desenhar no mobile
          userSelect: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            display: 'block',
            width: '100%',
            height: '160px',
            cursor: isDrawing ? 'crosshair' : 'pointer',
          }}
        />

        {/* Placeholder quando ainda não assinou */}
        {!hasSigned && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            pointerEvents: 'none',
          }}>
            <PenTool
              size={28}
              style={{ color: 'var(--text-muted)', opacity: 0.4 }}
            />
            <span style={{
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              opacity: 0.7,
              textAlign: 'center',
              padding: '0 20px'
            }}>
              Clique aqui e assine com o mouse ou toque na tela
            </span>
          </div>
        )}

        {/* Linha de assinatura (decorativa) */}
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '12%',
          right: '12%',
          borderBottom: '1px solid rgba(100, 116, 139, 0.3)',
          pointerEvents: 'none'
        }} />
        <span style={{
          position: 'absolute',
          bottom: '10px',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          opacity: 0.5,
          pointerEvents: 'none',
          fontStyle: 'italic'
        }}>
          Assinatura do Responsável
        </span>
      </div>

      {/* Botões de ação */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {hasSigned && !isSaved
            ? '⚠️ Assinatura desenhada — confirme para salvar'
            : isSaved
            ? '✅ Assinatura confirmada e salva com sucesso'
            : 'Área de assinatura em branco'}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={clearCanvas}
            className="btn btn-secondary"
            title="Apagar a assinatura e recomeçar"
            style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '7px'
            }}
          >
            <RotateCcw size={13} /> Limpar
          </button>

          <button
            type="button"
            onClick={saveSignature}
            disabled={!hasSigned}
            className="btn"
            title={!hasSigned ? 'Desenhe a assinatura antes de confirmar' : 'Salvar assinatura'}
            style={{
              padding: '8px 18px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '7px',
              border: 'none',
              cursor: hasSigned ? 'pointer' : 'not-allowed',
              fontWeight: 700,
              backgroundColor: isSaved
                ? 'rgba(16, 185, 129, 0.15)'
                : hasSigned
                ? '#059669'
                : 'rgba(100, 116, 139, 0.2)',
              color: isSaved
                ? 'var(--color-success)'
                : hasSigned
                ? '#ffffff'
                : 'var(--text-muted)',
              border: isSaved ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {isSaved ? (
              <><CheckCircle size={13} /> Confirmada!</>
            ) : (
              <><Check size={13} /> Confirmar Assinatura</>
            )}
          </button>
        </div>
      </div>

      {/* Preview da assinatura salva */}
      {isSaved && savedPreview && (
        <div style={{
          marginTop: '4px',
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            overflow: 'hidden',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            backgroundColor: 'white',
            flexShrink: 0
          }}>
            <img
              src={savedPreview}
              alt="Preview da assinatura"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-success)', marginBottom: '2px' }}>
              ✅ Assinatura capturada com sucesso
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              A assinatura será gravada junto ao termo de responsabilidade. Para refazer, clique em <strong>Limpar</strong>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
