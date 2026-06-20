import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

const SITE_URL = 'https://bloghermes.vercel.app'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const filePath = path.join(process.cwd(), 'posts', `${slug}.md`)
  if (!fs.existsSync(filePath)) return {}
  const { data } = matter(fs.readFileSync(filePath, 'utf8'))
  const title = data.title || slug
  const description = data.excerpt || ''
  const url = `${SITE_URL}/posts/${slug}`

  return {
    title,
    description,
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      publishedTime: data.date,
      tags: data.tags,
      siteName: 'Zynna Blog',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: {
      canonical: url,
      types: {
        'application/rss+xml': `${SITE_URL}/feed.xml`,
      },
    },
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Block-level renderers ───────────────────────────────────────────────────

function renderBlock(trimmed: string): string {
  // Custom callouts: :::callout[type]{title="..."}
  const calloutMatch = trimmed.match(/^:::callout\[(\w+)\](?:\{([^}]+)\})?$([\s\S]*?)^\s*:::$/m)
  if (calloutMatch) {
    const [, type, attrs, body] = calloutMatch
    const titleMatch = attrs?.match(/title="([^"]+)"/)
    const title = titleMatch ? `<div class="callout-title">${escapeHtml(titleMatch[1])}</div>` : ''
    const bodyHtml = blockRender(body.trim())
    const icons: Record<string, string> = {
      note: '📝', insight: '💡', warning: '⚠️', keypoint: '🎯', quote: '💬', example: '📌'
    }
    return `<div class="callout callout-${type}">${icons[type] || '•'} ${title}${bodyHtml}</div>`
  }

  // ASCII/SVG diagrams: :::diagram
  const diagramMatch = trimmed.match(/^:::diagram\s*\n([\s\S]*?)^\s*:::$/m)
  if (diagramMatch) {
    const diagram = diagramMatch[1].trim()
    return `<div class="diagram"><pre>${escapeHtml(diagram)}</pre></div>`
  }

  // Two-column layout: :::columns\n[left]\n[right]\n:::
  const columnsMatch = trimmed.match(/^:::columns\s*\n([\s\S]*?)---[\s\S]*?\n([\s\S]*?)^\s*:::$/m)
  if (columnsMatch) {
    return `<div class="columns">
      <div class="col">${blockRender(columnsMatch[1].trim())}</div>
      <div class="col">${blockRender(columnsMatch[2].trim())}</div>
    </div>`
  }

  // Pull quotes: :::pullquote\ntext\n:::
  const pqMatch = trimmed.match(/^:::pullquote\s*\n([\s\S]*?)^\s*:::$/m)
  if (pqMatch) {
    const text = escapeHtml(pqMatch[1].trim())
    return `<div class="pullquote"><p>${text}</p></div>`
  }

  // Headings
  if (trimmed.startsWith('### ')) return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`
  if (trimmed.startsWith('## ')) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`
  if (trimmed.startsWith('# ')) return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`

  // Blockquotes
  if (trimmed.startsWith('> ')) {
    const lines = trimmed.split('\n').map(l => l.replace(/^> /, '')).join(' ')
    return `<blockquote>${inlineRender(lines)}</blockquote>`
  }

  // Horizontal rules
  if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) return '<hr>'

  // Unordered lists
  if (/^[-*] /.test(trimmed)) {
    const items = trimmed.split('\n')
      .filter(l => /^[-*] /.test(l))
      .map(l => `<li>${inlineRender(l.replace(/^[-*] /, ''))}</li>`)
      .join('')
    return `<ul>${items}</ul>`
  }

  // Ordered lists
  if (/^\d+\. /.test(trimmed)) {
    const items = trimmed.split('\n')
      .filter(l => /^\d+\. /.test(l))
      .map(l => `<li>${inlineRender(l.replace(/^\d+\. /, ''))}</li>`)
      .join('')
    return `<ol>${items}</ol>`
  }

  // Tables (simple pipe tables)
  if (/^\|.+\|/.test(trimmed)) {
    const rows = trimmed.split('\n').filter(l => /^\|/.test(l))
    const header = rows[0]
    if (rows.length > 1 && !rows[1].includes('---')) {
      const headers = header.split('|').filter(c => c.trim()).map(c => `<th>${escapeHtml(c.trim())}</th>`).join('')
      const body = rows.slice(2).map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${inlineRender(c.trim())}</td>`).join('')
        return `<tr>${cells}</tr>`
      }).join('')
      return `<div class="table-wrap"><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></div>`
    }
    if (rows[1]?.includes('---')) {
      const headers = header.split('|').filter(c => c.trim()).map(c => `<th>${escapeHtml(c.trim())}</th>`).join('')
      const body = rows.slice(2).map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${inlineRender(c.trim())}</td>`).join('')
        return `<tr>${cells}</tr>`
      }).join('')
      return `<div class="table-wrap"><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></div>`
    }
  }

  // Paragraph
  return `<p>${inlineRender(trimmed)}</p>`
}

function blockRender(content: string): string {
  return content.split(/\n{2,}/).map(b => renderBlock(b.trim())).filter(Boolean).join('\n')
}

function inlineRender(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/!\[(.*?)\]\((.+?)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\n/g, ' ')
}

function renderMarkdown(content: string): string {
  return blockRender(content)
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params
  const postsDirectory = path.join(process.cwd(), 'posts')
  const filePath = path.join(postsDirectory, `${slug}.md`)

  if (!fs.existsSync(filePath)) {
    notFound()
  }

  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)
  const htmlContent = renderMarkdown(content)

  const siteUrl = SITE_URL
  const postUrl = `${siteUrl}/posts/${slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title || slug,
    description: data.excerpt || '',
    datePublished: data.date,
    dateModified: data.date,
    url: postUrl,
    publisher: {
      '@type': 'Organization',
      name: 'Zynna Blog',
      url: siteUrl,
    },
    keywords: data.tags ? data.tags.join(', ') : '',
    author: {
      '@type': 'Person',
      name: 'Jordanov',
      url: siteUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
  }

  const jsonString = JSON.stringify(jsonLd)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonString }}
      />
      <main className="container">
        <nav>
          <Link href="/" className="back">← Back to blog</Link>
        </nav>

        <article>
          <header>
            <div className="article-meta">
              <time className="article-date">{new Date(data.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</time>
              {data.tags?.length > 0 && (
                <div className="tags">
                  {data.tags.map((tag: string) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <h1 className="article-title">{data.title}</h1>
            {data.excerpt && (
              <p className="article-excerpt">{data.excerpt}</p>
            )}
          </header>

          <div
            className="content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </article>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
          --bg: #0a0a0f;
          --bg-card: #111118;
          --bg-card-hover: #16161f;
          --text: #e8e8ec;
          --text-muted: #71717a;
          --accent: #a855f7;
          --accent-hover: #c084fc;
          --border: #27272a;
          --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          --font-display: 'Playfair Display', Georgia, 'Times New Roman', serif;
          --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
        }

        * { box-sizing: border-box; }

        body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }

        .container {
          max-width: 780px;
          margin: 0 auto;
          padding: 3rem 2rem 5rem;
        }

        nav { margin-bottom: 3rem; }
        .back {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          letter-spacing: 0.01em;
          transition: color 0.2s;
        }
        .back:hover { color: var(--accent); }

        /* ── Article Header ── */
        .article-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }
        .article-date {
          color: var(--text-muted);
          font-size: 0.875rem;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        .tags { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .tag {
          background: rgba(168, 85, 247, 0.12);
          color: var(--accent);
          padding: 0.2rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .article-title {
          font-family: var(--font-display);
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 700;
          line-height: 1.15;
          margin: 0 0 1.25rem;
          letter-spacing: -0.02em;
          color: #ffffff;
        }

        .article-excerpt {
          font-size: 1.2rem;
          line-height: 1.7;
          color: var(--text-muted);
          margin: 0 0 2.5rem;
          font-weight: 400;
          border-top: 1px solid var(--border);
          padding-top: 2rem;
        }

        /* ── Body Content ── */
        .content {
          font-size: 1.125rem;
          line-height: 1.85;
          color: var(--text);
        }

        .content p {
          margin: 0 0 1.5rem;
        }
        .content p:last-child { margin-bottom: 0; }

        .content strong { font-weight: 700; color: #ffffff; }
        .content em { font-style: italic; }
        .content code {
          background: var(--bg-card);
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          font-size: 0.85em;
          font-family: var(--font-mono);
          color: var(--accent-hover);
          border: 1px solid var(--border);
        }
        .content a { color: var(--accent); text-decoration: none; }
        .content a:hover { text-decoration: underline; }

        /* ── Headings ── */
        .content h2 {
          font-family: var(--font-display);
          font-size: clamp(1.5rem, 3vw, 1.875rem);
          font-weight: 700;
          line-height: 1.25;
          margin: 3.5rem 0 1.25rem;
          letter-spacing: -0.015em;
          color: #ffffff;
          padding-top: 1rem;
        }
        .content h2::before {
          content: '';
          display: block;
          width: 2.5rem;
          height: 3px;
          background: linear-gradient(90deg, var(--accent), transparent);
          margin-bottom: 1.5rem;
          border-radius: 2px;
        }
        .content h3 {
          font-family: var(--font-body);
          font-size: 1.2rem;
          font-weight: 700;
          margin: 2.5rem 0 0.875rem;
          color: var(--accent-hover);
          letter-spacing: -0.01em;
        }

        /* ── Lists ── */
        .content ul, .content ol {
          margin: 1rem 0 1.75rem;
          padding-left: 1.75rem;
        }
        .content ul { list-style: none; }
        .content ul li::before {
          content: '→';
          color: var(--accent);
          font-weight: 700;
          display: inline-block;
          width: 1.75rem;
          margin-left: -1.75rem;
        }
        .content ol { list-style: decimal; }
        .content li {
          margin-bottom: 0.6rem;
          padding-left: 0.25rem;
          line-height: 1.75;
        }

        /* ── Blockquotes / Pull Quotes ── */
        .content blockquote {
          font-family: var(--font-display);
          font-size: 1.3rem;
          font-style: italic;
          font-weight: 400;
          line-height: 1.6;
          color: #d4d4d8;
          border-left: 3px solid var(--accent);
          margin: 2.5rem 0;
          padding: 1.25rem 1.75rem;
          background: linear-gradient(135deg, rgba(168,85,247,0.06) 0%, rgba(168,85,247,0.02) 100%);
          border-radius: 0 12px 12px 0;
          position: relative;
        }
        .content blockquote strong {
          color: var(--accent-hover);
          font-style: normal;
        }

        /* Full-width pull quotes (:::pullquote) */
        .content .pullquote {
          font-family: var(--font-display);
          font-size: clamp(1.4rem, 3vw, 1.875rem);
          font-style: italic;
          font-weight: 600;
          line-height: 1.45;
          color: #ffffff;
          text-align: center;
          margin: 3rem -2rem;
          padding: 2.5rem 3rem;
          background: linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(168,85,247,0.04) 100%);
          border-top: 1px solid rgba(168,85,247,0.3);
          border-bottom: 1px solid rgba(168,85,247,0.3);
          letter-spacing: -0.01em;
        }
        .content .pullquote p { margin: 0; }
        .content .pullquote::before,
        .content .pullquote::after {
          font-size: 3rem;
          color: var(--accent);
          opacity: 0.4;
          line-height: 0;
          vertical-align: middle;
        }

        .content hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 3rem 0;
        }

        /* ── Tables ── */
        .content .table-wrap {
          overflow-x: auto;
          margin: 2rem 0;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-card);
        }
        .content table {
          width: 100%;
          border-collapse: collapse;
          font-size: 1rem;
        }
        .content th {
          background: rgba(168, 85, 247, 0.08);
          padding: 0.875rem 1.25rem;
          text-align: left;
          font-weight: 700;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--accent-hover);
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .content td {
          padding: 0.875rem 1.25rem;
          border-bottom: 1px solid var(--border);
          vertical-align: top;
          font-size: 1rem;
          line-height: 1.6;
        }
        .content tr:last-child td { border-bottom: none; }
        .content tr:hover td { background: rgba(168, 85, 247, 0.04); }

        /* ── Callouts ── */
        .content .callout {
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          margin: 2rem 0;
          font-size: 1.05rem;
        }
        .content .callout-title {
          font-weight: 800;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.5rem;
          font-family: var(--font-body);
        }
        .content .callout-note { background: rgba(59, 130, 246, 0.08); border-left: 4px solid #3b82f6; }
        .content .callout-insight { background: rgba(168, 85, 247, 0.08); border-left: 4px solid var(--accent); }
        .content .callout-warning { background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b; }
        .content .callout-keypoint { background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981; }
        .content .callout-quote { background: rgba(236, 72, 153, 0.08); border-left: 4px solid #ec4899; }
        .content .callout-example { background: rgba(139, 92, 246, 0.08); border-left: 4px solid #8b5cf6; }
        .content .callout p { margin: 0.25rem 0 0; }
        .content .callout strong { color: inherit; }

        /* ── ASCII Diagrams ── */
        .content .diagram {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          margin: 2rem 0;
          overflow-x: auto;
        }
        .content .diagram pre {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 0.825rem;
          line-height: 1.55;
          color: var(--accent-hover);
          white-space: pre;
        }

        /* ── Two-column layout ── */
        .content .columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin: 2rem 0;
        }
        .content .columns .col {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
        }
        .content .columns .col p { margin: 0 0 0.5rem; font-size: 1.05rem; }
        .content .columns .col h3 { margin: 0 0 0.75rem; font-size: 1rem; }

        /* ── Images ── */
        .content img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 2rem 0;
          border: 1px solid var(--border);
        }

        @media (max-width: 600px) {
          .container { padding: 2rem 1.25rem 4rem; }
          .content .columns { grid-template-columns: 1fr; }
          .content .pullquote { margin: 2.5rem -1.25rem; padding: 1.75rem 1.5rem; }
          .content blockquote { font-size: 1.15rem; padding: 1rem 1.25rem; }
        }
      `}</style>
      </main>
    </>
  )
}
