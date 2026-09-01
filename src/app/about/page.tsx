import type { Metadata } from 'next';
import Link from 'next/link';

import { T } from '@/components/universe/T';
import { about, site } from '@/lib/copy';

export const metadata: Metadata = {
  // The closing line, not the opening one. A description is read stripped of
  // the page around it — in a search result, in a link preview — and the
  // first paragraph does not survive that.
  description: about.paragraphs[about.paragraphs.length - 1].sincere,
  title: 'About',
};

export default function AboutPage() {
  return (
    <article style={{ padding: 'clamp(40px, 7vw, 110px) var(--gutter) 0' }}>
      <h1 className="display text-[clamp(44px,9vw,150px)]" style={{ ['--wdth' as string]: 118 }}>
        <T s={about.title.sincere} i={about.title.ironic} />
      </h1>

      <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,60ch)_1fr]">
        <div className="prose text-lg">
          {about.paragraphs.map((p, i) => (
            <T
              key={i}
              as="p"
              s={p.sincere}
              i={p.ironic}
              // The opening sets the terms, so it is allowed to be louder
              // than what follows; the last line is a fact about who we are
              // and steps back down to the register of a colophon.
              className={
                i === 0
                  ? 'prose__lead'
                  : i === about.paragraphs.length - 1
                    ? 'mono mt-10 normal-case leading-relaxed tracking-normal text-mute'
                    : undefined
              }
            />
          ))}
          <p className="mono mt-6 max-w-[48ch] normal-case leading-relaxed tracking-normal text-mute">
            <T s={about.sizing.sincere} i={about.sizing.ironic} />
          </p>
        </div>

        <aside className="lg:border-l lg:border-line lg:pl-10">
          <h2 className="display text-[clamp(24px,2.6vw,36px)]" style={{ ['--wdth' as string]: 125 }}>
            <T s={about.questionsHeading.sincere} i={about.questionsHeading.ironic} />
          </h2>
          {/* The answers are the content here, so they carry the weight and
              the questions step back. A one-word answer set small and grey
              reads as a footnote to itself. */}
          <dl className="mt-6 flex flex-col">
            {about.questions.map((q, i) => (
              <div key={i} className="border-t border-line py-6">
                <dt className="mono text-mute">{q.q}</dt>
                <dd
                  className="display mt-3 text-[clamp(28px,3.4vw,44px)] leading-[1.05]"
                  style={{ ['--wdth' as string]: 120 }}
                >
                  <T s={q.a.sincere} i={q.a.ironic} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="mono mt-8 text-mute">
            <a href={site.parent.url} className="hover:underline underline-offset-4" rel="noopener">
              {site.parent.name} ↗
            </a>
            <span className="mx-3 opacity-40">/</span>
            <Link href="/#shop" className="hover:underline underline-offset-4">
              Shop
            </Link>
          </p>
        </aside>
      </div>
    </article>
  );
}
