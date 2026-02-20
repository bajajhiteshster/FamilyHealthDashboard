import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BloodTrack — Family Health Dashboard',
  description: 'Track blood report trends for your whole family',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
