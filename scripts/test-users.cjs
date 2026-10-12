const { randomBytes } = require("node:crypto");

const TEST_USER_FLAG = "postmarked_test_user";

async function listTestUsers(admin, query = "") {
  const users = await loadUsers(admin);
  const normalizedQuery = query.trim().toLowerCase();

  return users
    .filter((user) => user.app_metadata?.[TEST_USER_FLAG] === true)
    .filter((user) => {
      const displayName = user.user_metadata?.display_name?.toLowerCase() || "";
      return (
        !normalizedQuery ||
        user.id.toLowerCase().includes(normalizedQuery) ||
        user.email?.toLowerCase().includes(normalizedQuery) ||
        displayName.includes(normalizedQuery)
      );
    })
    .map(
      ({
        id,
        email,
        created_at: createdAt,
        email_confirmed_at: emailConfirmedAt,
        user_metadata: userMetadata,
      }) => ({
      id,
      email,
      createdAt,
      emailConfirmed: Boolean(emailConfirmedAt),
      displayName: userMetadata?.display_name || "",
      }),
    );
}

async function createTestUser(admin, { email, password, displayName }) {
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid test-user email address is required.");
  }
  if (typeof password !== "string" || password.length < 12) {
    throw new Error("Test-user passwords must be at least 12 characters.");
  }
  if (
    typeof displayName !== "string" ||
    !displayName.trim() ||
    displayName.trim().length > 80
  ) {
    throw new Error("A display name between 1 and 80 characters is required.");
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { [TEST_USER_FLAG]: true },
    user_metadata: { display_name: displayName.trim() },
  });
  if (error) throw error;
  if (!data?.user || data.user.app_metadata?.[TEST_USER_FLAG] !== true) {
    throw new Error("Supabase did not return the tagged test user.");
  }
  return data.user;
}

async function deleteTestUser(admin, identifier) {
  if (typeof identifier !== "string" || !identifier.trim()) {
    throw new Error("A test-user email address or ID is required.");
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const matches = await listTestUsers(admin);
  const user = matches.find(
    (candidate) =>
      candidate.id.toLowerCase() === normalizedIdentifier ||
      candidate.email?.toLowerCase() === normalizedIdentifier,
  );
  if (!user) throw new Error("No tagged test user matches that email address or ID.");

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return user;
}

async function loadUsers(admin) {
  const users = [];
  const perPage = 100;
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    if (!Array.isArray(data?.users)) {
      throw new Error("Supabase returned an invalid user list.");
    }

    users.push(...data.users);
    if (data.users.length < perPage || (data.nextPage && data.nextPage <= page)) break;
    page = data.nextPage || page + 1;
  }

  return users;
}

function generateTestCredentials() {
  const suffix = randomBytes(8).toString("hex");
  const password = randomBytes(24).toString("base64url");
  return {
    email: `postmarked-test-${suffix}@example.com`,
    password,
  };
}

module.exports = {
  TEST_USER_FLAG,
  createTestUser,
  deleteTestUser,
  generateTestCredentials,
  listTestUsers,
};
