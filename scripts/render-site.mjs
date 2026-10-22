import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

function readText(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function writeText(relativePath, content) {
  writeFileSync(join(root, relativePath), content);
}

function indent(text, spaces = 4) {
  const pad = ' '.repeat(spaces);
  return text.trim().split('\n').map((line) => line ? `${pad}${line}` : line).join('\n');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttr(value = '') {
  return escapeHtml(value).replaceAll('"', '&quot;');
}

function joinUrl(base = '', path = '') {
  if (!base) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function joinAuthors(authors = []) {
  if (!authors.length) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
  return `${authors.slice(0, -1).join(', ')}, and ${authors.at(-1)}`;
}

function renderTitle(value = '') {
  const title = String(value).trim();
  const alreadyQuoted = title.startsWith('"') || title.startsWith('“');
  return escapeHtml(alreadyQuoted ? title : `"${title}"`);
}

function renderTitleWithAuthors(item) {
  // Backward compatibility for older HTML-shaped data.
  if (item.titleHtml) return item.titleHtml;

  const title = renderTitle(item.title);
  const authors = joinAuthors(item.authors || []);
  return authors ? `${title} with ${escapeHtml(authors)}` : title;
}

function renderLink(link) {
  return `<a href="${escapeAttr(link.url)}">${escapeHtml(link.label || link.text)}</a>`;
}

function renderInlineMarkdownLinks(value = '') {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let html = '';
  let lastIndex = 0;
  for (const match of String(value).matchAll(pattern)) {
    html += escapeHtml(String(value).slice(lastIndex, match.index));
    html += `<a href="${escapeAttr(match[2])}">${escapeHtml(match[1])}</a>`;
    lastIndex = match.index + match[0].length;
  }
  html += escapeHtml(String(value).slice(lastIndex));
  return html;
}

function renderPublicationLine(pub) {
  // Backward compatibility for older HTML-shaped data.
  if (pub.publicationHtml) return pub.publicationHtml;

  const pieces = [];
  if (pub.publication?.text) {
    pieces.push(pub.publication.url
      ? renderLink({ label: pub.publication.text, url: pub.publication.url })
      : escapeHtml(pub.publication.text));
  }
  if (pub.links?.length) pieces.push(...pub.links.map(renderLink));
  return pieces.join(' ');
}

function renderNotes(pub) {
  // Backward compatibility for older HTML-shaped data.
  const notes = pub.notes || pub.notesHtml || [];
  if (!notes.length) return '';
  const renderNote = pub.notes
    ? (note) => renderInlineMarkdownLinks(note)
    : (note) => note;
  return [
    '  <ul>',
    ...notes.map((note) => `    <li>${renderNote(note)}</li>`),
    '  </ul>'
  ].join('\n');
}

function renderAbstract(pub) {
  if (pub.abstractHtml) return pub.abstractHtml;
  if (!pub.abstract) return '';
  return [
    '<details class="abstract">',
    '  <summary><span class="abstract-toggle-show">Read abstract</span><span class="abstract-toggle-hide">Hide abstract</span></summary>',
    `  <p><strong class="abstract-label">Abstract:</strong> ${escapeHtml(pub.abstract)}</p>`,
    '</details>'
  ].join('\n');
}

function renderPublication(pub, index) {
  const parts = [
    '<article class="paper-card">',
    `  <h2>${index + 1}. ${renderTitleWithAuthors(pub)}</h2>`
  ];

  const publicationLine = renderPublicationLine(pub);
  const abstract = renderAbstract(pub);
  if (publicationLine) parts.push(`  <p>${publicationLine}</p>`);
  if (pub.notes?.length || pub.notesHtml?.length) parts.push(renderNotes(pub));
  if (abstract) {
    // Backward compat: legacy abstractHtml is a plain text fragment, wrap in <p>.
    if (pub.abstractHtml) parts.push(`  <p>${abstract}</p>`);
    else parts.push(indent(abstract, 2));
  }
  parts.push('</article>');
  return parts.join('\n');
}

function renderWorkingPaper(paper) {
  return [
    '<article class="paper-card">',
    `  <h2>${renderTitleWithAuthors(paper)}</h2>`,
    ...(paper.notes?.length ? [renderNotes(paper)] : []),
    '</article>'
  ].join('\n');
}

function renderResearchMain() {
  const publications = readJson('data/publications.json');
  const workingPapers = readJson('data/working-papers.json');

  return `
<section class="section-shell page-title">
  <h1>PUBLICATIONS AND ACCEPTED PAPERS</h1>
</section>

<section class="section-shell research-list">
  ${publications.map(renderPublication).join('\n\n  ')}
</section>

<section class="section-shell page-title working-title">
  <h1>SELECTED WORKING PAPERS</h1>
</section>

<section class="section-shell research-list working-papers-list">
  ${workingPapers.map(renderWorkingPaper).join('\n  ')}
</section>
`.trim();
}

// The home page is served at the site root, so link and canonicalize it as
// "/" rather than "/index.html". One URL per page keeps search engines from
// splitting signals between two addresses for the same page.
function isHomeOutput(output) {
  return output === 'index.html';
}

function linkHref(output) {
  return isHomeOutput(output) ? './' : output;
}

function pageUrl(site, output) {
  const base = site.siteUrl || '';
  if (isHomeOutput(output)) return base.endsWith('/') ? base : `${base}/`;
  return joinUrl(base, output);
}

function renderStructuredData(site, page) {
  const person = site.person;
  if (!person || !isHomeOutput(page.output)) return '';

  const homeUrl = pageUrl(site, page.output);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: homeUrl,
    mainEntity: {
      '@type': 'Person',
      '@id': `${homeUrl}#person`,
      name: person.name,
      url: homeUrl,
      ...(person.image ? { image: joinUrl(site.siteUrl || '', person.image) } : {}),
      ...(person.email ? { email: `mailto:${person.email}` } : {}),
      ...(person.jobTitle ? { jobTitle: person.jobTitle } : {}),
      ...(person.affiliation ? {
        worksFor: {
          '@type': 'CollegeOrUniversity',
          name: person.affiliation,
          ...(person.affiliationUrl ? { url: person.affiliationUrl } : {}),
          ...(person.department ? { department: { '@type': 'Organization', name: person.department } } : {})
        }
      } : {}),
      ...(person.alumniOf?.length ? {
        alumniOf: person.alumniOf.map((name) => ({ '@type': 'CollegeOrUniversity', name }))
      } : {}),
      ...(person.knowsAbout?.length ? { knowsAbout: person.knowsAbout } : {}),
      ...(person.sameAs?.length ? { sameAs: person.sameAs } : {})
    }
  };

  // Escape "<" so nothing inside the JSON can close the script tag early.
  const json = JSON.stringify(data, null, 2).replaceAll('<', '\\u003c');
  return `\n  <script type="application/ld+json">\n${indent(json, 2)}\n  </script>\n`;
}

function renderSitemap(site) {
  const urls = site.pages.map((page) => [
    '  <url>',
    `    <loc>${escapeHtml(pageUrl(site, page.output))}</loc>`,
    '  </url>'
  ].join('\n'));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    ''
  ].join('\n');
}

function renderRobots(site) {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${joinUrl(site.siteUrl || '', 'sitemap.xml')}`,
    ''
  ].join('\n');
}

function renderNav(site, currentOutput) {
  return site.pages.map((page) => {
    const active = page.output === currentOutput ? ' class="active"' : '';
    return `        <a${active} href="${linkHref(page.output)}">${page.label}</a>`;
  }).join('\n');
}

function renderPage(site, template, page) {
  const main = page.source === 'research-data'
    ? renderResearchMain()
    : readText(page.source);

  const description = page.description || site.defaultDescription || '';
  const canonicalUrl = pageUrl(site, page.output);
  const ogImageUrl = joinUrl(site.siteUrl || '', site.ogImage || '');

  const replacements = {
    pageTitle: `${site.siteTitle} | ${page.title}`,
    description: escapeAttr(description),
    canonicalUrl: escapeAttr(canonicalUrl),
    ogImageUrl: escapeAttr(ogImageUrl),
    favicon: site.favicon,
    stylesheet: site.stylesheet,
    home: linkHref(site.home),
    structuredData: renderStructuredData(site, page),
    brand: site.brand,
    brandMark: site.brandMark,
    nav: renderNav(site, page.output),
    main: indent(main)
  };

  let html = template;
  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

const site = readJson('data/site.json');
const template = readText('templates/page.html');

for (const page of site.pages) {
  writeText(page.output, renderPage(site, template, page));
  console.log(`Rendered ${page.output}`);
}

writeText('sitemap.xml', renderSitemap(site));
console.log('Rendered sitemap.xml');
writeText('robots.txt', renderRobots(site));
console.log('Rendered robots.txt');
