import React, { useState } from 'react';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { KeyRound, Mail, AlertCircle, UserPlus, LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (isRegistering) {
        // Create user in Firebase Auth
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccess('Conta criada e autenticada com sucesso!');
      } else {
        // Sign in user
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Usuário ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro de autenticação: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo auto-fill option for initial launch
  const handleQuickFill = () => {
    setEmail('almoxarifado@gel.com.br');
    setPassword('gel123456');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: 'var(--bg-app)',
      background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent), radial-gradient(circle at bottom left, rgba(234, 179, 8, 0.03), transparent)'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Brand logo header */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '2.5rem',
            fontWeight: 800,
            color: 'var(--color-primary)',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            GEL <span style={{ color: 'var(--color-accent)', fontWeight: 400 }}>Engenharia</span>
          </h1>
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: '4px'
          }}>
            {isRegistering ? 'Cadastro de Operador' : 'Ferramentaria & Termos'}
          </p>
        </div>

        {/* Info Box about setup */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: 'rgba(234, 179, 8, 0.08)',
          border: '1px solid rgba(234, 179, 8, 0.15)',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0, color: 'var(--color-warning)' }} />
          <div>
            {isRegistering ? (
              <><strong>Nova Conta:</strong> Digite seu e-mail corporativo e crie uma senha segura de acesso (mínimo de 6 caracteres).</>
            ) : (
              <><strong>Acesso ao Sistema:</strong> Crie a conta do Almoxarifado no botão "Criar Nova Conta" abaixo ou use a de demonstração.</>
            )}
          </div>
        </div>

        {/* Login/Register Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label className="form-label">E-mail de Acesso</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-input"
                placeholder="nome@gel.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{isRegistering ? 'Criar Senha de Acesso' : 'Senha Administrativa'}</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-input"
                placeholder={isRegistering ? 'Mínimo de 6 caracteres' : 'Sua senha'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', gap: '6px', alignItems: 'center' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          {success && (
            <div style={{ color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', gap: '6px', alignItems: 'center' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} /> {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
          >
            {loading ? (
              'Carregando...'
            ) : isRegistering ? (
              <>
                <UserPlus size={16} /> Cadastrar Nova Conta
              </>
            ) : (
              <>
                <LogIn size={16} /> Entrar no Sistema
              </>
            )}
          </button>
        </form>

        {/* Action Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
          
          <button 
            type="button" 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setSuccess('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary-light)',
              textDecoration: 'underline',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            {isRegistering ? 'Já tenho conta: Fazer Login' : 'Não tem conta? Criar Nova Conta'}
          </button>

          {!isRegistering && (
            <button 
              type="button" 
              onClick={handleQuickFill}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600,
                marginTop: '4px'
              }}
            >
              Preencher dados de demonstração (almoxarifado@gel.com.br)
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Login;
