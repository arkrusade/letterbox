POSTMARKED — FEATURE LIST AND MVP GAPS
======================================

Purpose
-------
A mobile-first app for keeping in touch with friends around the world through
shared reflection questions and a newsletter-style collection of the group's
answers.

CURRENT PROTOTYPE
-----------------
Working in the front-end prototype:
- Three visual themes plus the original style; themes share the same content.
- Style gallery with synced scrolling, navigation, and question selection.
- Sample group, weekly questions, sample text answers, and newsletter view.
- Text response composer with a 600-character limit.
- Browser-local response saving for the current session.
- Whole question cards open the matching question in the newsletter.

MAIN APP ENTRY
--------------
- The plain `/` or `index.html` route is the real Supabase app entry:
  sign-up/sign-in, email-confirmation guidance, profile setup, and group-list
  reads for the signed-in account.
- Signed-in users can create a group; the database transaction creates the
  group and its owner membership together.
- `index.html?theme=...`, the theme pages, and `styles.html` are explicitly
  sample-content design previews. Do not mistake their sample answers for
  shared database content.
- Joining groups, opening real group content, and saving shared
  questions/responses are still not connected.

Prototype limitations:
- Group members, questions, answers, and profile details are sample data.
- Newsletter content is still demo data; responses are stored only in the
  current browser and do not yet synchronize across devices or groups.
- The authenticated landing page lists the user's groups and supports group
  creation; it cannot yet open a group's real content.
- Profile button opens the account/auth dialog, but there is no editable profile
  screen; member cards do not yet open member profiles.
- Group switcher does not yet switch groups or return to a My groups hub.
- Themes are visual explorations; there is no theme editor or saved group style.

IMPLEMENTED FOUNDATION
----------------------
- Current page inventory, routes/links, design studies, and planned screen map
  are tracked in `DESIGN.md`.
- Local page/asset link audit passed for all current HTML pages and iframe
  previews on 2026-10-04.
- Supabase project schema is versioned in `supabase/migrations/` and applied to
  the linked development project. All six application tables have RLS enabled.
- Browser sign-up, email/password sign-in, session restoration, and sign-out
  use the Supabase publishable key; no privileged API key is used in the app.
- The account dialog includes an authenticated profile read/write check that
  exercises the `profiles` RLS policies without changing the profile value.
- Supabase public app configuration lives in `supabase-config.js`; the publishable
  key is intended to be public. Never put the secret key or CLI token there.
- `supabase/README.md` documents project configuration, auth redirects, and
  testing. Authenticated newsletter/group screens remain future work.

PILOT MVP — THREE AUTHENTICATED USERS, ONE GROUP, PRESET QUESTIONS
------------------------------------------------------------------
The pilot is ready when three people can create real accounts, join one group,
answer the same app-provided questions, and see shared group responses:

[ ] Verify email/password sign-up, email confirmation/redirect, sign-in,
    persisted sessions, and sign-out with a real tester account.
[ ] Collect a display name during sign-up and use the server profile for
    response attribution; do not treat browser-local data as the account.
[x] Let an authenticated user create a named group and owner membership
    atomically; default cadence is 14 days.
[ ] Safely invite/join the other two authenticated users. Never expose
    admin/secret credentials or allow arbitrary membership writes.
[ ] Create one open newsletter/session for the group using the agreed 14-day
    cadence.
[ ] Seed/select a fixed, app-provided set of text questions for that session;
    testers only answer questions in this pilot.
[ ] Let each member submit and edit their own text responses while the session
    is open; persist responses in Supabase, not localStorage.
[ ] Show progress and attributed responses from Supabase to group members;
    verify a non-member cannot read group content.
[ ] Deploy a stable app URL, configure Auth redirect URLs, share the app/group
    invite, and test on phone-sized screens and a second device/browser.

Not required for this first pilot: member-authored questions, push/email
notifications, phone/contact import, image answers, custom group themes, a
newsletter archive, account deletion, or polished multi-group management.
Keep data and queries scoped by group so multiple groups can be added later
without reworking the core flow.

PRIORITY 0 — MAKE THE PROTOTYPE FEEL COMPLETE
---------------------------------------------
[ ] Add group opening and invitation/join actions to the My groups landing page.
[ ] Add a usable account settings screen for the current user.
[ ] Make member cards open a member profile (name, location/time zone, and
    responses in the current and past newsletters).
[ ] Make group switching preserve the selected group context across its
    questions, answers, newsletter, archive, and settings.
