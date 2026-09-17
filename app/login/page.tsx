'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (localStorage.getItem('user')) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/');
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-brand"><img src="/logo.png" alt="SimplySplit" width={34} height={34} /><span>SimplySplit</span></div>
      <section className="auth-panel">
        <span className="dashboard-kicker">Welcome back</span>
        <h1>Sign in to your space</h1>
        <p className="auth-subtitle">Pick up where your shared expenses left off.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Username or email<input
            type="text"
            placeholder="you@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          /></label>
          <label>Password<input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          /></label>
          <button type="submit" className="button auth-submit">Sign in</button>
        </form>
        <p className="auth-footer">New to SimplySplit? <Link href="/register">Create an account</Link></p>
      </section>
    </main>
  );
}
