"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const BOOKMARKLET = `javascript:(async()=>{const S=['[data-test-id="pin"]','[data-test-id="pinrep"]','[data-test-id="pinWrapper"]','[data-test-id="pin-visual-wrapper"]','div[data-test-id*="pin" i]','div[role="listitem"]','a[href^="/pin/"]'];const c=S.map(s=>({sel:s,count:document.querySelectorAll(s).length}));const b=c.reduce((a,x)=>x.count>a.count?x:a,c[0]);const t=document.querySelectorAll(b.sel);const samples=Array.from(t).slice(0,3).map((el,i)=>{const r=el.closest('[data-test-id]')||el;const da={};for(const a of r.attributes)if(a.name.startsWith('data-')||a.name==='role'||a.name==='aria-label')da[a.name]=a.value;const links=Array.from(r.querySelectorAll('a')).slice(0,8).map(a=>({href:a.href,isPinDetail:/\\/pin\\/\\d+/.test(a.pathname||''),isExternal:a.host&&a.host!==location.host,ariaLabel:a.getAttribute('aria-label'),text:(a.textContent||'').trim().slice(0,80)}));const imgs=Array.from(r.querySelectorAll('img')).slice(0,3).map(im=>({src:im.src,alt:im.alt,srcset:(im.srcset||'').slice(0,200),naturalWidth:im.naturalWidth}));return{idx:i,tag:r.tagName.toLowerCase(),dataAttrs:da,links,imgs,text:(r.textContent||'').trim().replace(/\\s+/g,' ').slice(0,240)}});const rep={url:location.href,timestamp:new Date().toISOString(),viewport:{w:innerWidth,h:innerHeight},selectorCounts:c,bestSelector:b,totalTilesFound:t.length,samples};const txt=JSON.stringify(rep,null,2);try{await navigator.clipboard.writeText(txt)}catch{}console.log('=== MOODBUILDER PROBE ===');console.log(txt);const bn=document.createElement('div');bn.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:999px;font:14px ui-sans-serif;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,.25)';bn.textContent='Moodbuilder probe: '+t.length+' tiles via '+b.sel+'. Copied to clipboard.';document.body.appendChild(bn);setTimeout(()=>bn.remove(),6000)})();`;

export default function ProbePage() {
  const ref = useRef(null);
  const [pasted, setPasted] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (ref.current) ref.current.setAttribute("href", BOOKMARKLET);
  }, []);

  async function copyBookmarklet() {
    try {
      await navigator.clipboard.writeText(BOOKMARKLET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>← Moodbuilder</Link>
        <div className={styles.barTitle}>Pinterest probe</div>
      </header>

      <main className={styles.main}>
        <section className={styles.step}>
          <span className={styles.stepNum}>1</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Show your bookmarks bar</h2>
            <p className={styles.stepText}>
              In Chrome: <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>B</kbd>. The bar appears under the address bar.
            </p>
          </div>
        </section>

        <section className={styles.step}>
          <span className={styles.stepNum}>2</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Drag this button to your bookmarks bar</h2>
            <p className={styles.stepText}>
              Click and hold the button below, drag it up to your bookmarks bar, and release. It will appear as a saved bookmark.
            </p>
            <div className={styles.dropArea}>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                ref={ref}
                href="#"
                className={styles.bookmarkBtn}
                onClick={(e) => e.preventDefault()}
                draggable="true"
              >
                ✦ Moodbuilder probe
              </a>
              <button
                type="button"
                className={styles.copyLink}
                onClick={copyBookmarklet}
                title="Copy the bookmarklet URL to your clipboard"
              >
                {copied ? "Copied" : "or copy URL"}
              </button>
            </div>
            <p className={styles.stepHint}>
              If dragging doesn’t work: click <em>or copy URL</em>, then right-click the bookmarks bar → Add page → paste as the URL and name it <em>Moodbuilder probe</em>.
            </p>
          </div>
        </section>

        <section className={styles.step}>
          <span className={styles.stepNum}>3</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Open your Whelm board</h2>
            <p className={styles.stepText}>
              Go to <a href="https://www.pinterest.com/lorinanderberg1/whelm/" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>pinterest.com/lorinanderberg1/whelm</a> and scroll down once so several pins are visible.
            </p>
          </div>
        </section>

        <section className={styles.step}>
          <span className={styles.stepNum}>4</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Click the bookmark</h2>
            <p className={styles.stepText}>
              A black pill will flash at the top of the Pinterest page confirming the report. The JSON is on your clipboard.
            </p>
          </div>
        </section>

        <section className={styles.step}>
          <span className={styles.stepNum}>5</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Paste the report</h2>
            <p className={styles.stepText}>
              Paste it into the box below. (Or send it back in chat — either way works.)
            </p>
            <textarea
              className={styles.paste}
              placeholder="Paste the JSON probe report here…"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              spellCheck="false"
            />
            <p className={styles.stepHint}>
              {pasted.length > 0
                ? `${pasted.length.toLocaleString()} characters received. Send the contents back in chat.`
                : "Waiting for paste…"}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
