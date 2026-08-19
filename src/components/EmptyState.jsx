import { Inbox, RotateCcw } from 'lucide-react';

const EmptyState = ({
  icon: Icon = Inbox,
  title = 'Nenhum registro encontrado',
  description = 'Não há dados correspondentes para exibir com os filtros atuais.',
  actionLabel = null,
  onAction = null,
  compact = false
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: compact ? '32px 16px' : '56px 24px',
      textAlign: 'center',
      width: '100%',
      color: 'var(--text-secondary)'
    }}>
      <div style={{
        width: compact ? '48px' : '64px',
        height: compact ? '48px' : '64px',
        borderRadius: '50%',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-primary-light)',
        marginBottom: '16px'
      }}>
        <Icon size={compact ? 24 : 32} />
      </div>

      <h4 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: compact ? '1rem' : '1.15rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: '6px'
      }}>
        {title}
      </h4>

      <p style={{
        fontSize: compact ? '0.8rem' : '0.88rem',
        color: 'var(--text-muted)',
        maxWidth: '380px',
        lineHeight: 1.5,
        marginBottom: actionLabel ? '16px' : '0'
      }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn btn-secondary"
          style={{
            fontSize: '0.85rem',
            padding: '8px 16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RotateCcw size={14} />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
