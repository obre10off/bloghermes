import type { Metadata } from 'next'
import './globals.css'

const SITE_URL = 'https://bloghermes.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Zynna Blog',
    template: '%s | Zynna Blog',
  },
  description: 'Insights and ideas from conversations about AI, startups, and building.',
  openGraph: {
    type: 'website',
    siteName: 'Zynna Blog',
    title: 'Zynna Blog',
    description: 'Insights and ideas from conversations about AI, startups, and building.',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary',
    title: 'Zynna Blog',
    description: 'Insights and ideas from conversations about AI, startups, and building.',
  },
  alternates: {
    canonical: SITE_URL,
    types: {
      'application/rss+xml': `${SITE_URL}/feed.xml`,
    },
  },
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
