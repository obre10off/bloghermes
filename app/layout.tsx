import type { Metadata } from 'next'
import './globals.css'
import ThemeToggle from './components/ThemeToggle'

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

// Inline script to set theme before paint — prevents flash of wrong theme
const themeScript = `
(function() {
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch(e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="topbar">
          <a href="/" className="logo">Zynna Blog</a>
          <ThemeToggle />
        </div>
        {children}
        <style>{`
          .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            max-width: 720px;
            margin: 0 auto;
            padding: 1.25rem 1.5rem 0;
          }
          .logo {
            font-size: 1rem;
            font-weight: 700;
            color: var(--text);
            text-decoration: none;
            letter-spacing: -0.01em;
          }
          .logo:hover { color: var(--accent); }
          @media (max-width: 600px) {
            .topbar { padding: 1rem 1.25rem 0; }
          }
        `}</style>
      </body>
    </html>
  )
}
