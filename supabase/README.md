# Supabase database

The initial application schema is defined in
[`migrations/20261004234000_initial_letterbox_schema.sql`](./migrations/20261004234000_initial_letterbox_schema.sql).
Keep future schema changes in new timestamped migration files; do not edit a
migration after it has been applied to a shared database.

## Apply schema migrations to the linked project

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
`fnihsbhxjhmcebvqbkgs`. Review the output of
`npx supabase db push --dry-run` to verify that it lists only the migrations
you intend to apply, then run `npx supabase db push` to apply them to the linked
remote database. It does not reset the database.

The current schema includes:

- `profiles`, linked to Supabase Auth users; phone verification belongs to Auth.
- `groups` and `group_members`, with a 14-day default cadence.
- `newsletters`, with `open` / `sent` status, `started_at`, and `sent_at`.
- `questions`, limited to one question per author per newsletter.
- `responses`, limited to one response per user per question.
- Row Level Security policies that restrict data to group members and allow
  edits only while a newsletter is open.

Creating Auth users automatically creates their profile. Group owners can
create groups and reusable invite links; phone-contact import is not
implemented yet.

The `create_group(text)` database function uses a restricted definer
transaction to create a group and its creator's owner membership atomically.
It validates the group name, derives ownership from the authenticated session,
uses an empty search path, and grants execution only to authenticated users.

`group_invites` stores only hashes of random link tokens and six-letter codes
and has no direct client grants. Group owners can create or replace a reusable
invite link and code. The link remains valid until replaced; the code expires
after seven days. Code lookups are limited to ten attempts per authenticated
user in 15 minutes. Authenticated users can preview and explicitly accept by
link or code, and the database adds only the current `auth.uid()` as a member.

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

The newsletter and group-letter screens still use sample content. The
authenticated postbox supports real groups and invite membership; question
and response content is not yet connected.

The project currently reports email sign-ups enabled and email auto-confirm
disabled: new users must follow the confirmation email before they can sign in.
The browser integration and Auth endpoint are configured, but complete the
sign-up → confirmation → sign-in → profile-check flow with a real tester
account before inviting the pilot group.

## Manage isolated test users

The repository includes a Node CLI for creating, listing/searching, and deleting
Supabase Auth test users. It uses Auth Admin credentials only in a local
server-side process; never add an admin/secret key to `supabase-config.js`,
browser code, GitHub Pages, or a committed environment file. Use a dedicated
local Supabase stack or a separate hosted test project, not the pilot or
production project.

Install dependencies and run the unit tests:

```sh
npm install
npm test
```

Configure the CLI in the current shell with the test project's URL and
service-role/secret key:

```sh
export POSTMARKED_TEST_SUPABASE_URL=http://127.0.0.1:54321
export POSTMARKED_TEST_SUPABASE_ADMIN_KEY='your-local-test-admin-key'
```

Local URLs are allowed by default. Hosted projects are blocked unless you
deliberately enable them in the current shell:

```sh
export POSTMARKED_TEST_SUPABASE_URL='https://your-dedicated-test-project.supabase.co'
export POSTMARKED_TEST_SUPABASE_ALLOW_REMOTE=I_UNDERSTAND
```

The Supabase client currently requires Node 22 or newer to run the CLI.

Then run:

```sh
npm run test-users -- create --name "Test Person" # generates email and password
npm run test-users -- create tester@example.com --name "Test Person"
npm run test-users -- list
npm run test-users -- list tester@example.com
npm run test-users -- delete tester@example.com --confirm
```

Created users are email-confirmed and tagged in Auth `app_metadata`. Listing
and deletion only operate on users with this tag; deletion also requires the
explicit `--confirm` flag. Generated passwords are printed once at creation.
The CLI and unit tests do not run against any project automatically.

## Local development

Run `supabase start` to start the local Supabase stack (Docker required), then
`supabase db reset` to recreate the **local** database from migrations. Do not
use `db reset` as a way to apply migrations to the linked hosted project.

## Verify after applying

In the linked database, `supabase migration list --linked` should show all
local migrations as applied. The Supabase Table Editor should show the
application tables in the `public` schema. Test signup, group creation, invite
acceptance, and membership with authenticated users before connecting real
newsletter screens.
