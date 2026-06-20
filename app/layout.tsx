import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zynna Blog',
  description: 'Insights and ideas from conversations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
