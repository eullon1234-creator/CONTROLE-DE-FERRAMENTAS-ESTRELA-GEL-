import { db, auth, COLLECTIONS } from '../firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

/**
 * Registra uma ação de auditoria no Firestore.
 * @param {Object} params
 * @param {string} params.action - Ação realizada (ex: 'CRIAR_TERMO', 'DEVOLVER_ITEM', 'NOVA_OS')
 * @param {string} params.entityType - Tipo de entidade ('TERMO', 'EQUIPAMENTO', 'COLABORADOR', 'OS')
 * @param {string} [params.entityId] - Identificador do documento ou item
 * @param {string|Object} [params.details] - Detalhes adicionais da ação
 * @param {Object} [params.user] - Usuário que executou (opcional, fallback para auth.currentUser)
 */
export const logAuditAction = async ({
  action,
  entityType,
  entityId = '',
  details = '',
  user = null
}) => {
  try {
    const currentUser = user || auth.currentUser;
    const userEmail = currentUser?.email || 'operador_anonimo';
    const userId = currentUser?.uid || 'sistema';

    const logEntry = {
      action,
      entityType,
      entityId: String(entityId || ''),
      details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      userId,
      userEmail,
      timestamp: Timestamp.now()
    };

    await addDoc(collection(db, COLLECTIONS.AUDIT_LOG), logEntry);
  } catch (err) {
    // Não bloqueia a operação do usuário caso o log falhe
    console.warn('[AuditLog] Erro ao gravar log de auditoria:', err.message);
  }
};
