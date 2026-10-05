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

Prototype limitations:
- Group members, questions, answers, and profile details are sample data.
- Newsletter content is still demo data; responses are stored only in the
  current browser and do not yet synchronize across devices or groups.
- The signed-in landing page is still a single-group demo, not a list of the
  user's groups.
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

PILOT MVP — THREE PEOPLE, ONE GROUP, TEXT QUESTIONS AND RESPONSES
-----------------------------------------------------------------
The pilot is ready when three real accounts (one group owner and two members)
can complete this end-to-end flow:

[ ] Sign up/sign in as each of the three people; verify email confirmation.
[ ] Create one group and add the owner and two members through a safe invite or
    join flow. Do not expose admin/secret credentials in the browser.
[ ] Create one open newsletter/session for that group, with the agreed 14-day
    default cadence.
[ ] Add a shared list of text questions to that session and show the same list
    to all three members.
[ ] Let each member submit and edit their own text responses while the session
    is open; persist through Supabase, not localStorage.
[ ] Show progress and group-attributed answers from the database to authorized
    group members; verify a non-member cannot read the group.
[ ] Deploy a stable app URL and allow its Auth redirect URL; share that URL
    and the group invite with the three testers.
[ ] Test the complete flow on a phone-sized viewport and confirm data survives
    refresh and a second device/browser session.

Not required for this first pilot: push/email notifications, phone/contact
import, image answers, custom group themes, a newsletter archive, account
deletion, or polished support for many groups. Keep data and queries scoped by
group so a My groups hub and multiple memberships can be added without
reworking the core flow.

PRIORITY 0 — MAKE THE PROTOTYPE FEEL COMPLETE
---------------------------------------------
[ ] Add a My groups landing page listing every group the user belongs to,
    with open/create/join actions and an empty state.
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
[ ] Add shared group settings for membership/roles, newsletter style, weekly
    cadence, time zone, and session schedule.
[ ] Create groups and invite/join friends with a shareable invite link or code.
[ ] Store phone numbers for invitations. Ask permission and explain the use.
[ ] Allow importing contacts only after explicit user permission; let the user
    select who to invite. Do not upload the address book by default.
[ ] Let a group member manually add one question per newsletter session.
[ ] Enforce the one-question-per-person rule on the server, not only in the UI.
[ ] Let the group review/collect its questions and give everyone the same set.
[ ] Let members submit text answers to the shared questions.
[ ] Publish a newsletter-style view containing each question and the group's
    answers, with author and attribution.
[ ] Add private-by-default group access and controls for leaving a group,
    removing a member, and deleting an account and its data.

PRIORITY 2 — SESSION CADENCE AND ARCHIVE
---------------------------------------
[ ] Make session length configurable per group in the backend; the requested
    initial cadence is every two weeks (14 days), matching the current schema
    default.
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
- Can members add questions after the session starts? Can the group edit or vote
  on submitted questions?
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
Implement the authenticated group and session screens on top of the existing
schema. Use a 14-day session as the initial default, enforce one
member-submitted question per person per session, publish shared questions and
text answers, then add archive browsing. This establishes the shared product
behavior before adding contacts, notifications, and image uploads.
