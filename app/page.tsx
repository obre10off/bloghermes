import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'

const postsDirectory = path.join(process.cwd(), 'posts')

export default function Home() {
  // Get all posts, sorted by date (newest first)
  const files = fs.readdirSync(postsDirectory)
  const posts = files
    .filter(file => file.endsWith('.md'))
    .map(fileName => {
      const filePath = path.join(postsDirectory, fileName)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const { data } = matter(fileContents)
      return {
        slug: fileName.replace(/\.md$/, ''),
        title: data.title,
        date: data.date,
        excerpt: data.excerpt || '',
        tags: data.tags || [],
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <main className="container">
      <header>
        <h1>Zynna Blog</h1>
        <p className="subtitle">Insights from conversations</p>
      </header>

      <div className="posts">
        {posts.length === 0 ? (
          <p className="empty">No posts yet.</p>
        ) : (
          posts.map((post) => (
            <article key={post.slug} className="post-card">
              <Link href={`/posts/${post.slug}`}>
                <h2>{post.title}</h2>
              </Link>
              <div className="post-meta">
                <time>{new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</time>
                {post.tags.length > 0 && (
                  <div className="tags">
                    {post.tags.map((tag: string) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              {post.excerpt && <p className="excerpt">{post.excerpt}</p>}
            </article>
          ))
        )}
      </div>

      <style>{`
        .container {
          max-width: 720px;
          margin: 0 auto;
          padding: 2rem 1.5rem 5rem;
        }

        header {
          margin-bottom: 3rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--border);
        }

        h1 {
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text);
        }

        .subtitle {
          color: var(--text-muted);
          margin-top: 0.5rem;
        }

        .posts { display: flex; flex-direction: column; gap: 2rem; }

        .post-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
        }

        .post-card:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(168, 85, 247, 0.08);
        }

        .post-card h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--text);
          transition: color 0.2s;
        }

        .post-card a {
          color: inherit;
          text-decoration: none;
        }

        .post-card a:hover h2 { color: var(--accent); }

        .post-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        time { color: var(--text-muted); font-size: 0.875rem; }

        .tags { display: flex; gap: 0.5rem; flex-wrap: wrap; }

        .tag {
          background: rgba(168, 85, 247, 0.1);
          color: var(--accent);
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .excerpt { color: var(--text-muted); font-size: 0.9375rem; }

        .empty { color: var(--text-muted); text-align: center; padding: 3rem 0; }

        @media (max-width: 600px) {
          .container { padding: 1.5rem 1.25rem 4rem; }
          h1 { font-size: 2rem; }
        }
      `}</style>
    </main>
  )
}
