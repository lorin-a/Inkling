import Link from "next/link";
import resources from "../../data/resources.json";
import Submit from "../../components/Submit";
import { listApprovedResources } from "../../lib/db/submissions";
import styles from "./page.module.css";

export const metadata = { title: "Resources — Moodbuilder" };
export const dynamic = "force-dynamic"; // approved community resources are live

/** Seed categories + any community-approved resources, merged by category. */
async function buildCategories() {
  const cats = resources.categories.map((c) => ({ ...c, items: [...c.items] }));
  let approved = [];
  try { approved = await listApprovedResources(); } catch { /* DB optional in dev */ }
  const byKey = Object.fromEntries(cats.map((c) => [c.key, c]));
  const extra = [];
  for (const item of approved) {
    const target = byKey[item.category];
    if (target) target.items.push({ name: item.name, url: item.url, note: item.note });
    else extra.push({ name: item.name, url: item.url, note: item.note });
  }
  if (extra.length) {
    cats.push({ key: "community", title: "More from the community", blurb: "Suggested and approved by other people using Moodbuilder.", items: extra });
  }
  return cats;
}

/**
 * A curated designer's toolkit: foundries, color tools, inspiration sources,
 * and accessibility references. Static and data-driven from
 * data/resources.json — a side utility, not a path step. Foundry entries
 * will later feed the Type-step directory.
 */
export default async function ResourcesPage() {
  const categories = await buildCategories();
  const hostOf = (url) => {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
  };

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <div className={styles.barTitle}>Resources</div>
      </header>

      <main className={styles.main}>
        <section className={styles.intro}>
          <h1 className={styles.title}>A designer&rsquo;s toolkit</h1>
          <p className={styles.lede}>
            The foundries, tools, and references worth keeping close &mdash; gathered
            in one place so taste, type, color, and access live together.
          </p>
          <Submit kind="resource" className={styles.suggestBtn} trigger="Suggest a resource" />
        </section>

        {categories.map((cat) => (
          <section key={cat.key} className={styles.category}>
            <header className={styles.categoryHead}>
              <h2 className={styles.categoryTitle}>{cat.title}</h2>
              {cat.blurb && <p className={styles.categoryBlurb}>{cat.blurb}</p>}
            </header>
            <ul className={styles.grid}>
              {cat.items.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.card}
                  >
                    <span className={styles.cardName}>
                      {item.name}
                      <span className={styles.cardArrow} aria-hidden="true">↗</span>
                    </span>
                    {item.note && <span className={styles.cardNote}>{item.note}</span>}
                    <span className={styles.cardHost}>{hostOf(item.url)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
