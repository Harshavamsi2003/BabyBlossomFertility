// scripts/prerender.mjs
//
// WHY THIS EXISTS
// ----------------
// This is a plain client-rendered SPA (see src/main.jsx — ReactDOM.createRoot
// with no server-side rendering). The file Vercel actually serves at every
// URL is dist/index.html, which ships with an empty <div id="root"></div>;
// the real <title>/<meta description>/<h1> for each page only exist AFTER
// React mounts and the per-page <SEO> component (src/components/SEO.jsx)
// runs via react-helmet-async.
//
// Googlebot renders the JS before indexing, so it sees the final tags fine —
// confirmed by the correct title/description already showing in Google's
// results. Bing Webmaster Tools' on-page checker (and some other crawlers)
// reads the RAW served HTML instead, without executing JS, so it always sees
// zero <meta name="description"> and zero <h1> tags — hence "Meta Description
// tag missing" / "H1 tag missing", even though the page is indexed fine.
//
// This script runs after `vite build` and writes a physical, per-route
// index.html into dist/ with the correct tags already baked in — so a
// non-JS crawler sees them immediately, with no change to what a
// JS-rendering crawler (Google) or a real visitor sees.
//
// WHY THIS CAN'T CAUSE THE DUPLICATE-TAG BUG DESCRIBED IN SEO.jsx
// ------------------------------------------------------------------
// The earlier bug happened because a *static, generic* description/canonical
// sat in index.html permanently, and react-helmet-async's own tags landed
// ALONGSIDE it (Helmet only ever cleans up tags it previously inserted
// itself — it has no way to know about hand-written ones). Two routes then
// showed two different, competing descriptions at once.
//
// Here, main.jsx now strips exactly this set of tags (description/canonical/
// og:*) at the very top of the file, synchronously, before React ever mounts
// — so by the time Helmet inserts its own (correct, per-route) versions,
// the baked ones this script wrote are already gone. A crawler that runs no
// JS still sees this script's correct, per-route tags. A crawler or browser
// that does run JS ends up with exactly one of each tag, the same as today.
//
// The static <h1> this script inserts lives INSIDE <div id="root">, so it
// needs no such cleanup: ReactDOM.createRoot(...).render(...) fully replaces
// that div's contents as part of mounting, the same way it already does.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");
const templatePath = join(distDir, "index.html");

if (!existsSync(templatePath)) {
  console.error("[prerender] dist/index.html not found — run `vite build` first.");
  process.exit(1);
}

const SITE = "https://www.babyblossomfertility.in";

// Kept in sync with the <SEO .../> props on each page (src/pages/*.jsx) and
// each page's real <h1> text (src/components/Hero.jsx, src/pages/*.jsx).
// If you change a page's title, description or heading, update it here too.
const routes = [
  {
    path: "/",
    title: "Baby Blossom Naturopathy | Fertility & Wellness Clinic, Chennai",
    description:
      "Holistic, natural, evidence-based fertility care by Dr.C Vidya in Chennai — PMOS management, preconception care, yoga therapy and more.",
    h1: "Journey to motherhood",
  },
  {
    path: "/about-us",
    title: "About Us | Baby Blossom Naturopathy Fertility & Wellness Clinic",
    description:
      "Learn about Baby Blossom Naturopathy Fertility & Wellness Clinic, Chennai — our mission, our root-cause approach and why families trust us for natural, holistic fertility care.",
    h1: "Nurturing Life, Naturally",
  },
  {
    path: "/founder",
    title: "Founder — Dr.C Vidya | Baby Blossom Naturopathy",
    description:
      "Meet Dr.C Vidya (BNYS, DVMS, MPH, MS) — naturopath, women's wellness expert and fertility specialist, and the founder of Baby Blossom Naturopathy Fertility & Wellness Clinic, Chennai.",
    h1: "Dr.C Vidya — BNYS, DVMS, MPH, MS",
  },
  {
    path: "/treatments",
    title: "Naturopathy Treatments | Baby Blossom Fertility & Wellness Clinic",
    description:
      "Explore our nine natural, evidence-based naturopathy treatments — hydrotherapy, acupuncture, acupressure, magnetotherapy, massage, chromotherapy, yoga, diet and fasting — for fertility and holistic wellness.",
    h1: "Nurturing Natural Healing, Restoring Balance",
  },
];

const template = readFileSync(templatePath, "utf8");

// Escape values that go into HTML attributes.
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

for (const { path, title, description, h1 } of routes) {
  const url = `${SITE}${path}`;

  let html = template;

  // 1) <title> — every route already has the right one hand-written in
  //    index.html for "/"; for the others, swap the generic title for the
  //    route's real one.
  html = html.replace(/<title>.*?<\/title>/s, `<title>${esc(title)}</title>`);

  // 2) Insert description/canonical/OG tags right after the static
  //    <meta name="author" .../> line, matching the tag set SEO.jsx renders
  //    (minus robots/noindex, since every prerendered route here is indexable).
  const seoTags =
    `\n    <meta name="description" content="${esc(description)}" />` +
    `\n    <link rel="canonical" href="${esc(url)}" />` +
    `\n    <meta property="og:title" content="${esc(title)}" />` +
    `\n    <meta property="og:description" content="${esc(description)}" />` +
    `\n    <meta property="og:url" content="${esc(url)}" />`;
  html = html.replace(
    /(<meta name="author"[^>]*\/>)/,
    `$1${seoTags}`
  );

  // 3) A real, visually-hidden <h1> inside #root — replaced the instant
  //    React mounts, so it's invisible to real visitors and to any
  //    JS-rendering crawler, but present for a raw-HTML-only check.
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"><h1 style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">${esc(
      h1
    )}</h1></div>`
  );

  const outDir = path === "/" ? distDir : join(distDir, path.slice(1));
  const outPath = join(outDir, "index.html");
  if (path !== "/") mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, html);
  console.log(`[prerender] wrote ${outPath.replace(distDir, "dist")}`);
}
