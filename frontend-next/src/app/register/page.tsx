'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    riot_id: '',
    region: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        riot_id: formData.riot_id || undefined,
        region: formData.region || undefined,
      });
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

      {/* Register Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-card-bg border border-border-color rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Create your account</h1>
            <p className="text-text-secondary mb-8">Start improving your Valorant gameplay</p>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                  Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-bg-color border border-border-color rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-red-highlight transition-colors"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-2">
                  Username *
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  minLength={3}
                  maxLength={50}
                  className="w-full px-4 py-3 bg-bg-color border border-border-color rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-red-highlight transition-colors"
                  placeholder="Choose a username"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                    Password *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 bg-bg-color border border-border-color rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-red-highlight transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-2">
                    Confirm *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-bg-color border border-border-color rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-red-highlight transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="border-t border-border-color pt-5">
                <p className="text-text-secondary text-sm mb-4">Valorant Info (optional)</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="riot_id" className="block text-sm font-medium text-text-secondary mb-2">
                      Riot ID
                    </label>
                    <input
                      id="riot_id"
                      name="riot_id"
                      type="text"
                      value={formData.riot_id}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-bg-color border border-border-color rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-red-highlight transition-colors"
                      placeholder="Name#TAG"
                    />
                  </div>
                  <div>
                    <label htmlFor="region" className="block text-sm font-medium text-text-secondary mb-2">
                      Region
                    </label>
                    <select
                      id="region"
                      name="region"
                      value={formData.region}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-bg-color border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-red-highlight transition-colors"
                    >
                      <option value="">Select...</option>
                      <option value="na">NA</option>
                      <option value="eu">EU</option>
                      <option value="ap">AP</option>
                      <option value="kr">KR</option>
                      <option value="br">BR</option>
                      <option value="latam">LATAM</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-highlight hover:bg-red-highlight-light disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-text-secondary text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-red-highlight hover:text-red-highlight-light transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Free tier info */}
          <div className="mt-8 p-4 bg-card-bg border border-border-color rounded-xl">
            <p className="text-text-primary font-medium mb-2">✨ Free Account Includes:</p>
            <ul className="text-text-secondary text-sm space-y-1">
              <li>• Basic performance tracking</li>
              <li>• Last 5 matches history</li>
              <li>• Stability score analysis</li>
              <li>• Limited AI coaching (5/day)</li>
            </ul>
            <p className="text-text-secondary text-sm mt-3">
              <Link href="/pricing" className="text-red-highlight hover:text-red-highlight-light">
                Upgrade to Pro
              </Link>
              {' '}for unlimited features
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
