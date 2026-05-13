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
  return `Abstract: ${escapeHtml(pub.abstract)}`;
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
  if (abstract) parts.push(`  <p>${abstract}</p>`);
  parts.push('</article>');
  return parts.join('\n');
}

function renderWorkingPaper(paper) {
  return [
    '<article class="paper-card">',
    `  <h2>${renderTitleWithAuthors(paper)}</h2>`,
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

function renderNav(site, currentOutput) {
  return site.pages.map((page) => {
    const active = page.output === currentOutput ? ' class="active"' : '';
    return `        <a${active} href="${page.output}">${page.label}</a>`;
  }).join('\n');
}

function renderPage(site, template, page) {
  const main = page.source === 'research-data'
    ? renderResearchMain()
    : readText(page.source);

  const replacements = {
    pageTitle: `${site.siteTitle} | ${page.title}`,
    favicon: site.favicon,
    stylesheet: site.stylesheet,
    home: site.home,
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
