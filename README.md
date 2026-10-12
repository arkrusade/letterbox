# Postmarked

A mobile-first prototype for keeping in touch with friends around the world
through shared reflection prompts and a newsletter-style collection of answers.
The root app entry uses Supabase email/password authentication, loads the
signed-in user's profile and group memberships, and lets authenticated users
create groups and invite members with reusable links or manually entered
six-letter codes (valid for seven days). Shared newsletter responses are still
being connected. Visual sample content lives in the style previews, not in the
authenticated app flow.

## Preview

The main app is the starting point for account setup:

- **Main app:** [index.html](./index.html) — sign up/sign in, set a display
  name, view your groups, create a group, and accept invites.

The style gallery is a separate design preview. It shows all three visual
directions side by side, with live previews that synchronize scrolling,
navigation, and question selection:

- **Style gallery:** [styles.html](./styles.html)
- **Main prototype:** [index.html](./index.html)
- **Coastal theme:** [coastal.html](./coastal.html)
- **Postcard theme:** [postcard.html](./postcard.html)
- **Postcard answer formats:** [postcard-formats.html](./postcard-formats.html)
- **Field Notes theme:** [field-notes.html](./field-notes.html)

After GitHub Pages deployment, the pages are available at:

- `https://arkrusade.github.io/letterbox/` — main prototype
- `https://arkrusade.github.io/letterbox/styles.html` — style gallery
- `https://arkrusade.github.io/letterbox/coastal.html` — coastal theme
- `https://arkrusade.github.io/letterbox/postcard.html` — postcard theme
- `https://arkrusade.github.io/letterbox/postcard-formats.html` — postcard answer-format study
- `https://arkrusade.github.io/letterbox/field-notes.html` — Field Notes theme

The gallery previews are intentionally embedded app pages. Their synchronization
uses same-origin messaging, so it works on GitHub Pages as well as local hosting.

## Run locally

From the repository directory:

```sh
python3 -m http.server 8765
```

Then open <http://localhost:8765/> for the account flow, or
<http://localhost:8765/styles.html> for visual previews.

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
| `index.html` | Main app entry: Supabase sign-up/sign-in, profile setup, and the signed-in user's group list. `?theme=...` opens the isolated visual prototype used by the style previews. |
| `styles.html` | **Style gallery:** side-by-side, interactive comparisons of the three themes. Scroll, switch tabs, or select a question in one preview to sync the others. |
| `coastal.html` | Full-page preview of the cool blue and sea-glass coastal direction. |
| `postcard.html` | Full-page preview of the warm paper, stamp, and keepsake postcard direction. |
| `postcard-formats.html` | A visual study comparing three layouts for postcard-style answers. |
| `field-notes.html` | Full-page preview of the botanical green, editorial Field Notes direction. |

`FEATURES.md` records the current feature inventory, prioritized gaps, and
open product decisions.

[`DESIGN.md`](./DESIGN.md) documents the current page/link audit, prototype
flows, planned app screens, and a workflow for keeping design decisions in sync
with implementation.

## Database

The versioned Supabase schema and setup steps are in [`supabase/`](./supabase/).
See [`supabase/README.md`](./supabase/README.md) for linking the CLI and
applying migrations to the hosted project. Browser authentication uses the
public project URL and publishable key in [`supabase-config.js`](./supabase-config.js);
the secret API key must never be included in the static app.
