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
let supabaseClient;
let authMode = "sign-in";

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
    ? "Create an account to start using Somewhere with your friends."
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

function renderSession(session) {
  const signedIn = Boolean(session?.user);
  accountForm.hidden = signedIn;
  accountModeToggle.hidden = signedIn;
  accountSignedIn.hidden = !signedIn;
  if (signedIn) {
    accountUser.textContent = session.user.email || "Signed in";
    accountDescription.textContent = "Your account is connected to the Somewhere database.";
    profileButton.setAttribute("aria-label", `Signed in as ${session.user.email || "friend"}. Open account`);
  } else {
    accountDescription.textContent = supabaseClient
      ? "Create an account or sign in to securely connect to your Supabase project."
      : "Account sign-in is not configured yet. Add the project's publishable key to supabase-config.js.";
    profileButton.setAttribute("aria-label", "Sign in or open your profile");
  }
}

profileButton.addEventListener("click", showAccountDialog);
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
  const config = window.LETTERBOX_SUPABASE_CONFIG;
  if (!config?.url || !config?.publishableKey || config.publishableKey.includes("REPLACE_WITH")) {
    renderSession(null);
    setMessage("Add the publishable key to supabase-config.js to enable account sign-in.", "error");
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
    setMessage("Could not connect to Supabase. Check your connection and project configuration.", "error");
  }
}

initializeSupabaseAuth();
