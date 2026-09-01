import type { Metadata } from 'next';
import Link from 'next/link';

import { T } from '@/components/universe/T';
import { about, site } from '@/lib/copy';

export const metadata: Metadata = {
  title: 'What this is',
  description: about.paragraphs[0].sincere,
};

export default function AboutPage() {
  return (
    <article style={{ padding: 'clamp(40px, 7vw, 110px) var(--gutter) 0' }}>
      <h1 className="display max-w-[12ch] text-[clamp(44px,9vw,150px)]" style={{ ['--wdth' as string]: 112 }}>
        <T s={about.title.sincere} i={about.title.ironic} />
      </h1>

      <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,64ch)_1fr]">
        <div className="prose text-lg">
          {about.paragraphs.map((p, i) => (
            <T key={i} as="p" s={p.sincere} i={p.ironic} />
          ))}
          <p className="mono mt-10 max-w-[48ch] normal-case tracking-normal leading-relaxed text-mute">
            <T s={about.sizing.sincere} i={about.sizing.ironic} />
          </p>
        </div>

        <aside className="lg:pl-10 lg:border-l lg:border-line">
          <h2 className="display text-[clamp(24px,2.6vw,36px)]" style={{ ['--wdth' as string]: 125 }}>
            <T s={about.questionsHeading.sincere} i={about.questionsHeading.ironic} />
          </h2>
          <dl className="mt-6 flex flex-col">
            {about.questions.map((q, i) => (
              <div key={i} className="border-t border-line py-5">
                <dt className="text text-[18px] font-medium">
                  <T s={q.q.sincere} i={q.q.ironic} />
                </dt>
                <dd className="text mt-2 text-[16px] leading-relaxed text-mute">
                  <T s={q.a.sincere} i={q.a.ironic} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="mono mt-8 text-mute">
            <a href={site.parent.url} className="hover:underline underline-offset-4" rel="noopener">
              sixthwall.productions ↗
            </a>
            <span className="mx-3 opacity-40">/</span>
            <Link href="/#shop" className="hover:underline underline-offset-4">
              The clothes
            </Link>
          </p>
        </aside>
      </div>
    </article>
  );
}
