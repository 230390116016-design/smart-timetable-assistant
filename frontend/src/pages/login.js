import { useState } from 'react';
import { useRouter } from 'next/router';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Login() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Something went wrong');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('userEmail', form.email);
      router.push('/');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '40px',
        width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '40px' }}>📅</div>
          <h1 style={{ color: '#4F46E5', margin: '8px 0 4px' }}>Smart Timetable</h1>
          <p style={{ color: '#64748b', margin: 0 }}>AI Academic Assistant</p>
        </div>

        <div style={{ display: 'flex', marginBottom: '24px', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
          <button onClick={() => setIsLogin(true)} style={{
            flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
            background: isLogin ? '#4F46E5' : 'transparent',
            color: isLogin ? 'white' : '#64748b', cursor: 'pointer', fontWeight: '600'
          }}>Login</button>
          <button onClick={() => setIsLogin(false)} style={{
            flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
            background: !isLogin ? '#4F46E5' : 'transparent',
            color: !isLogin ? 'white' : '#64748b', cursor: 'pointer', fontWeight: '600'
          }}>Sign Up</button>
        </div>

        {!isLogin && (
          <input
            placeholder="Full Name"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            style={{
              width: '100%', padding: '12px', marginBottom: '12px',
              border: '2px solid #e2e8f0', borderRadius: '8px',
              fontSize: '14px', boxSizing: 'border-box'
            }}
          />
        )}

        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={e => setForm({...form, email: e.target.value})}
          style={{
            width: '100%', padding: '12px', marginBottom: '12px',
            border: '2px solid #e2e8f0', borderRadius: '8px',
            fontSize: '14px', boxSizing: 'border-box'
          }}
        />

        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
          style={{
            width: '100%', padding: '12px', marginBottom: '16px',
            border: '2px solid #e2e8f0', borderRadius: '8px',
            fontSize: '14px', boxSizing: 'border-box'
          }}
        />

        {error && (
          <div style={{
            background: '#fee2e2', color: '#dc2626', padding: '10px',
            borderRadius: '8px', marginBottom: '16px', fontSize: '14px'
          }}>{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', background: '#4F46E5',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '16px', fontWeight: '600', cursor: 'pointer'
          }}
        >
          {loading ? '⏳ Please wait...' : (isLogin ? '🔐 Login' : '🚀 Sign Up')}
        </button>
      </div>
    </div>
  );
}