# Antonis Kartapanis static website

This is a small template-driven static academic website. Shared layout lives in `templates/page.html`, shared visual design lives in `styles.css`, top-level page/navigation metadata lives in `data/site.json`, and editable page bodies live in `content/`.

Generated HTML files (`index.html`, `research.html`, `biography.html`, and `cv.html`) are still checked in so the site remains easy to preview, host, and read without client-side JavaScript.

## Maintenance quick reference

- Edit normal page content in `content/*.html`.
- Edit the page list, browser titles, and navigation order in `data/site.json`.
- Edit publications in `data/publications.json`.
- Edit working papers in `data/working-papers.json`.
- Run `node scripts/render-site.mjs` after any of those changes.
- Commit both the source files you changed and the regenerated HTML files.

In general, avoid hand-editing generated pages such as `index.html`, `research.html`, `biography.html`, and `cv.html` directly. Those files are overwritten by the generator. Make the change in `content/`, `data/`, or `templates/` instead, then regenerate.

## Preview locally

```bash
cd website-modern
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Regenerate the site

After changing page content, navigation, or research data, run this from the `website-modern` folder:

```bash
node scripts/render-site.mjs
```

Then preview the site locally and commit the changed source files plus the regenerated HTML files.

## Add a new page later

The site is designed so new pages are easy to add without copying the header, footer, favicon, or navigation by hand. New pages are controlled by two files:

- a content fragment in `content/`
- a page entry in `data/site.json`

## Add a new page

1. Create a content fragment in `content/`, for example `content/teaching.html`:

```html
<section class="section-shell page-title">
  <h1>Teaching</h1>
</section>

<section class="section-shell research-list">
  <article class="paper-card">
    <h2>Course title</h2>
    <p>Course details.</p>
  </article>
</section>
```

2. Add the page to `data/site.json`:

```json
{
  "label": "Teaching",
  "title": "Teaching",
  "output": "teaching.html",
  "source": "content/teaching.html"
}
```

3. Regenerate:

```bash
node scripts/render-site.mjs
```

The navigation and browser title will update automatically across every page. The generated page title will follow:

```text
Antonis Kartapanis | Teaching
```

The page will also automatically get the shared favicon, header, footer, typography, and card styling from the template and stylesheet.

## Updating publications and working papers

Research-page paper data is stored in JSON:

- `data/publications.json`
- `data/working-papers.json`

After editing either JSON file, regenerate the site with:

```bash
node scripts/render-site.mjs
```

### Add a published paper

Add a new object to `data/publications.json`:

```json
{
  "title": "Paper Title",
  "authors": [
    "Coauthor One",
    "Coauthor Two"
  ],
  "publication": {
    "text": "Journal Name, volume/details, year",
    "url": "https://example.com/paper"
  },
  "links": [
    {
      "label": "Data",
      "url": "https://example.com/data"
    }
  ],
  "notes": [
    "Presented at ...",
    "Featured on [Blog Name](https://example.com/blog-post)"
  ],
  "abstract": "Abstract text without the leading 'Abstract:' label."
}
```

Do **not** include the leading paper number; numbering is generated automatically based on the order in the JSON file.

Optional fields can be empty:

```json
"authors": [],
"links": [],
"notes": []
```

Use Markdown-style links inside notes:

```text
Featured on [Harvard Law School's Forum on Corporate Governance](https://example.com)
```

The generator converts those note links to HTML safely. You should not need to hand-write `<a>` tags for normal publication entries.

### Add a working paper

Add a new object to `data/working-papers.json`:

```json
{
  "title": "Working Paper Title",
  "authors": [
    "Coauthor One",
    "Coauthor Two"
  ]
}
```

## Why this setup

The JSON and template files make updates easier and avoid hand-editing repeated navigation, header/footer, and paper-card markup. The generated pages are still static HTML, so the site remains fast, simple to host, and readable without client-side JavaScript.

## Key files

- `data/site.json` — page list, browser titles, and navigation order
- `templates/page.html` — shared document shell, header, nav, and footer
- `content/index.html` — Home page body
- `content/biography.html` — Biography page body
- `content/cv.html` — CV page body
- `data/publications.json` — editable publications data
- `data/working-papers.json` — editable working papers data
- `scripts/render-site.mjs` — full site generator
- `scripts/render-research.mjs` — compatibility wrapper that delegates to `render-site.mjs`
- `styles.css` — shared visual design
- `assets/headshot.jpg` — Home page profile image
- `assets/bio-photo.jpg` — Biography page photo
- `assets/tamu-atm-favicon.svg` — browser tab icon
- `index.html`, `research.html`, `biography.html`, `cv.html` — generated static pages
