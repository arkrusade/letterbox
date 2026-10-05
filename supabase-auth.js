const accountDialog = document.querySelector("#account-dialog");
const accountForm = document.querySelector("#auth-form");
const accountMessage = document.querySelector("#auth-message");
const accountDescription = document.querySelector("#account-description");
const accountSignedIn = document.querySelector("#account-signed-in");
const accountModeToggle = document.querySelector("#auth-mode-toggle");
const accountSubmit = document.querySelector("#auth-submit");
const displayNameInput = document.querySelector("#auth-display-name");
const displayNameLabel = document.querySelector("#auth-display-name-label");
const accountUser = document.querySelector("#account-user");
const smokeTestButton = document.querySelector("#profile-smoke-test");
const profileButton = document.querySelector("#profile-button");
const entryShell = document.querySelector("#app-entry");
const entryAuthView = document.querySelector("#entry-auth-view");
const entryProfileView = document.querySelector("#entry-profile-view");
const entryGroupsView = document.querySelector("#entry-groups-view");
const entryAuthForm = document.querySelector("#entry-auth-form");
const entryModeToggle = document.querySelector("#entry-mode-toggle");
const entryAuthSubmit = document.querySelector("#entry-auth-submit");
const entryAuthMessage = document.querySelector("#entry-auth-message");
const entryDisplayName = document.querySelector("#entry-display-name");
const entryNameLabel = document.querySelector("#entry-name-label");
const entryProfileForm = document.querySelector("#entry-profile-form");
const entryProfileName = document.querySelector("#entry-profile-name");
const entryProfileMessage = document.querySelector("#entry-profile-message");
const entryGroupsList = document.querySelector("#entry-groups-list");
const entryGroupsEmpty = document.querySelector("#entry-groups-empty");
const entryGroupsMessage = document.querySelector("#entry-groups-message");
const entryCreateGroupForm = document.querySelector("#entry-create-group-form");
const entryGroupName = document.querySelector("#entry-group-name");
const entryCreateGroupSubmit = document.querySelector("#entry-create-group-submit");
const entryRefreshGroups = document.querySelector("#entry-refresh-groups");
let supabaseClient;
let authMode = "sign-in";
let entryRequestId = 0;

function setMessage(message, state = "") {
  accountMessage.textContent = message;
  accountMessage.dataset.state = state;
}

function setAuthMode(mode) {
  authMode = mode;
  const signingUp = mode === "sign-up";
  displayNameInput.hidden = !signingUp;
  displayNameLabel.hidden = !signingUp;
  displayNameInput.required = signingUp;
  accountDescription.textContent = signingUp
    ? "Create an account to start using Postmarked with your friends."
    : "Sign in to securely connect to your Supabase project.";
  document.querySelector("#account-title").innerHTML = signingUp
    ? "A little closer, <em>wherever you are.</em>"
    : "Welcome back, <em>friend.</em>";
  document.querySelector("#auth-password").autocomplete = signingUp ? "new-password" : "current-password";
  accountSubmit.textContent = signingUp ? "Create account" : "Sign in";
  accountModeToggle.textContent = signingUp
    ? "Already have an account? Sign in"
    : "New here? Create an account";
  setMessage("");
}

function showAccountDialog() {
  if (!accountDialog.open) accountDialog.showModal();
}

function setEntryMessage(element, message, state = "") {
  element.textContent = message;
  element.dataset.state = state;
}

function showEntryView(view) {
  entryAuthView.hidden = view !== "auth";
  entryProfileView.hidden = view !== "profile";
  entryGroupsView.hidden = view !== "groups";
}

function setEntryAuthMode(mode) {
  authMode = mode;
  const signingUp = mode === "sign-up";
  entryDisplayName.hidden = !signingUp;
  entryNameLabel.hidden = !signingUp;
  entryDisplayName.required = signingUp;
  entryAuthSubmit.textContent = signingUp ? "Create account" : "Sign in";
  entryModeToggle.textContent = signingUp
    ? "Already have an account? Sign in"
    : "New here? Create an account";
  entryAuthForm.elements.password.autocomplete = signingUp ? "new-password" : "current-password";
  setEntryMessage(entryAuthMessage, "");
}

