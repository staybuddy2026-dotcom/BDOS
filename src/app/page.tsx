'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowRight, Lock, Mail, EyeOff, Eye, User } from 'lucide-react';
import logo from '@/assets/Logo.png';
import loginbg from '@/assets/loginbg.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  // True until the workspace has its first (admin) account.
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch('/api/auth/signup')
      .then((res) => res.json())
      .then((data) => setNeedsSetup(!!data.needsSetup))
      .catch(() => { /* keep the sign-in form */ });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(needsSetup ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(needsSetup ? { name, email, password } : { email, password })
      });

      if (res.ok) {
        setShowOverlay(true);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1800);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Sign in failed. Please check your email and password.');
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setError('Could not reach the server. Please try again.');
      setLoading(false);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-[#060a16]" />;

  return (
    <div className="relative min-h-screen flex font-sans overflow-hidden bg-[#090e22]">

      {/* Success Overlay */}
      {showOverlay && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070818] transition-opacity duration-1000"
          style={{ animation: 'fade-in-scale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        >
          <div className="flex flex-col items-center" style={{ animation: 'pulse-slow 2s infinite ease-in-out' }}>
            <Image src={logo} alt="BDOS Logo" width={300} height={100} className="mb-8" />
            <h2 className="text-5xl! text-white! font-bold text-white mb-3 tracking-tight">Welcome to BDOS Dashboard</h2>
            <p className="text-white text-sm flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-[#5c6aff] border-t-transparent animate-spin"></span>
              Loading your workspace...
            </p>
          </div>
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes fade-in-scale {
              0% { opacity: 0; transform: scale(1.05); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes pulse-slow {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.8; transform: scale(0.98); }
            }
          `}} />
        </div>
      )}

      {/* Immersive Full-Screen Background */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <Image
          src={loginbg}
          alt="Background"
          fill
          priority
          className="object-cover opacity-100"
          sizes="100vw"
        />
      </div>

      <div className="relative z-10 w-full flex justify-between h-screen max-w-[1600px] mx-auto">

        {/* Left Side (Text & Branding) */}
        <div className="hidden lg:flex flex-col justify-center z-20">
          <div className="mb-8 w-56 h-16 relative">
            <Image src={logo} alt="BDOS Logo" fill className="object-contain object-left" priority sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <h1 className="text-5xl! font-bold leading-[1.3] mb-5 tracking-tight" style={{ color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>
            Smarter Operations.<br />
            Greater <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4facfe] via-[#a855f7] to-[#8f38ff]">Possibilities.</span>
          </h1>
          <p className="text-lg! font-normal max-w-[360px] leading-relaxed" style={{ color: '#94a3b8' }}>
            Access your Business Development workspace and stay ahead.
          </p>

          {/* Decorative floating elements placeholder for the laptop graphic */}
          <div className="mt-12 relative w-[500px] h-[300px]">
            {/* Note: If the laptop graphic is separate, place it here as <Image src={laptop} ... /> */}
          </div>
        </div>

        {/* Right Side Login Card */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 z-20">
          <div className="w-full max-w-[500px] px-8 py-16 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(21, 35, 86, 0.45) 0%, rgba(12, 23, 65, 0.7) 100%)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(80, 120, 255, 0.15), inset 0 0 30px rgba(100, 150, 255, 0.05)'
            }}>

            {/* Logo inside card */}
            <div className="flex justify-center mb-4">
              <div className="relative w-54 h-16">
                <Image
                  src={logo}
                  alt="BDOS Logo"
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-[1.4rem]! font-bold tracking-tight mb-2 text-white!" >
                {needsSetup ? 'Create the admin account' : 'Sign in to your account'}
              </h2>
              <p className="font-medium text-[0.9rem]! text-[#94a3b8]!">
                {needsSetup ? 'First-time setup: this account manages your team' : 'Access your Business Development workspace'}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div role="alert" className="rounded-[12px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-[0.88rem] font-medium text-red-200">
                  {error}
                </div>
              )}

              {needsSetup && (
                <div className="space-y-2">
                  <label className="text-[0.9rem]! font-medium ml-1" style={{ color: '#ffffff' }}>Full Name</label>
                  <div className="relative group mt-2">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#5c6aff] transition-colors duration-300">
                      <User size={18} strokeWidth={2} />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      className="custom-login-input w-full pl-11 pr-4 py-3.5 rounded-[12px] border border-white/10 border-b-white/20 text-[1rem]! placeholder:text-slate-500 placeholder:text-[0.95rem]! focus:ring-2 focus:ring-[#5c6aff]/30 transition-all duration-300 ease-out"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[0.9rem]! font-medium ml-1" style={{ color: '#ffffff' }}>Email Address</label>
                <div className="relative group mt-2">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#5c6aff] transition-colors duration-300">
                    <Mail size={18} strokeWidth={2} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your work email"
                    className="custom-login-input w-full pl-11 pr-4 py-3.5 rounded-[12px] border border-white/10 border-b-white/20 text-[1rem]! placeholder:text-slate-500 placeholder:text-[0.95rem]! focus:ring-2 focus:ring-[#5c6aff]/30 transition-all duration-300 ease-out"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[0.9rem] font-medium text-white">Password</label>
                  {!needsSetup && <a href="/forgot-password" className="text-[0.85rem] font-medium text-white! hover:text-indigo-200! transition-colors">Forgot password?</a>}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#5c6aff] transition-colors duration-300">
                    <Lock size={18} strokeWidth={2} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={needsSetup ? 'Choose a password (8+ characters)' : 'Enter your password'}
                    minLength={needsSetup ? 8 : undefined}
                    autoComplete={needsSetup ? 'new-password' : 'current-password'}
                    className="custom-login-input w-full pl-11 pr-11 py-3.5 rounded-[12px] border border-white/10 border-b-white/20 text-[1rem]! placeholder:text-slate-500 placeholder:text-[0.95rem]! focus:ring-2 focus:ring-[#5c6aff]/30 transition-all duration-300 ease-out"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors duration-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye size={18} strokeWidth={2} /> : <EyeOff size={18} strokeWidth={2} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 relative overflow-hidden bg-gradient-to-r from-[#a855f7] via-[#6366f1] to-[#3b82f6] hover:from-[#9333ea] hover:to-[#2563eb] text-white font-bold py-3.5 px-4 rounded-lg! cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(99,102,241,0.5)] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center gap-2 text-[0.95rem] tracking-wide">
                    {needsSetup ? 'Create Account' : 'Sign In'} <ArrowRight size={18} strokeWidth={2.5} />
                  </span>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-[0.8rem] font-medium" style={{ color: '#94a3b8' }}>
                {needsSetup
                  ? 'You can add the rest of your team after signing in.'
                  : "Don't have an account? Ask your workspace admin to add you on the Team page."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
