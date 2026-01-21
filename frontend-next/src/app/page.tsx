'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [players, setPlayers] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement>(null);

  // Track mouse position for interactive background
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const heroElement = heroRef.current;
    if (heroElement) {
      heroElement.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (heroElement) {
        heroElement.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setLoading(true);
        const data = await api.getPlayers();
        setPlayers(data.players);
        if (data.players.length > 0) {
          setSelectedPlayer(data.players[0]);
        }
      } catch (err) {
        setError('Failed to load players: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    loadPlayers();
  }, []);

  const handleLoadStats = () => {
    if (selectedPlayer) {
      router.push(`/player/${encodeURIComponent(selectedPlayer)}`);
    }
  };

  return (
    <div className="min-h-screen bg-bg-color text-text-primary">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-color/80 backdrop-blur-md border-b border-border-color">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="font-valorant text-2xl font-bold bg-gradient-to-r from-red-highlight to-red-highlight-light bg-clip-text text-transparent">
                vAlAI
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-text-secondary hover:text-text-primary transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-text-secondary hover:text-text-primary transition-colors">
                How It Works
              </Link>
              <Link href="#pricing" className="text-text-secondary hover:text-text-primary transition-colors">
                Pricing
              </Link>
              <button 
                onClick={() => document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-red-highlight hover:bg-red-highlight-light text-white px-5 py-2 rounded-lg font-medium transition-colors"
              >
                Get Started
              </button>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden text-text-secondary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border-color">
              <div className="flex flex-col gap-4">
                <Link href="#features" className="text-text-secondary hover:text-text-primary transition-colors">
                  Features
                </Link>
                <Link href="#how-it-works" className="text-text-secondary hover:text-text-primary transition-colors">
                  How It Works
                </Link>
                <Link href="#pricing" className="text-text-secondary hover:text-text-primary transition-colors">
                  Pricing
                </Link>
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-red-highlight hover:bg-red-highlight-light text-white px-5 py-2 rounded-lg font-medium transition-colors w-fit"
                >
                  Get Started
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id='hero' ref={heroRef} className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Dot pattern background with mouse interaction */}
        <div className="absolute inset-0 bg-bg-color">
          <div className="absolute inset-0 bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
          {/* Mouse glow effect */}
          <div 
            className="absolute w-[600px] h-[600px] rounded-full pointer-events-none transition-opacity duration-300"
            style={{
              left: mousePosition.x - 300,
              top: mousePosition.y - 300,
              background: 'radial-gradient(circle, hsla(210, 50%, 9%, 0.9) 0%, hsla(210, 50%, 14%, 0) 70%)',
            }}
          />
          {/* Interactive dots highlight */}
          <div 
            className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
            style={{
              left: mousePosition.x - 200,
              top: mousePosition.y - 200,
              background: 'radial-gradient(circle, hsla(210, 50%, 9%, 0.9) 0%, hsla(210, 50%, 11%, 0) 70%)',
              filter: 'blur(20px)',
            }}
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Animated badge */}
            <div className="inline-flex items-center gap-2 bg-card-bg border border-border-color rounded-full px-4 py-2 mb-6 animate-fade-in-down animation-delay-100">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-text-secondary text-sm">Powered by AI Analytics</span>
            </div>
            
            {/* Animated heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className='uppercase animate-fade-in-up animation-delay-200 inline-block'>Elevate Your</span>
              <span className="block bg-gradient-to-r from-red-highlight to-red-highlight-light bg-clip-text text-transparent animate-fade-in-up animation-delay-400">
                <span className='font-valorant'>vAlorAnt</span> <span className='uppercase'>Game</span>
              </span>
            </h1>
            
            {/* Animated paragraph */}
            <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto animate-fade-in-up animation-delay-600">
              Advanced AI-powered analytics that track your performance, identify patterns, 
              and provide personalized coaching to help you climb the ranks.
            </p>

            {/* Animated buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-800">
              <button 
                onClick={() => document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-cyan-500 hover:bg-cyan-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
              >
                Start Analyzing Free
              </button>
              <Link 
                href="#features"
                className="bg-card-bg hover:bg-card-bg-light border-2 border-border-color text-text-primary px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:border-cyan-500"
              >
                Learn More
              </Link>
            </div>

            {/* Animated Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              <div className="animate-fade-in-up opacity-0 [animation-delay:1s] [animation-fill-mode:forwards]">
                <div className="text-3xl md:text-4xl font-bold text-text-primary">10K+</div>
                <div className="text-text-tertiary text-sm mt-1">Matches Analyzed</div>
              </div>
              <div className="animate-fade-in-up opacity-0 [animation-delay:1.1s] [animation-fill-mode:forwards]">
                <div className="text-3xl md:text-4xl font-bold text-text-primary">95%</div>
                <div className="text-text-tertiary text-sm mt-1">Accuracy Rate</div>
              </div>
              <div className="animate-fade-in-up opacity-0 [animation-delay:1.2s] [animation-fill-mode:forwards]">
                <div className="text-3xl md:text-4xl font-bold text-text-primary">24/7</div>
                <div className="text-text-tertiary text-sm mt-1">AI Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-card-bg/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Everything you need to understand and improve your gameplay
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card-bg rounded-2xl border-2 border-border-color p-8 hover:border-red-highlight/50 transition-colors">
              <div className="w-14 h-14 bg-red-highlight/10 rounded-xl flex items-center justify-center mb-6">
                <img src="/icons/stabilityRed_icon.png" alt="" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">Stability Analysis</h3>
              <p className="text-text-secondary">
                Track your performance consistency across matches. Understand your peak times and identify patterns in your gameplay.
              </p>
            </div>

            <div className="bg-card-bg rounded-2xl border-2 border-border-color p-8 hover:border-red-highlight/50 transition-colors">
              <div className="w-14 h-14 bg-red-highlight/10 rounded-xl flex items-center justify-center mb-6">
                <img src="/icons/chart_icon.png" alt="" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">Trend Analytics</h3>
              <p className="text-text-secondary">
                Visualize your headshot rate, K/D ratio, and other crucial metrics over time with beautiful interactive charts.
              </p>
            </div>

            <div className="bg-card-bg rounded-2xl border-2 border-border-color p-8 hover:border-red-highlight/50 transition-colors">
              <div className="w-14 h-14 bg-red-highlight/10 rounded-xl flex items-center justify-center mb-6">
                <img src="/icons/copilotRed_icon.png" alt="AI Copilot" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">AI Copilot</h3>
              <p className="text-text-secondary">
                Get personalized coaching tips from our AI that analyzes your stats and provides actionable improvement advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Get started in seconds with our simple three-step process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-highlight text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">Select Your Profile</h3>
              <p className="text-text-secondary">
                Choose your player profile from the dropdown to load your match history and statistics.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-highlight text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">AI Analyzes Your Data</h3>
              <p className="text-text-secondary">
                Our advanced algorithms process your match data to identify trends, patterns, and areas for improvement.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-highlight text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">Get Personalized Insights</h3>
              <p className="text-text-secondary">
                Receive detailed analysis and coaching tips tailored specifically to your gameplay style.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-card-bg/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Start for free, upgrade when you need more
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-card-bg rounded-2xl border-2 border-border-color p-8">
              <h3 className="text-xl font-semibold text-text-primary mb-2">Free</h3>
              <div className="text-4xl font-bold text-text-primary mb-4">$0<span className="text-lg text-text-tertiary font-normal">/month</span></div>
              <p className="text-text-secondary mb-6">Perfect for getting started</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Basic stability analysis
                </li>
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Last 10 matches
                </li>
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Basic AI tips
                </li>
              </ul>
              <button className="w-full bg-card-bg-light hover:bg-border-color text-text-primary py-3 rounded-xl font-semibold transition-colors border-2 border-border-color">
                Current Plan
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-card-bg rounded-2xl border-2 border-cyan-500 p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                Popular
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">Pro</h3>
              <div className="text-4xl font-bold text-text-primary mb-4">$9<span className="text-lg text-text-tertiary font-normal">/month</span></div>
              <p className="text-text-secondary mb-6">For serious players</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Advanced analytics
                </li>
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited match history
                </li>
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited AI Copilot
                </li>
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Performance Predicitions
                </li>
              </ul>
              <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-white py-3 rounded-xl font-semibold transition-colors">
                Upgrade to Pro
              </button>
            </div>

            {/* Team Plan */}
            <div className="bg-card-bg rounded-2xl border-2 border-border-color p-8">
              <h3 className="text-xl font-semibold text-text-primary mb-2">Team</h3>
              <div className="text-4xl font-bold text-text-primary mb-4">$29<span className="text-lg text-text-tertiary font-normal">/month</span></div>
              <p className="text-text-secondary mb-6">For competitive teams</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Everything in Pro
                </li>
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  5 team members
                </li>
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Team comparisons
                </li>
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Dedicated support
                </li>
              </ul>
              <button className="w-full bg-card-bg-light hover:bg-border-color text-text-primary py-3 rounded-xl font-semibold transition-colors border-2 border-border-color">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section id="get-started" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card-bg rounded-2xl border-2 border-border-color p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">Start Your Analysis</h2>
            <p className="text-text-secondary text-center mb-8">
              Select your player profile to begin tracking your Valorant performance
            </p>
            
            {error && (
              <div className="bg-red-500/20 border-2 border-red-highlight text-red-highlight p-4 rounded-xl mb-5 text-center font-medium">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-10">
                <div className="inline-block w-8 h-8 border-4 border-red-highlight border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-text-secondary">Loading players...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-text-secondary mb-2 font-medium">Select Player</label>
                  <select
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="w-full bg-bg-color border-2 border-border-color rounded-xl px-4 py-3 text-text-primary focus:border-red-highlight focus:outline-none transition-colors"
                  >
                    {players.map((player) => (
                      <option key={player} value={player}>
                        {player}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleLoadStats}
                  disabled={!selectedPlayer}
                  className="w-full bg-red-highlight hover:bg-red-highlight-light disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02]"
                >
                  View My Stats →
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border-color">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-red-highlight to-red-highlight-light bg-clip-text text-transparent">
                ValAI
              </span>
              <span className="text-text-tertiary">© 2026</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">
                Terms
              </Link>
              <Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
