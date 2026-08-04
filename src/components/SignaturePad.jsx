import { useRef, useState, useEffect } from 'react';
import { Eraser, Check } from 'lucide-react';

const SignaturePad = ({ onSave, onClear }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas resolution for crisp lines
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'var(--text-primary)';
    ctx.lineWidth = 2.5;

    const handleResize = () => {
      if (!canvas) return;
      const currentRect = canvas.getBoundingClientRect();

      // Create a temporary canvas to save current drawing
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(canvas, 0, 0);

      // Resize the main canvas to match the new container width/height
      canvas.width = currentRect.width * 2;
      canvas.height = currentRect.height * 2;

      // Re-setup scale and context styles
      const newCtx = canvas.getContext('2d');
      newCtx.scale(2, 2);
      newCtx.lineCap = 'round';
      newCtx.lineJoin = 'round';
      newCtx.strokeStyle = 'var(--text-primary)';
      newCtx.lineWidth = 2.5;

      // Draw the temporary canvas content back, scaling it to the new size
      newCtx.drawImage(
        tempCanvas,
        0, 0, tempCanvas.width, tempCanvas.height,
        0, 0, currentRect.width, currentRect.height
      );
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Support touch and mouse
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    if (onClear) onClear();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSigned) return;
    
    // Get base64 string
    const dataURL = canvas.toDataURL('image/png');
    onSave(dataURL);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%'
    }}>
      <span className="form-label">Assinatura Digital do Colaborador</span>
      
      <div style={{
        position: 'relative',
        border: '2px dashed var(--border-card)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.03)',
        touchAction: 'none' // Prevent scrolling while drawing on mobile
      }}>
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
            height: '150px',
            cursor: 'crosshair'
          }}
        />
        {!hasSigned && (
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            pointerEvents: 'none',
            fontStyle: 'italic'
          }}>
            Assine com o mouse ou tela touch
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={clearCanvas}
          className="btn btn-secondary"
          style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Eraser size={14} /> Limpar
        </button>
        <button
          type="button"
          onClick={saveSignature}
          disabled={!hasSigned}
          className="btn btn-primary"
          style={{ 
            padding: '8px 16px', 
            fontSize: '0.8rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            backgroundColor: hasSigned ? 'var(--color-success)' : 'var(--text-muted)',
            backgroundImage: 'none'
          }}
        >
          <Check size={14} /> Confirmar Assinatura
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
