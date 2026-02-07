'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-color flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <span className="font-valorant text-2xl font-bold bg-gradient-to-r from-red-highlight to-red-highlight-light bg-clip-text text-transparent">
            vAlAI
          </span>
        </Link>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-card-bg border border-border-color rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Welcome back</h1>
            <p className="text-text-secondary mb-8">Sign in to continue to ValAI</p>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-bg-color border border-border-color rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-red-highlight transition-colors"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-bg-color border border-border-color rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-red-highlight transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-highlight hover:bg-red-highlight-light disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-text-secondary text-sm">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-red-highlight hover:text-red-highlight-light transition-colors">
                  Create one
                </Link>
              </p>
            </div>
          </div>

          {/* Benefits reminder */}
          <div className="mt-8 text-center text-text-secondary text-sm">
            <p className="mb-2">🎯 Track your Valorant performance</p>
            <p className="mb-2">🤖 Get AI-powered coaching advice</p>
            <p>📈 See your improvement over time</p>
          </div>
        </div>
      </main>
    </div>
  );
}