[ ] Add clear loading, empty, error, and success states to the main screens.
[ ] Keep question selection and scroll behavior working across the style gallery.

PRIORITY 1 — CORE GROUP MVP
---------------------------
[x] Add the initial Supabase database schema for profiles, groups, memberships,
    newsletters, questions, and text answers.
[x] Add email/password sign-up/sign-in and a profile read/write permission check.
[ ] Add account settings for display name, email, phone, and global notification
    controls (master switch plus newsletter, question-list, and reminder types).
[ ] Add personal per-group preferences for nickname, answer font, and
    per-category notification overrides.
[ ] Add shared group settings for membership/roles, newsletter style, 14-day
    cadence, time zone, and session schedule.
[ ] Create groups and invite/join friends with a shareable invite link or code.
[ ] Store phone numbers for invitations. Ask permission and explain the use.
[ ] Allow importing contacts only after explicit user permission; let the user
    select who to invite. Do not upload the address book by default.
[ ] Seed/select a shared app-provided question set for each group newsletter.
[ ] Let the group review/collect its preset questions and give everyone the
    same set.
[ ] Let members submit text answers to the shared questions.
[ ] Publish a newsletter-style view containing each question and the group's
    answers, with author and attribution.
[ ] Add private-by-default group access and controls for leaving a group,
    removing a member, and deleting an account and its data.
[ ] (Later) Consider member-authored questions and enforce per-session limits
    server-side if that product decision is adopted.

PRIORITY 2 — SESSION CADENCE AND ARCHIVE
---------------------------------------
[ ] Make session length configurable per group in the backend; the requested
    cadence is every two weeks (14 days), matching the current schema default.
[ ] Decide the group's time zone and the exact session start, close, and
    newsletter publication time; handle members in different time zones.
[ ] Define what happens when a member has not submitted an answer at close.
[ ] Support draft, open, closing, and published session states.
[ ] Show previous questions, answers, and newsletters in a browsable archive.
[ ] Allow opening an archived newsletter without changing current answers.
[ ] Decide whether published newsletters can be edited or retracted.

PRIORITY 3 — KEEP IN TOUCH
--------------------------
[ ] Add opt-in reminders for an upcoming session, unanswered questions, and
    newsletter publication.
[ ] Support notification preferences and quiet hours.
[ ] Provide a useful invite/re-entry experience for friends who have not joined.
[ ] Make member locations and local time zones visible where useful, with
    profile privacy controls.

PRIORITY 4 — IMAGES AND PRESENTATION
------------------------------------
[ ] Support image answers and questions that explicitly ask for an image.
[ ] Add image selection/capture, upload, storage, compression, and display.
[ ] Set image size/type limits and provide upload progress and failure states.
[ ] Add image privacy, deletion, and retention rules.
[ ] Keep content separate from newsletter presentation so layouts/themes can
    change without changing saved questions or answers.
[ ] Let a group choose a newsletter theme; preserve a readable default.
[ ] Test text-only and image answers across all themes and small screens.

FOUNDATION / RELEASE CHECKLIST
------------------------------
[ ] Choose and configure production hosting, database, file storage, and backups.
[ ] Add automated tests for session rules, permissions, publishing, archives,
    contact consent, and response privacy.
[ ] Add accessibility checks for keyboard use, screen readers, contrast, and
    reduced motion.
[ ] Add data export/deletion, privacy policy, and terms before public launch.
[ ] Add monitoring and a way to report problems or inappropriate content.

OPEN PRODUCT DECISIONS
---------------------
- Who can start a group, invite members, edit group settings, or remove members?
- Should members ever author questions, or will questions always come from an
  app-curated prompt library?
- Are answers visible as soon as they are submitted, or only after publication?
- Are unanswered questions omitted, shown as blank, or followed up privately?
- What exact release/close/publication times and group time zone should be used
  for the 14-day cadence?
- Should members be able to edit or delete a response after the newsletter is
  published?
- How long are uploaded images and archived newsletters retained?
- Group newsletter style belongs to the group; the answer handwriting/font
  preference belongs to each member in each group.

NEXT SUGGESTED BUILD
--------------------
Finish verifying email/password sign-up, confirmation redirects, sign-in, and
session restoration with a real test account. Then connect a preset question
set and the text-response composer to Supabase, followed by the one-group
membership/invite flow. Use the existing 14-day session default. This enables
the three-person pilot before adding self-service question authoring, contacts,
notifications, and image uploads.
