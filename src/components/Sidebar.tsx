'use client';

import React, { useState } from 'react';
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
  ChevronDown,
  User,
  LogOut,
  Target
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'BDE Workflow', href: '/priorities', icon: Target },
  { name: 'Universal Search', href: '/discovery', icon: Search },
  { name: 'Company 360', href: '/company', icon: Building2 },
  { name: 'Outreach', href: '/engagement', icon: Send },
  { name: 'Activity', href: '/crm', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Image
          src={logoImg}
          alt="BDOS Logo"
          width={160}
          height={40}
          style={{ objectFit: 'contain', objectPosition: 'center' }}
          priority
        />
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon className="nav-icon" />
                  <span className="nav-text">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div style={{ position: 'relative' }}>
          {isMenuOpen && (
            <div className="profile-dropdown-menu">
              <button className="dropdown-item">
                <User size={16} /> Profile
              </button>
              <button className="dropdown-item logout">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
          
          <div className="user-profile" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <div className="user-avatar">
              A
            </div>
            <div className="user-info">
              <span className="user-name">Akash</span>
              <span className="user-role">BD Team</span>
            </div>
            <ChevronDown size={16} className="chevron" style={{ transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .sidebar {
          width: var(--sidebar-width, 260px);
          min-width: 260px;
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          background-color: #060714;
          background-image: 
            linear-gradient(to bottom, #060714 30%, transparent 80%),
            conic-gradient(from 315deg at 50% 100%, transparent 0deg, rgba(25, 70, 220, 0.4) 45deg, transparent 90deg);
          border-right: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          padding: 4px 0 24px 0;
          box-sizing: border-box;
          color: white;
          overflow: hidden;
        }
        
        .sidebar-brand, .nav-menu, .sidebar-footer {
          position: relative;
          z-index: 1;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          justify-content: start;
          padding: 10px 24px 10px 24px;
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        :global(.brand-icon) {
          color: white;
          width: 24px;
          height: 24px;
        }

        .brand-text h1 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.02em;
          line-height: 1.1;
          margin: 0;
        }

        .brand-text span {
          font-size: 0.58rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          font-weight: 600;
          display: block;
          margin-top: 3px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 0 16px;
          overflow-y: auto;
        }

        .sidebar-nav ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin: 0;
          padding: 0;
        }

        :global(.nav-link) {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          color: #cbd5e1 !important;
          text-decoration: none !important;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
          position: relative;
        }

        :global(.nav-link:hover) {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff !important;
        }

        :global(.nav-link.active) {
          background: linear-gradient(90deg, #8b5cf6, #3b82f6);
          color: #ffffff !important;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        :global(.nav-icon) {
          width: 18px;
          height: 18px;
          color: #cbd5e1;
          transition: color 0.2s ease;
          flex-shrink: 0;
        }

        :global(.nav-link:hover .nav-icon) {
          color: #ffffff;
        }

        :global(.nav-link.active .nav-icon) {
          color: #ffffff;
        }

        .nav-text {
          text-decoration: none !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-footer {
          padding: 16px 20px 0 20px;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(10, 15, 40, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.2s;
          cursor: pointer;
        }

        .user-profile:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .profile-dropdown-menu {
          position: absolute;
          bottom: calc(100% + 12px);
          left: 0;
          right: 0;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          z-index: 50;
          animation: fade-in-up 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: transparent;
          border: none;
          color: #e2e8f0;
          font-size: 0.85rem;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .dropdown-item.logout {
          color: #fca5a5;
        }

        .dropdown-item.logout:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          color: #020617;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.1rem;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .user-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: #ffffff;
        }

        :global(.chevron) {
          color: #94a3b8;
        }

        .user-role {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 500;
          margin-top: 1px;
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
