'use client';

import { useEffect, useRef, useState } from 'react';
import { clearPageState } from '@/lib/usePageState';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import logoImg from '@/assets/Logo.png';
import {
  Search,
  ChevronUp,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { navSections, type NavItem } from '@/components/navigation/nav';
import type { UserSession } from '@/lib/auth';
import { ROLE_LABELS, canSeeAllDeals } from '@/lib/roles';

export function Sidebar({
  user,
  todayCount = 0,
  isCollapsed = false,
  onToggleCollapse,
}: {
  user?: UserSession | null;
  todayCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Phones and small tablets: the sidebar slides in over the page.
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    label: string;
    y: number;
    badge?: number;
  } | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  const name = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = name.charAt(0).toUpperCase();
  const role = user ? ROLE_LABELS[user.role] : 'User';
  const showManagerItems = !!user && canSeeAllDeals(user.role);
  const isAdmin = user?.role === 'ADMIN';

  const visible = (item: NavItem) =>
    (!item.managersOnly || showManagerItems) && (!item.adminOnly || isAdmin);

  const matchesPath = (item: NavItem) =>
    pathname === item.href ||
    (item.href !== '/' && !!pathname?.startsWith(item.href)) ||
    !!item.alsoActiveFor?.some((prefix) => pathname?.startsWith(prefix));

  // A page with its own menu entry (e.g. /linkedin/sales-navigator) does not also light up its parent (/linkedin).
  const isItemActive = (item: NavItem) =>
    matchesPath(item) &&
    !navSections.some((section) =>
      section.items.some(
        (other) =>
          other !== item &&
          other.href.startsWith(`${item.href}/`) &&
          !!pathname?.startsWith(other.href)
      )
    );

  const showTooltip = (label: string, e: React.MouseEvent<HTMLElement>, badge?: number) => {
    if (!isCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      label,
      y: rect.top + rect.height / 2,
      badge,
    });
  };

  const hideTooltip = () => {
    setHoveredTooltip(null);
  };

  const handleOpenCommand = () => {
    setMobileOpen(false);
    hideTooltip();
    window.dispatchEvent(new Event('bdos:open-command'));
  };

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
          <Image
            src={logoImg}
            alt="BDOS"
            width={96}
            height={24}
            style={{ objectFit: 'contain', objectPosition: 'left center' }}
          />
        </Link>
        <button
          type="button"
          onClick={handleOpenCommand}
          aria-label="Search"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"
        >
          <Search size={18} />
        </button>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-[999] hidden bg-slate-950/50 backdrop-blur-xs max-[768px]:block"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Main Sidebar (Desktop Collapsible & Mobile Drawer) */}
      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-[1000] flex h-screen flex-col overflow-hidden border-r border-white/[0.06] text-white transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width,transform] max-[768px]:w-[270px] ${
          mobileOpen ? '' : 'max-[768px]:-translate-x-full'
        } ${isCollapsed ? 'w-[72px]' : 'w-[250px]'}`}
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
            <div
              className="flex flex-col items-center"
              style={{ animation: 'pulse-slow 2s infinite ease-in-out' }}
            >
              <Image src={logoImg} alt="BDOS Logo" width={200} height={50} className="mb-6 opacity-50" />
              <h2 className="text-xl font-medium text-white mb-3 tracking-tight">Signing out...</h2>
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#4facfe] to-[#8f38ff] w-full animate-[slide-right_1s_ease-in-out_infinite]" />
              </div>
            </div>
            <style
              dangerouslySetInnerHTML={{
                __html: `
                @keyframes slide-right {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
              `,
              }}
            />
          </div>
        )}

        {/* Brand Header */}
        <div className={`relative z-10 pt-4 pb-2 transition-all duration-300 ${isCollapsed ? 'w-full px-0 flex flex-col items-center' : 'px-4 pb-3'}`}>
          {!isCollapsed ? (
            /* Expanded Brand Row */
            <>
              <div className="flex items-center justify-between gap-2">
                <Link href="/" aria-label="BDOS home" className="flex items-center overflow-hidden">
                  <Image
                    src={logoImg}
                    alt="BDOS Logo"
                    width={130}
                    height={32}
                    style={{ objectFit: 'contain', objectPosition: 'left center' }}
                    priority
                  />
                </Link>

                <div className="flex items-center gap-1">
                  {onToggleCollapse && (
                    <button
                      type="button"
                      onClick={onToggleCollapse}
                      title="Collapse sidebar (Ctrl+[)"
                      aria-label="Collapse sidebar"
                      className="hidden h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors md:flex"
                    >
                      <PanelLeftClose size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 md:hidden"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Expanded Command Search Box */}
              <button
                type="button"
                onClick={handleOpenCommand}
                className="mt-3.5 flex w-full items-center gap-2.5 rounded-[10px] border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-left text-[0.82rem] font-medium text-slate-400 transition-colors hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
              >
                <Search size={15} />
                <span className="flex-1 truncate">Search deals, pages…</span>
                <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-sans text-[0.66rem] text-slate-400">
                  Ctrl K
                </kbd>
              </button>
            </>
          ) : (
            /* Collapsed Brand Column - Mathematically Centered */
            <div className="flex flex-col items-center w-full gap-2.5">
              {/* B Emblem Button: Morphs to expand slider icon on hover, clicks to expand */}
              {onToggleCollapse ? (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  onMouseEnter={(e) => showTooltip('Expand sidebar (Ctrl+[)', e)}
                  onMouseLeave={hideTooltip}
                  title="Expand sidebar (Ctrl+[)"
                  aria-label="Expand sidebar"
                  className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-blue-500 shadow-[0_0_16px_rgba(99,102,241,0.45)] text-white transition-all duration-200 hover:shadow-[0_0_24px_rgba(99,102,241,0.7)] hover:scale-105 active:scale-95 cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                >
                  {/* Normal: B emblem */}
                  <span className="font-black text-[1.15rem] tracking-tight transition-all duration-200 group-hover:opacity-0 group-hover:scale-75 group-hover:rotate-6">
                    B
                  </span>

                  {/* On Hover: Expand slider icon */}
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 text-white">
                    <PanelLeftOpen size={19} strokeWidth={2.4} />
                  </span>
                </button>
              ) : (
                <Link
                  href="/"
                  aria-label="BDOS home"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-blue-500 shadow-[0_0_16px_rgba(99,102,241,0.45)] text-white font-black text-[1.1rem] hover:scale-105 transition-transform"
                  onMouseEnter={(e) => showTooltip('BDOS Home', e)}
                  onMouseLeave={hideTooltip}
                >
                  B
                </Link>
              )}

              {/* Collapsed Search Icon Button */}
              <button
                type="button"
                onClick={handleOpenCommand}
                aria-label="Search deals, pages"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 cursor-pointer"
                onMouseEnter={(e) => showTooltip('Search (Ctrl+K)', e)}
                onMouseLeave={hideTooltip}
              >
                <Search size={17} />
              </button>

              {/* Clean separator between top controls and nav list */}
              <div className="my-1 h-px w-8 bg-gradient-to-r from-transparent via-white/[0.14] to-transparent" />
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <nav
          aria-label="Main navigation"
          className={`relative z-10 flex-1 overflow-y-auto overflow-x-hidden pb-2 transition-all duration-300 ${
            isCollapsed
              ? 'w-full px-0 flex flex-col items-center [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
              : 'px-3'
          }`}
          style={{ scrollbarWidth: isCollapsed ? 'none' : 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
        >
          {navSections
            .filter((section) => section.items.some(visible))
            .map((section, sectionIdx) => {
              const open = !section.collapsible || moreOpen || section.items.some(isItemActive);

              return (
                <div key={section.label} className={isCollapsed ? 'w-full flex flex-col items-center mb-1.5' : 'mb-3.5'}>
                  {/* Section Label or Divider */}
                  {!isCollapsed ? (
                    section.collapsible ? (
                      <button
                        type="button"
                        onClick={() => setMoreOpen((v) => !v)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between px-3 pb-1.5 text-[0.64rem] font-bold uppercase tracking-[0.16em] text-slate-500 hover:text-slate-300"
                      >
                        {section.label}
                        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                    ) : (
                      <p className="px-3 pb-1.5 text-[0.64rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                        {section.label}
                      </p>
                    )
                  ) : (
                    /* Divider line in collapsed mode */
                    sectionIdx > 0 && (
                      <div className="my-2 h-px w-8 mx-auto bg-gradient-to-r from-transparent via-white/[0.14] to-transparent" />
                    )
                  )}

                  {/* Nav Item List */}
                  {(open || isCollapsed) && (
                    <ul className={`m-0 flex list-none flex-col gap-1 p-0 ${isCollapsed ? 'w-full items-center' : ''}`}>
                      {section.items.filter(visible).map((item) => {
                        const isActive = isItemActive(item);
                        const Icon = item.icon;

                        return (
                          <li key={item.href} className={isCollapsed ? 'w-full relative flex justify-center' : 'w-full'}>
                            <Link
                              href={item.href}
                              onClick={() => {
                                setMobileOpen(false);
                                hideTooltip();
                              }}
                              onMouseEnter={(e) =>
                                showTooltip(item.name, e, item.href === '/today' ? todayCount : undefined)
                              }
                              onMouseLeave={hideTooltip}
                              aria-current={isActive ? 'page' : undefined}
                              className={`group relative flex items-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
                                isCollapsed
                                  ? `h-10 w-10 justify-center rounded-xl ${
                                      isActive
                                        ? 'bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-[0_4px_16px_rgba(99,102,241,0.55)] border border-white/20'
                                        : 'text-slate-400 hover:bg-white/[0.08] hover:text-white hover:scale-105 active:scale-95'
                                    }`
                                  : `gap-3 rounded-[12px] border px-2.5 py-1.5 ${
                                      isActive
                                        ? 'border-white/[0.08] bg-gradient-to-r from-indigo-500/[0.22] via-violet-500/[0.09] to-transparent text-white'
                                        : 'border-transparent hover:bg-white/[0.05] text-slate-300 hover:text-white'
                                    }`
                              }`}
                            >
                              {/* Left neon indicator bar when active */}
                              {isActive && (
                                <span
                                  aria-hidden
                                  className={`absolute top-1/2 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-violet-300 to-blue-400 shadow-[0_0_12px_rgba(167,139,250,0.9)] ${
                                    isCollapsed ? '-left-4 h-6 w-1' : '-left-3 h-6 w-[3px]'
                                  }`}
                                />
                              )}

                              {/* Icon container */}
                              {!isCollapsed ? (
                                <span
                                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] transition-all duration-200 ${
                                    isActive
                                      ? 'bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-[0_4px_14px_rgba(99,102,241,0.5)]'
                                      : 'bg-white/[0.05] text-slate-400 group-hover:bg-white/[0.1] group-hover:text-white'
                                  }`}
                                >
                                  <Icon size={16} strokeWidth={2.2} />
                                </span>
                              ) : (
                                <Icon size={18} strokeWidth={isActive ? 2.3 : 2} />
                              )}

                              {/* Text label (expanded only) */}
                              {!isCollapsed && (
                                <span
                                  className={`truncate text-[0.88rem] transition-colors duration-200 ${
                                    isActive ? 'font-semibold text-white' : 'font-medium text-slate-300 group-hover:text-white'
                                  }`}
                                >
                                  {item.name}
                                </span>
                              )}

                              {/* Today Count Badge */}
                              {item.href === '/today' && todayCount > 0 ? (
                                isCollapsed ? (
                                  <span
                                    className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.6rem] font-bold text-white shadow-[0_2px_6px_rgba(244,63,94,0.6)]"
                                    aria-label={`${todayCount} things to do today`}
                                  >
                                    {todayCount > 99 ? '99+' : todayCount}
                                  </span>
                                ) : (
                                  <span
                                    className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.68rem] font-bold text-white"
                                    aria-label={`${todayCount} things to do today`}
                                  >
                                    {todayCount > 99 ? '99+' : todayCount}
                                  </span>
                                )
                              ) : (
                                !isCollapsed &&
                                isActive && (
                                  <span
                                    aria-hidden
                                    className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_8px_rgba(196,181,253,0.95)]"
                                  />
                                )
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

        {/* Profile Section */}
        <div
          ref={profileRef}
          className={`relative z-10 border-t border-white/[0.06] transition-all duration-300 ${
            isCollapsed ? 'w-full px-0 py-3 flex justify-center' : 'p-3'
          }`}
        >
          {/* Profile Menu Popover */}
          {isMenuOpen && (
            <div
              role="menu"
              className={`absolute z-50 flex flex-col gap-1 rounded-[14px] border border-white/10 bg-[rgba(15,23,42,0.96)] p-1.5 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-[16px] [animation:fade-in-up_0.2s_cubic-bezier(0.16,1,0.3,1)] ${
                isCollapsed
                  ? 'left-[76px] bottom-2 w-48'
                  : 'right-3 bottom-[calc(100%-4px)] left-3'
              }`}
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
                  clearPageState();
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

          {/* Profile Button */}
          {!isCollapsed ? (
            /* Expanded Profile Card */
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
                className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                  isMenuOpen ? 'rotate-0' : 'rotate-180'
                }`}
              />
            </button>
          ) : (
            /* Collapsed Profile Circle Button */
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
              onMouseEnter={(e) => showTooltip(`${name} (${role})`, e)}
              onMouseLeave={hideTooltip}
              aria-label="User menu"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-blue-400 text-[0.92rem] font-extrabold text-slate-950">
                {initial}
              </span>
              <span
                aria-hidden
                className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#070818]"
              />
            </button>
          )}
        </div>
      </aside>

      {/* Floating Hover Tooltip (Flyout in Collapsed Mode) */}
      {isCollapsed && hoveredTooltip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed left-[80px] z-[99999] flex -translate-y-1/2 items-center gap-2 rounded-xl border border-white/10 bg-[#0c1024]/95 px-3 py-1.5 text-[0.8rem] font-semibold text-white shadow-[0_12px_32px_rgba(0,0,0,0.65)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          style={{ top: `${hoveredTooltip.y}px` }}
        >
          <span className="whitespace-nowrap">{hoveredTooltip.label}</span>
          {hoveredTooltip.badge !== undefined && hoveredTooltip.badge > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[0.66rem] font-bold text-white shadow-xs">
              {hoveredTooltip.badge}
            </span>
          )}
          <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 border-b border-l border-white/10 bg-[#0c1024]" />
        </div>
      )}
    </>
  );
}
