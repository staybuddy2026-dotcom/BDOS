'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import logoImg from '@/assets/Logo.png';
import {
  Search,
  Settings,
  Home,
  Building2,
  Send,
  Activity,
  ChevronUp,
  User,
  LogOut,
  Target,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Extra route prefixes that should also mark this item as active. */
  alsoActiveFor?: string[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: Home },
      {
        name: 'BDE Workflow',
        href: '/priorities',
        icon: Target,
        alsoActiveFor: ['/apollo-search', '/review', '/re-engagement', '/revenue'],
      },
    ],
  },
  {
    label: 'Prospecting',
    items: [
      { name: 'Universal Search', href: '/discovery', icon: Search },
      { name: 'Company 360', href: '/company', icon: Building2 },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { name: 'Outreach', href: '/engagement', icon: Send },
      { name: 'Activity', href: '/crm', icon: Activity },
    ],
  },
  {
    label: 'System',
    items: [{ name: 'Settings', href: '/settings', icon: Settings }],
  },
];

export function Sidebar({ user }: { user?: any }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const name = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = name.charAt(0).toUpperCase();
  const role = user?.role === 'bde' ? 'BD Team' : 'User';

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <aside
      aria-label="Sidebar"
      className="fixed inset-y-0 left-0 z-[1000] flex h-screen w-[var(--sidebar-width,250px)] flex-col overflow-hidden border-r border-white/[0.06] text-white max-[768px]:hidden"
      style={{
        backgroundColor: '#070818',
        backgroundImage:
          'radial-gradient(120% 60% at 0% 0%, rgba(99, 102, 241, 0.22) 0%, transparent 60%), radial-gradient(90% 50% at 100% 100%, rgba(37, 99, 235, 0.28) 0%, transparent 65%)',
      }}
    >
      {/* Logout Overlay */}
      {isLoggingOut && (
        <div
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070818] transition-opacity duration-700 w-screen h-screen"
          style={{ animation: 'fade-in 0.5s ease-out forwards' }}
        >
          <div className="flex flex-col items-center" style={{ animation: 'pulse-slow 2s infinite ease-in-out' }}>
            <Image src={logoImg} alt="BDOS Logo" width={200} height={50} className="mb-6 opacity-50" />
            <h2 className="text-xl font-medium text-white mb-3 tracking-tight">Signing out...</h2>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#4facfe] to-[#8f38ff] w-full animate-[slide-right_1s_ease-in-out_infinite]"></div>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes slide-right {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}} />
        </div>
      )}

      {/* Brand */}
      <div className="relative z-10 px-5 pt-4 pb-4">
        <Link href="/" aria-label="BDOS home" className="flex items-center">
          <Image
            src={logoImg}
            alt="BDOS Logo"
            width={160}
            height={40}
            style={{ objectFit: 'contain', objectPosition: 'left center' }}
            priority
          />
        </Link>
        <div className="mt-4 h-px bg-gradient-to-r from-white/20 via-white/10 to-transparent" />
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="relative z-10 flex-1 overflow-y-auto px-3 pb-2">
        {navSections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="px-3 pb-2 text-[0.64rem] font-bold uppercase tracking-[0.16em] text-slate-500">
              {section.label}
            </p>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && !!pathname?.startsWith(item.href)) ||
                  !!item.alsoActiveFor?.some((prefix) => pathname?.startsWith(prefix));
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative flex items-center gap-3 rounded-[12px] border px-2.5 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${isActive
                        ? 'border-white/[0.08] bg-gradient-to-r from-indigo-500/[0.22] via-violet-500/[0.09] to-transparent'
                        : 'border-transparent hover:bg-white/[0.05]'
                        }`}
                    >
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute top-1/2 -left-3 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-violet-300 to-blue-400 shadow-[0_0_12px_rgba(167,139,250,0.9)]"
                        />
                      )}

                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] transition-all duration-200 ${isActive
                          ? 'bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-[0_4px_14px_rgba(99,102,241,0.5)]'
                          : 'bg-white/[0.05] text-slate-400 group-hover:bg-white/[0.1] group-hover:text-white'
                          }`}
                      >
                        <Icon size={17} strokeWidth={2.2} />
                      </span>

                      <span
                        className={`truncate text-[0.88rem] transition-colors duration-200 ${isActive ? 'font-semibold text-white' : 'font-medium text-slate-300 group-hover:text-white'
                          }`}
                      >
                        {item.name}
                      </span>

                      {isActive && (
                        <span
                          aria-hidden
                          className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_8px_rgba(196,181,253,0.95)]"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Profile */}
      <div ref={profileRef} className="relative z-10 border-t border-white/[0.06] px-3 py-3">
        {isMenuOpen && (
          <div
            role="menu"
            className="absolute right-3 bottom-[calc(100%-4px)] left-3 z-50 flex flex-col gap-1 rounded-[14px] border border-white/10 bg-[rgba(15,23,42,0.96)] p-1.5 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-[16px] [animation:fade-in-up_0.2s_cubic-bezier(0.16,1,0.3,1)]"
          >
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setIsMenuOpen(false)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] border-none bg-transparent px-3 py-2.5 text-left text-[0.85rem] font-medium text-slate-200 transition-colors duration-200 hover:bg-white/[0.08] hover:text-white"
            >
              <User size={16} /> Profile
            </Link>
            <button
              role="menuitem"
              onClick={async () => {
                setIsMenuOpen(false);
                setIsLoggingOut(true);
                await fetch('/api/auth/logout', { method: 'POST' });
                setTimeout(() => {
                  window.location.href = '/';
                }, 1200);
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] border-none bg-transparent px-3 py-2.5 text-left text-[0.85rem] font-medium text-red-300 transition-colors duration-200 hover:bg-red-500/15 hover:text-red-200"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}

        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.04] p-2.5 text-left transition-colors duration-200 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
        >
          <span className="relative shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-blue-400 text-[1rem] font-extrabold text-slate-950">
              {initial}
            </span>
            <span
              aria-hidden
              className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0b0d1f]"
            />
          </span>

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[0.88rem] font-semibold text-white">{name}</span>
            <span className="truncate text-[0.72rem] font-medium text-slate-400">{role}</span>
          </span>

          <ChevronUp
            size={16}
            className={`shrink-0 text-slate-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-0' : 'rotate-180'}`}
          />
        </button>
      </div>
    </aside>
  );
}
