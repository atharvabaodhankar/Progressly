import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BridgeIQ | Intelligent Schedule Linking',
  description: 'Intelligent Data Capture & Schedule-Linking Layer for Infrastructure Projects',
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
