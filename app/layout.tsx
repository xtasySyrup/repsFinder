import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RepsFinder',
  description: 'Upload a clothing photo and find community QC photos instantly',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen antialiased">{children}</body>
    </html>
  )
}
