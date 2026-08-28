import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Progressly | Intelligent Schedule-Linking & Data Capture Layer',
  description: 'AI-driven data capture, automated schedule-linking, and institutional memory for capital infrastructure projects.',
  icons: {
    icon: '/progressly-logo.png',
    apple: '/progressly-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
