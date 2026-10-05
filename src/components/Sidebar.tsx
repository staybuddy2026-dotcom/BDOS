'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import logoImg from '@/assets/Logo.png';
import { Search, ChevronUp, User, LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { navSections, type NavItem } from '@/components/navigation/nav';
import type { UserSession } from '@/lib/auth';
import { ROLE_LABELS, canSeeAllDeals } from '@/lib/roles';

export function Sidebar({ user, todayCount = 0 }: { user?: UserSession | null; todayCount?: number }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Phones and small tablets: the sidebar slides in over the page.
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const name = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = name.charAt(0).toUpperCase();
  const role = user ? ROLE_LABELS[user.role] : 'User';
  const showManagerItems = !!user && canSeeAllDeals(user.role);
  const isAdmin = user?.role === 'ADMIN';
  const visible = (item: NavItem) => (!item.managersOnly || showManagerItems) && (!item.adminOnly || isAdmin);
  const isItemActive = (item: NavItem) =>
    pathname === item.href || (item.href !== '/' && !!pathname?.startsWith(item.href)) || !!item.alsoActiveFor?.some((prefix) => pathname?.startsWith(prefix));

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
    <>
    {/* Mobile: a slim top bar with the menu button, so it never sits on top of a page's own header */}
    <div className="fixed inset-x-0 top-0 z-[998] hidden h-[var(--mobile-bar-h)] items-center gap-2 bg-[#070818] px-3 text-white shadow-md max-[768px]:flex">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        aria-expanded={mobileOpen}
        className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"
      >
        <Menu size={20} />
      </button>
      <Link href="/" aria-label="BDOS home" className="flex items-center">
        <Image src={logoImg} alt="BDOS" width={96} height={24} style={{ objectFit: 'contain', objectPosition: 'left center' }} />
      </Link>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('bdos:open-command'))}
        aria-label="Search"
        className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"
      >
        <Search size={18} />
      </button>
    </div>
    {mobileOpen && <div className="fixed inset-0 z-[999] hidden bg-slate-950/50 max-[768px]:block" onClick={() => setMobileOpen(false)} aria-hidden />}

    <aside
      aria-label="Sidebar"
      className={`fixed inset-y-0 left-0 z-[1000] flex h-screen w-[var(--sidebar-width,250px)] flex-col overflow-hidden border-r border-white/[0.06] text-white transition-transform duration-200 max-[768px]:w-[270px] ${mobileOpen ? '' : 'max-[768px]:-translate-x-full'}`}
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
        <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="absolute top-4 right-4 hidden h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 max-[768px]:flex">
          <X size={18} />
        </button>
        {/* Opens the command palette (also Ctrl+K / Cmd+K anywhere) */}
        <button
          type="button"
          onClick={() => { setMobileOpen(false); window.dispatchEvent(new Event('bdos:open-command')); }}
          className="mt-4 flex w-full items-center gap-2.5 rounded-[10px] border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-left text-[0.82rem] font-medium text-slate-400 transition-colors hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
        >
          <Search size={15} />
          <span className="flex-1">Search deals, pages…</span>
          <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-sans text-[0.66rem] text-slate-400">Ctrl K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="relative z-10 flex-1 overflow-y-auto px-3 pb-2">
        {navSections.filter((section) => section.items.some(visible)).map((section) => {
          const open = !section.collapsible || moreOpen || section.items.some(isItemActive);
          return (
          <div key={section.label} className="mb-4">
            {section.collapsible ? (
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center justify-between px-3 pb-2 text-[0.64rem] font-bold uppercase tracking-[0.16em] text-slate-500 hover:text-slate-300"
              >
                {section.label}
                <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <p className="px-3 pb-2 text-[0.64rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                {section.label}
              </p>
            )}
            {open && (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {section.items.filter(visible).map((item) => {
                const isActive = isItemActive(item);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative flex items-center gap-3 rounded-[12px] border px-2.5 py-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${isActive
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
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] transition-all duration-200 ${isActive
                          ? 'bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-[0_4px_14px_rgba(99,102,241,0.5)]'
                          : 'bg-white/[0.05] text-slate-400 group-hover:bg-white/[0.1] group-hover:text-white'
                          }`}
                      >
                        <Icon size={16} strokeWidth={2.2} />
                      </span>

                      <span
                        className={`truncate text-[0.88rem] transition-colors duration-200 ${isActive ? 'font-semibold text-white' : 'font-medium text-slate-300 group-hover:text-white'
                          }`}
                      >
                        {item.name}
                      </span>

                      {item.href === '/today' && todayCount > 0 ? (
                        <span
                          className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.68rem] font-bold text-white"
                          aria-label={`${todayCount} things to do today`}
                        >
                          {todayCount > 99 ? '99+' : todayCount}
                        </span>
                      ) : isActive && (
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
            )}
          </div>
          );
        })}
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
    </>
  );
}