async function loadEntryGroups(userId, requestId) {
  showEntryView("groups");
  entryGroupsList.replaceChildren();
  entryGroupsEmpty.hidden = true;
  entryRefreshGroups.disabled = true;
  setEntryMessage(entryGroupsMessage, "Finding your groups…");
  try {
    const { data, error } = await supabaseClient
      .from("group_members")
      .select("group_id, groups(name, cadence_days)")
      .eq("user_id", userId);
    if (requestId !== entryRequestId) return false;
    if (error) throw error;

    const groups = (data || [])
      .map((membership) => {
        const group = Array.isArray(membership.groups) ? membership.groups[0] : membership.groups;
        return group ? { ...group, id: membership.group_id } : null;
      })
      .filter(Boolean);
    if (!groups.length) {
      entryGroupsEmpty.hidden = false;
      setEntryMessage(entryGroupsMessage, "");
      return true;
    }

    for (const group of groups) {
      const card = document.createElement("article");
      card.className = "entry-group-card";
      const heading = document.createElement("h2");
      heading.textContent = group.name;
      const detail = document.createElement("p");
      detail.textContent = `A little letter every ${group.cadence_days} days. Inviting friends and opening group letters are next.`;
      card.append(heading, detail);
      entryGroupsList.append(card);
    }
    setEntryMessage(entryGroupsMessage, "");
    return true;
  } catch (error) {
    if (requestId !== entryRequestId) return false;
    console.error("Could not load the user's groups.", error);
    setEntryMessage(entryGroupsMessage, "We couldn’t load your groups. Check your connection and try again.", "error");
    return false;
  } finally {
    if (requestId === entryRequestId) entryRefreshGroups.disabled = false;
  }
}

function openCreateGroupForm() {
  entryGroupsEmpty.hidden = true;
  entryCreateGroupForm.hidden = false;
  entryGroupName.focus();
}

async function renderEntrySession(session) {
  if (window.LETTERBOX_PREVIEW || !entryShell) return;
  entryShell.hidden = false;
  entryCreateGroupForm.hidden = true;
  const requestId = ++entryRequestId;
  if (!session?.user) {
    showEntryView("auth");
    return;
  }

  showEntryView("profile");
  setEntryMessage(entryProfileMessage, "Loading your profile…");
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("display_name")
    .eq("id", session.user.id)
    .single();
  if (requestId !== entryRequestId) return;
  if (error) {
    console.error("Could not load the signed-in user's profile.", error);
    setEntryMessage(entryProfileMessage, "We couldn’t load your profile. Please refresh and try again.", "error");
    return;
  }

  const metadataName =
    typeof session.user.user_metadata?.display_name === "string"
      ? session.user.user_metadata.display_name.trim()
      : "";
  if (!profile.display_name || profile.display_name === "Friend") {
    entryProfileName.value = metadataName;
    showEntryView("profile");
    setEntryMessage(entryProfileMessage, "");
    entryProfileName.focus();
    return;
  }
  try {
    await loadEntryGroups(session.user.id, requestId);
  } catch (loadError) {
    if (requestId !== entryRequestId) return;
    console.error("Could not load the user's groups.", loadError);
    setEntryMessage(entryGroupsMessage, "We couldn’t load your groups. Check your connection and try again.", "error");
  }
}

function renderSession(session) {
  const signedIn = Boolean(session?.user);
  accountForm.hidden = signedIn;
  accountModeToggle.hidden = signedIn;
  accountSignedIn.hidden = !signedIn;
  if (signedIn) {
    accountUser.textContent = session.user.email || "Signed in";
    accountDescription.textContent = "Your account is connected to the Postmarked database.";
    profileButton.setAttribute("aria-label", `Signed in as ${session.user.email || "friend"}. Open account`);
  } else {
    accountDescription.textContent = supabaseClient
      ? "Create an account or sign in to securely connect to your Supabase project."
      : "Account sign-in is not configured yet. Add the project's publishable key to supabase-config.js.";
    profileButton.setAttribute("aria-label", "Sign in or open your profile");
  }
  if (!window.LETTERBOX_PREVIEW) void renderEntrySession(session);
}

