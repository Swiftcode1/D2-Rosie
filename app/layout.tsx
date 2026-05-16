import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'D2-Rosie — Voice-first AI Concierge | Rosewood Sand Hill',
  description:
    'D2-Rosie is a voice-first AI hotel concierge planning realistic local itineraries for guests of Rosewood Sand Hill.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
