'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import logo from '@/assets/Logo.png';
import loginbg from '@/assets/loginbg.png';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  if (!mounted) return <div className="min-h-screen bg-[#060a16]" />;

  return (
    <div className="relative min-h-screen flex font-sans overflow-hidden bg-[#090e22]">

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
        <div className="hidden lg:flex flex-col mt-40 z-20">
          <div className="mb-8 w-56 h-16 relative">
            <Image src={logo} alt="BDOS Logo" fill className="object-contain object-left" priority sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <h1 className="text-5xl! font-bold leading-[1.3] mb-5 tracking-tight" style={{ color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>
            Secure Your.<br />
            Workspace <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4facfe] via-[#a855f7] to-[#8f38ff]">Instantly.</span>
          </h1>
          <p className="text-lg! font-normal max-w-[360px] leading-relaxed" style={{ color: '#94a3b8' }}>
            Choose a strong new password to regain access to your pipeline, insights, and revenue tracking.
          </p>
        </div>

        {/* Right Side Reset Card */}
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
                  sizes="(max-width: 768px) 100vw, 33vw"
                  priority
                />
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-[1.4rem]! font-bold tracking-tight mb-2 text-white!">
                {submitted ? "Password Updated" : "Create New Password"}
              </h2>
              <p className="font-medium text-[0.9rem]! text-[#94a3b8]!">
                {submitted 
                  ? "Your account has been successfully secured." 
                  : "Please enter your new password below."
                }
              </p>
            </div>

            {submitted ? (
              <div className="space-y-6">
                <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl p-4 text-center">
                  <p className="text-[#10b981] font-medium text-[0.9rem]">
                    Your password has been successfully reset!
                  </p>
                </div>
                
                <Link
                  href="/"
                  className="w-full mt-6 relative overflow-hidden bg-gradient-to-r from-[#a855f7] via-[#6366f1] to-[#3b82f6] hover:from-[#9333ea] hover:to-[#2563eb] text-white font-bold py-3.5 px-4 rounded-lg! cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_8px_20px_rgba(99,102,241,0.5)] active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2 text-[0.95rem] tracking-wide">
                    Go to Login <ArrowRight size={18} strokeWidth={2.5} />
                  </span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[0.9rem] font-medium text-white">New Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#5c6aff] transition-colors duration-300">
                      <Lock size={18} strokeWidth={2} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
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

                <div className="space-y-2">
                  <label className="text-[0.9rem] font-medium text-white">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#5c6aff] transition-colors duration-300">
                      <Lock size={18} strokeWidth={2} />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={`custom-login-input w-full pl-11 pr-11 py-3.5 rounded-[12px] border border-b-white/20 text-[1rem]! placeholder:text-slate-500 placeholder:text-[0.95rem]! focus:ring-2 transition-all duration-300 ease-out ${
                        confirmPassword && password !== confirmPassword 
                          ? 'border-red-500/50 focus:ring-red-500/30' 
                          : 'border-white/10 focus:ring-[#5c6aff]/30'
                      }`}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors duration-300"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <Eye size={18} strokeWidth={2} /> : <EyeOff size={18} strokeWidth={2} />}
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
                    <>Update Password</>
                  )}
                </button>

                <div className="text-center mt-6">
                  <Link href="/" className="text-[0.85rem] font-medium text-white! hover:text-indigo-200! transition-colors inline-flex items-center gap-2">
                    <ArrowLeft size={14} /> Back to login
                  </Link>
                </div>
              </form>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
