import React, { useState } from 'react';
import { supabase } from '../services/supabase';

/**
 * EmailTestPanel - Componente de prueba para enviar correos vía gmail-sender.
 * Solo visible en desarrollo o para el owner. Eliminar o proteger después del test.
 */
const EmailTestPanel: React.FC = () => {
  const [title, setTitle] = useState('🔔 Prueba de Sistema de Correo');
  const [body, setBody] = useState(
    'Este es un correo de prueba del sistema de notificaciones de la App MOTO-E.\n\nSi recibes esto, ¡el sistema funciona correctamente! 🚀'
  );
  const [scope, setScope] = useState<'global' | 'branch' | 'subteam'>('branch');
  const [scopeValue, setScopeValue] = useState('Eléctrica');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<string>('');

  const handleTest = async () => {
    setStatus('sending');
    setResult('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        'https://qijzycmrtiwqvvrfoahx.supabase.co/functions/v1/gmail-sender',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            body,
            target_scope: scope,
            target_value: scopeValue,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setResult(`❌ Error: ${data.error ?? res.statusText}`);
      } else if (data.status === 'no_recipients') {
        setStatus('error');
        setResult(`⚠️ Sin destinatarios: ${data.message}`);
      } else {
        setStatus('success');
        setResult(
          `✅ Correo enviado a ${data.sentTo} persona(s).\nMessageId: ${data.messageId}`
        );
      }
    } catch (err: any) {
      setStatus('error');
      setResult(`❌ Error de red: ${err.message}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        zIndex: 9999,
        background: '#141414',
        border: '1px solid rgba(0,204,136,0.3)',
        borderRadius: 16,
        padding: 20,
        width: 320,
        boxShadow: '0 8px 32px rgba(0,204,136,0.15)',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <h3
        style={{
          margin: '0 0 12px 0',
          color: '#00cc88',
          fontSize: 14,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        📧 Test Email Panel
      </h3>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del correo"
        style={inputStyle}
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Cuerpo del correo..."
        rows={3}
        style={{ ...inputStyle, resize: 'none' }}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as any)}
          style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
        >
          <option value="global">Todo el equipo</option>
          <option value="branch">Por rama</option>
          <option value="subteam">Por subequipo</option>
        </select>
        {scope !== 'global' && (
          <input
            value={scopeValue}
            onChange={(e) => setScopeValue(e.target.value)}
            placeholder={scope === 'branch' ? 'Ej: Eléctrica' : 'Ej: Baterías'}
            style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
          />
        )}
      </div>

      <button
        onClick={handleTest}
        disabled={status === 'sending'}
        style={{
          width: '100%',
          padding: '10px 0',
          background: status === 'sending' ? '#005540' : '#00cc88',
          color: '#000',
          border: 'none',
          borderRadius: 8,
          fontWeight: 900,
          fontSize: 13,
          cursor: status === 'sending' ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginTop: 4,
          transition: 'background 0.2s',
        }}
      >
        {status === 'sending' ? 'Enviando...' : 'Enviar Test'}
      </button>

      {result && (
        <pre
          style={{
            marginTop: 12,
            padding: '10px 12px',
            background: status === 'success' ? 'rgba(0,204,136,0.1)' : 'rgba(255,60,60,0.1)',
            borderRadius: 8,
            color: status === 'success' ? '#00cc88' : '#ff6060',
            fontSize: 11,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {result}
        </pre>
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#fff',
  fontSize: 12,
  outline: 'none',
  marginBottom: 8,
  boxSizing: 'border-box',
};

export default EmailTestPanel;
