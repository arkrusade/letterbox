# Supabase database

The initial application schema is defined in
[`migrations/20261004234000_initial_letterbox_schema.sql`](./migrations/20261004234000_initial_letterbox_schema.sql).
Keep future schema changes in new timestamped migration files; do not edit a
migration after it has been applied to a shared database.

## Apply the initial schema to the linked project

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started),
then run these commands from the repository root:

```sh
npm install

# In a shell, load the ignored local .env for this terminal session.
set -a
source .env
set +a

npx supabase projects list
npx supabase link --project-ref fnihsbhxjhmcebvqbkgs
npx supabase migration list --linked
npx supabase db push --dry-run
```

Add a Supabase personal access token to the ignored `.env` as
`SUPABASE_ACCESS_TOKEN=sbp_...`. Create it in your Supabase account's Access
Tokens settings. The CLI reads `SUPABASE_ACCESS_TOKEN` from the environment, so
an interactive `supabase login` is optional. The token is for the CLI/platform
API; it is not the project's publishable or secret API key. Never commit or
share it.

`supabase link` prompts for the database password. Enter it at the prompt; do
not put it in this repository or in a shell command that may be saved in history.
The CLI keeps its project-link metadata in your local Supabase configuration and
the ignored `supabase/.temp/` directory.

Before applying migrations, confirm that the linked project reference is
`fnihsbhxjhmcebvqbkgs` and that `npx supabase db push --dry-run` lists only the
initial Letterbox schema. Then run `npx supabase db push` to apply pending
migrations to the linked remote database. It does not reset the database.

The current schema includes:

- `profiles`, linked to Supabase Auth users; phone verification belongs to Auth.
- `groups` and `group_members`, with a 14-day default cadence.
- `newsletters`, with `open` / `sent` status, `started_at`, and `sent_at`.
- `questions`, limited to one question per author per newsletter.
- `responses`, limited to one response per user per question.
- Row Level Security policies that restrict data to group members and allow
  edits only while a newsletter is open.

Creating Auth users automatically creates their profile. Group owners can start
newsletters and add members; invite links and phone-contact import are not
implemented yet.

## Browser authentication and profile permission check

The prototype's account button opens email/password sign-up and sign-in backed
by Supabase Auth. The public configuration is in the root `supabase-config.js`;
it contains the project URL and the **publishable** API key. Publishable keys
are designed to be included in browser applications. Never put a `sb_secret_`
key, database password, or `sbp_` CLI personal access token in that file or any
browser code.

To configure authentication:

1. Set the Supabase project's **Site URL** to your local app origin while
   developing (for example, `http://localhost:8765`), and add
   `http://localhost:8765/**` and `http://127.0.0.1:8765/**` under
   **Authentication → URL Configuration → Redirect URLs**. Add
   `https://arkrusade.github.io/letterbox/**` there before testing sign-up on
   GitHub Pages.
2. If email confirmation is enabled, confirm the address from the email before
   signing in. Confirmation links return to the page where sign-up began.
3. Sign in, open the account button, and choose **Test profile read & write**.
   It reads the current user's profile, updates `display_name` to its existing
   value, then reads it back to verify the authenticated RLS permissions. The
   update trigger refreshes `updated_at`; the profile's visible data is
   unchanged.

The newsletter and group screens still use sample content. This check validates
the Auth session and the profile RLS policies only; it does not create sample
groups, members, questions, or answers.

## Local development

Run `supabase start` to start the local Supabase stack (Docker required), then
`supabase db reset` to recreate the **local** database from migrations. Do not
use `db reset` as a way to apply migrations to the linked hosted project.

## Verify after applying

In the linked database, `supabase migration list --linked` should show the
initial migration as applied. The Supabase Table Editor should show the six
application tables in the `public` schema. Test signup, group creation, and
membership with authenticated users before connecting real app screens.