profileButton.addEventListener("click", showAccountDialog);
entryModeToggle.addEventListener("click", () => {
  setEntryAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in");
});
entryAuthForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    setEntryMessage(entryAuthMessage, "Supabase is not connected. Check your connection and reload.", "error");
    return;
  }
  entryAuthSubmit.disabled = true;
  const email = entryAuthForm.elements.email.value.trim();
  const password = entryAuthForm.elements.password.value;
  try {
    if (authMode === "sign-up") {
      const displayName = entryDisplayName.value.trim();
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.href,
        },
      });
      if (error) throw error;
      if (data.session) {
        setEntryMessage(entryAuthMessage, "Your account is ready.", "success");
      } else {
        setEntryAuthMode("sign-in");
        entryAuthForm.elements.email.value = email;
        setEntryMessage(entryAuthMessage, "Account created. Confirm your email, then sign in here.", "success");
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setEntryMessage(entryAuthMessage, "You’re signed in.", "success");
    }
  } catch (error) {
    console.error("Main-site authentication failed.", error);
    setEntryMessage(entryAuthMessage, error.message || "Authentication failed. Please try again.", "error");
  } finally {
    entryAuthSubmit.disabled = false;
  }
});
entryProfileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const displayName = entryProfileName.value.trim();
  if (!displayName || !supabaseClient) return;
  const { data: userResult, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !userResult.user) {
    setEntryMessage(entryProfileMessage, userError?.message || "Please sign in again.", "error");
    return;
  }
  const submit = entryProfileForm.querySelector("button[type=submit]");
  submit.disabled = true;
  setEntryMessage(entryProfileMessage, "Saving your name…");
  try {
    const { data: updatedProfile, error } = await supabaseClient
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", userResult.user.id)
      .select("id")
      .single();
    if (error) throw error;
    if (updatedProfile.id !== userResult.user.id) {
      throw new Error("The profile update did not match the signed-in user.");
    }
    await loadEntryGroups(userResult.user.id, entryRequestId);
  } catch (error) {
    console.error("Could not save the user's display name.", error);
    setEntryMessage(entryProfileMessage, error.message || "We couldn’t save your name. Please try again.", "error");
  } finally {
    submit.disabled = false;
  }
});
document.querySelector("#entry-sign-out").addEventListener("click", async () => {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error("Could not sign out from the main app.", error);
    setEntryMessage(entryGroupsMessage, error.message || "Could not sign out. Please try again.", "error");
  }
});
document.querySelector("#entry-refresh-groups").addEventListener("click", async () => {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data.user) {
    setEntryMessage(entryGroupsMessage, error?.message || "Please sign in again.", "error");
    return;
  }
  try {
    await loadEntryGroups(data.user.id, entryRequestId);
  } catch (loadError) {
    console.error("Could not refresh the user's groups.", loadError);
    setEntryMessage(entryGroupsMessage, "We couldn’t refresh your groups. Please try again.", "error");
  }
});
document.querySelector("#entry-open-create-group").addEventListener("click", openCreateGroupForm);
document.querySelector("#entry-create-first-group").addEventListener("click", openCreateGroupForm);
document.querySelector("#entry-cancel-create-group").addEventListener("click", () => {
  entryCreateGroupForm.hidden = true;
  entryGroupName.value = "";
  entryGroupsEmpty.hidden = entryGroupsList.childElementCount > 0;
  setEntryMessage(entryGroupsMessage, "");
});
entryCreateGroupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = entryGroupName.value.trim();
  if (!name || !supabaseClient) return;
  entryCreateGroupSubmit.disabled = true;
  setEntryMessage(entryGroupsMessage, "Creating your group…");
  let created = false;
  try {
    const { data, error } = await supabaseClient.rpc("create_group", {
      group_name: name,
    });
    if (error) throw error;
    if (typeof data !== "string" || !data) {
      throw new Error("The group was created, but the server did not return its ID. Refresh your groups to check.");
    }
    created = true;
    entryGroupName.value = "";
    entryCreateGroupForm.hidden = true;
    entryGroupsEmpty.hidden = true;
    const { data: userResult, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!userResult.user) throw new Error("Group created, but your session is no longer active. Sign in and refresh your groups.");
    const groupsLoaded = await loadEntryGroups(userResult.user.id, ++entryRequestId);
    if (!groupsLoaded) throw new Error("Your group was created, but the group list could not be refreshed.");
    setEntryMessage(entryGroupsMessage, "Your group is ready. Invite links and shared letters are the next steps.", "success");
  } catch (error) {
    if (created) {
      console.error("Group was created, but the post-create refresh failed.", error);
      setEntryMessage(entryGroupsMessage, "Your group was created, but we couldn’t refresh the list. Use Refresh my groups.", "error");
    } else {
      console.error("Could not create group.", error);
      setEntryMessage(entryGroupsMessage, error.message || "We couldn’t create your group. Please try again.", "error");
    }
  } finally {
    entryCreateGroupSubmit.disabled = false;
  }
});
document.querySelector("[data-close-account]").addEventListener("click", () => accountDialog.close());
accountDialog.addEventListener("click", (event) => {
  if (event.target === accountDialog) accountDialog.close();
});
accountModeToggle.addEventListener("click", () => {
  setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in");
});
accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    setMessage("Account sign-in is unavailable. Configure the Supabase publishable key and reload.", "error");
    return;
  }

  const email = accountForm.elements.email.value.trim();
  const password = accountForm.elements.password.value;
  accountSubmit.disabled = true;
  setMessage(authMode === "sign-up" ? "Creating your account…" : "Signing in…");
  try {
    if (authMode === "sign-up") {
      const displayName = displayNameInput.value.trim();
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.href,
        },
      });
      if (error) throw error;
      if (data.session) {
        setMessage("Your account is ready.", "success");
      } else {
        setAuthMode("sign-in");
        accountForm.elements.email.value = email;
        setMessage("Account created. Check your email to confirm it, then sign in here.", "success");
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setMessage("You’re signed in.", "success");
    }
  } catch (error) {
    console.error("Supabase authentication failed.", error);
    setMessage(error.message || "Authentication failed. Please try again.", "error");
  } finally {
    accountSubmit.disabled = false;
  }
});

