import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import styles from './post.module.css'

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
    const title = titleMatch ? `<div class="${styles.calloutTitle}">${escapeHtml(titleMatch[1])}</div>` : ''
    const bodyHtml = blockRender(body.trim())
    const icons: Record<string, string> = {
      note: '📝', insight: '💡', warning: '⚠️', keypoint: '🎯', quote: '💬', example: '📌'
    }
    const typeClass = `callout${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof styles
    const calloutClass = styles[typeClass] || styles.calloutInsight
    return `<div class="${styles.callout} ${calloutClass}">${icons[type] || '•'} ${title}${bodyHtml}</div>`
  }

  // ASCII/SVG diagrams: :::diagram
  const diagramMatch = trimmed.match(/^:::diagram\s*\n([\s\S]*?)^\s*:::$/m)
  if (diagramMatch) {
    const diagram = diagramMatch[1].trim()
    return `<div class="${styles.diagram}"><pre>${escapeHtml(diagram)}</pre></div>`
  }

  // Two-column layout: :::columns\n[left]\n[right]\n:::
  const columnsMatch = trimmed.match(/^:::columns\s*\n([\s\S]*?)---[\s\S]*?\n([\s\S]*?)^\s*:::$/m)
  if (columnsMatch) {
    return `<div class="${styles.columns}">
      <div class="${styles.col}">${blockRender(columnsMatch[1].trim())}</div>
      <div class="${styles.col}">${blockRender(columnsMatch[2].trim())}</div>
    </div>`
  }

  // Pull quotes: :::pullquote\ntext\n:::
  const pqMatch = trimmed.match(/^:::pullquote\s*\n([\s\S]*?)^\s*:::$/m)
  if (pqMatch) {
    const text = escapeHtml(pqMatch[1].trim())
    return `<div class="${styles.pullquote}"><p>${text}</p></div>`
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

  // Tables (pipe tables)
  if (/^\|.+\|/.test(trimmed)) {
    const rows = trimmed.split('\n').filter(l => /^\|/.test(l))
    const header = rows[0]
    if (rows.length > 1 && rows[1]?.includes('---')) {
      const headers = header.split('|').filter(c => c.trim()).map(c => `<th>${escapeHtml(c.trim())}</th>`).join('')
      const body = rows.slice(2).map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${inlineRender(c.trim())}</td>`).join('')
        return `<tr>${cells}</tr>`
      }).join('')
      return `<div class="${styles.tableWrap}"><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></div>`
    }
    if (rows.length > 1) {
      const headers = header.split('|').filter(c => c.trim()).map(c => `<th>${escapeHtml(c.trim())}</th>`).join('')
      const body = rows.slice(1).map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${inlineRender(c.trim())}</td>`).join('')
        return `<tr>${cells}</tr>`
      }).join('')
      return `<div class="${styles.tableWrap}"><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></div>`
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
    <div className={styles.postWrapper}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonString }}
      />
      <main className={styles.container}>
        <nav>
          <Link href="/" className={styles.back}>← Back to blog</Link>
        </nav>

        <article>
          <header>
            <div className={styles.articleMeta}>
              <time className={styles.articleDate}>{new Date(data.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</time>
              {data.tags?.length > 0 && (
                <div className={styles.tags}>
                  {data.tags.map((tag: string) => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <h1 className={styles.articleTitle}>{data.title}</h1>
            {data.excerpt && (
              <p className={styles.articleExcerpt}>{data.excerpt}</p>
            )}
          </header>

          <div
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </article>
      </main>
    </div>
  )
}
