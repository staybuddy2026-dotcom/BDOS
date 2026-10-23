'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import type { UserSession } from '@/lib/auth';

/**
 * Enterprise Application Shell
 * Wraps protected layout with persistent collapsible sidebar state,
 * global keyboard shortcut (Ctrl+[ / Cmd+[), and smooth content resizing.
 */
export function AppShell({
  user,
  todayCount,
  children,
}: {
  user: UserSession;
  todayCount: number;
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load persistent state from localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bdos_sidebar_collapsed');
      if (saved === 'true') {
        setIsCollapsed(true);
      }
    } catch {}
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bdos_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Keyboard shortcut Ctrl+[ or Cmd+[ to toggle collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse]);

  return (
    <div className={`app-shell ${isCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      <Sidebar
        user={user}
        todayCount={todayCount}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <CommandPalette role={user.role} />
      <main className="main-content">
        <div className="page-container animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
