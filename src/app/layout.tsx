import type { Metadata } from 'next';
import '../styles/globals.css';

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
        {children}
      </body>
    </html>
  );
}