document.querySelector("#auth-sign-out").addEventListener("click", async () => {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error("Could not sign out.", error);
    setMessage(error.message || "Could not sign out. Please try again.", "error");
    return;
  }
  setAuthMode("sign-in");
  setMessage("You’ve signed out.", "success");
});

smokeTestButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  smokeTestButton.disabled = true;
  setMessage("Checking your profile permissions…");
  try {
    const { data: userResult, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    const user = userResult.user;
    if (!user) throw new Error("Your session has expired. Sign in again.");

    const { data: profile, error: readError } = await supabaseClient
      .from("profiles")
      .select("id, display_name, time_zone")
      .eq("id", user.id)
      .single();
    if (readError) throw readError;

    const { data: updatedProfile, error: writeError } = await supabaseClient
      .from("profiles")
      .update({ display_name: profile.display_name })
      .eq("id", user.id)
      .select("id, display_name")
      .single();
    if (writeError) throw writeError;
    if (updatedProfile.id !== user.id || updatedProfile.display_name !== profile.display_name) {
      throw new Error("The profile write returned unexpected data.");
    }

    const { data: verifiedProfile, error: verifyError } = await supabaseClient
      .from("profiles")
      .select("id, display_name")
      .eq("id", user.id)
      .single();
    if (verifyError) throw verifyError;
    if (verifiedProfile.id !== user.id || verifiedProfile.display_name !== profile.display_name) {
      throw new Error("The saved profile did not match the signed-in user's profile.");
    }
    setMessage("Success: authenticated profile read and write passed.", "success");
  } catch (error) {
    console.error("Authenticated profile read/write check failed.", error);
    setMessage(error.message || "Profile permission check failed. Please try again.", "error");
  } finally {
    smokeTestButton.disabled = false;
  }
});

setAuthMode("sign-in");

async function initializeSupabaseAuth() {
  if (window.LETTERBOX_PREVIEW) {
    entryShell.hidden = true;
  } else {
    entryShell.hidden = false;
    setEntryAuthMode("sign-in");
    showEntryView("auth");
    setEntryMessage(entryAuthMessage, "Connecting to your account…");
  }
  const config = window.LETTERBOX_SUPABASE_CONFIG;
  if (!config?.url || !config?.publishableKey || config.publishableKey.includes("REPLACE_WITH")) {
    renderSession(null);
    if (!window.LETTERBOX_PREVIEW) {
      setEntryMessage(entryAuthMessage, "Account sign-in is not configured. Check the public Supabase settings and reload.", "error");
    }
    return;
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.117.2");
    supabaseClient = createClient(config.url, config.publishableKey);
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    renderSession(data.session);
    supabaseClient.auth.onAuthStateChange((_event, session) => renderSession(session));
  } catch (error) {
    console.error("Could not initialize Supabase authentication.", error);
    renderSession(null);
    if (!window.LETTERBOX_PREVIEW) {
      setEntryMessage(entryAuthMessage, "Could not connect to Supabase. Check your connection and project configuration.", "error");
    }
  }
}

initializeSupabaseAuth();
