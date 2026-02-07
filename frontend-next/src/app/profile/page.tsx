'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';

function ProfileContent() {
  const router = useRouter();
  const { user, updateProfile, logout } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    riot_id: user?.riot_id || '',
    region: user?.region || '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateProfile({
        username: formData.username,
        riot_id: formData.riot_id || undefined,
        region: formData.region || undefined,
      });
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-bg-color text-text-primary">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-bg-color/80 backdrop-blur-md border-b border-border-color">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="font-valorant text-2xl font-bold bg-gradient-to-r from-red-highlight to-red-highlight-light bg-clip-text text-transparent">
                vAlAI
              </span>
            </Link>
            <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Profile Settings</h1>

        {/* Profile Form */}
        <div className="bg-card-bg border border-border-color rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Account Information</h2>

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 bg-bg-color/50 border border-border-color rounded-lg text-text-secondary cursor-not-allowed"
              />
              <p className="text-text-secondary text-xs mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-2">
                Username
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
                className="w-full px-4 py-3 bg-bg-color border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-red-highlight transition-colors"
              />
            </div>

            <div className="border-t border-border-color pt-5">
              <p className="text-text-secondary text-sm mb-4">Valorant Info</p>
              
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Account Info */}
        <div className="bg-card-bg border border-border-color rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Account Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Member since</span>
              <span className="text-text-primary">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Account status</span>
              <span className={user?.is_active ? 'text-green-400' : 'text-red-400'}>
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Plan</span>
              <span className="text-text-primary">Free</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-card-bg border border-red-500/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleLogout}
              className="flex-1 border border-border-color hover:border-red-highlight text-text-primary py-3 rounded-lg font-medium transition-colors"
            >
              Sign Out
            </button>
            <button
              className="flex-1 border border-red-500/50 hover:bg-red-500/10 text-red-400 py-3 rounded-lg font-medium transition-colors"
              onClick={() => alert('Contact support to delete your account')}
            >
              Delete Account
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
