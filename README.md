# Somewhere

A mobile-first prototype for keeping in touch with friends around the world
through shared reflection prompts and a newsletter-style collection of answers.
This repository is a front-end skeleton with sample content; responses are
saved in the current browser and are not shared with a real group.

## Preview

The style gallery is the best place to start. It shows all three visual
directions side by side, with live previews that synchronize scrolling,
navigation, and question selection:

- **Style gallery:** [styles.html](./styles.html)
- **Main prototype:** [index.html](./index.html)
- **Coastal theme:** [coastal.html](./coastal.html)
- **Postcard theme:** [postcard.html](./postcard.html)
- **Field Notes theme:** [field-notes.html](./field-notes.html)

After GitHub Pages deployment, the pages are available at:

- `https://arkrusade.github.io/letterbox/` — main prototype
- `https://arkrusade.github.io/letterbox/styles.html` — style gallery
- `https://arkrusade.github.io/letterbox/coastal.html` — coastal theme
- `https://arkrusade.github.io/letterbox/postcard.html` — postcard theme
- `https://arkrusade.github.io/letterbox/field-notes.html` — Field Notes theme

The gallery previews are intentionally embedded app pages. Their synchronization
uses same-origin messaging, so it works on GitHub Pages as well as local hosting.

## Run locally

From the repository directory:

```sh
python3 -m http.server 8765
```

Then open <http://localhost:8765/styles.html>.

## GitHub Pages deployment

The workflow in `.github/workflows/pages.yml` publishes the static preview when
changes are pushed to `master`, or when it is manually run from the Actions tab.
It stages only the HTML, CSS, and JavaScript needed by the preview.

For the first deployment, confirm that GitHub Pages is enabled for the
repository with **Settings → Pages → Build and deployment → Source: GitHub
Actions**. The published links above become available after the workflow
deployment finishes. GitHub Pages availability for a private repository depends
on the repository owner's GitHub plan and Pages access settings.

## Pages and what they represent

| Page | What it shows |
| --- | --- |
| `index.html` | Main prototype: the group home, shared weekly questions, member list, text reply composer, and newsletter view. |
| `styles.html` | **Style gallery:** side-by-side, interactive comparisons of the three themes. Scroll, switch tabs, or select a question in one preview to sync the others. |
| `coastal.html` | Full-page preview of the cool blue and sea-glass coastal direction. |
| `postcard.html` | Full-page preview of the warm paper, stamp, and keepsake postcard direction. |
| `field-notes.html` | Full-page preview of the botanical green, editorial Field Notes direction. |

`FEATURES.txt` records the current feature inventory, prioritized gaps, and
open product decisions.
