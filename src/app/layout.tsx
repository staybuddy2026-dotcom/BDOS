import type { Metadata } from 'next';
import '../styles/globals.css';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'BDOS - Business Development Operating System',
  description: 'AI-Powered Business Development Assistant for LinkedIn Search, Playbook Outreach & Client Engagement tracking.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">
            <div className="page-container animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
