'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, name, password }),
    });
    if (res.ok) {
      alert('Registration request submitted. Please wait for admin approval.');
      router.push('/login');
    } else {
      alert('Registration failed');
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-brand"><img src="/logo.png" alt="SimplySplit" width={34} height={34} /><span>SimplySplit</span></div>
      <section className="auth-panel">
        <span className="dashboard-kicker">Start sharing clearly</span>
        <h1>Create your account</h1>
        <p className="auth-subtitle">Build a space for trips, homes, and everything in between.</p>
        <form onSubmit={handleRegister} className="auth-form">
          <label>Username<input type="text" placeholder="Choose a username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required /></label>
          <label>Full name<input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Password<input type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button type="submit" className="button auth-submit">Request access</button>
        </form>
        <p className="auth-footer">Already have an account? <Link href="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
