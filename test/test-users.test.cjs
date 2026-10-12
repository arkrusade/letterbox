const assert = require("node:assert/strict");
const { suite } = require("uvu");
const {
  createTestUser,
  deleteTestUser,
  generateTestCredentials,
  listTestUsers,
  TEST_USER_FLAG,
} = require("../scripts/test-users.cjs");

function createFakeAdmin(initialUsers = []) {
  const users = [...initialUsers];
  const deletedIds = [];
  return {
    users,
    deletedIds,
    auth: {
      admin: {
        async createUser(input) {
          if (users.some((user) => user.email === input.email)) {
            return { data: { user: null }, error: new Error("User already exists.") };
          }
          const user = {
            id: `user-${users.length + 1}`,
            email: input.email,
            created_at: "2026-10-04T00:00:00Z",
            email_confirmed_at: input.email_confirm ? "2026-10-04T00:00:00Z" : null,
            app_metadata: input.app_metadata,
            user_metadata: input.user_metadata,
          };
          users.push(user);
          return { data: { user }, error: null };
        },
        async listUsers({ page, perPage }) {
          const start = (page - 1) * perPage;
          const pageUsers = users.slice(start, start + perPage);
          return {
            data: {
              users: pageUsers,
              nextPage: start + perPage < users.length ? page + 1 : null,
            },
            error: null,
          };
        },
        async deleteUser(id) {
          const index = users.findIndex((user) => user.id === id);
          if (index < 0) return { data: null, error: new Error("User not found.") };
          users.splice(index, 1);
          deletedIds.push(id);
          return { data: { user: { id } }, error: null };
        },
      },
    },
  };
}

const test = suite("test-user lifecycle");

test("creates a confirmed user with the test-only app metadata flag", async () => {
    const admin = createFakeAdmin();
    const user = await createTestUser(admin, {
      email: "postmarked-test@example.com",
      password: "test-password-123",
      displayName: "Postmarked Test",
    });

    assert.equal(user.email_confirmed_at !== null, true);
    assert.equal(user.app_metadata[TEST_USER_FLAG], true);
    assert.equal(user.user_metadata.display_name, "Postmarked Test");
});

test("requires a valid email and a long password before creating a user", async () => {
    const admin = createFakeAdmin();
    await assert.rejects(
      createTestUser(admin, { email: "not-an-email", password: "test-password-123" }),
      /valid test-user email/,
    );
    await assert.rejects(
      createTestUser(admin, {
        email: "tester@example.com",
        password: "short",
        displayName: "Tester",
      }),
      /at least 12 characters/,
    );
    await assert.rejects(
      createTestUser(admin, { email: "tester@example.com", password: "test-password-123" }),
      /display name/,
    );
    assert.equal(admin.users.length, 0);
});

test("lists and searches only tagged test users across pages", async () => {
    const users = Array.from({ length: 105 }, (_, index) => ({
      id: `test-${index}`,
      email: `tester-${index}@example.com`,
      created_at: "2026-10-04T00:00:00Z",
      email_confirmed_at: "2026-10-04T00:00:00Z",
      app_metadata: index === 104 ? {} : { [TEST_USER_FLAG]: true },
      user_metadata: { display_name: `Tester ${index}` },
    }));
    const admin = createFakeAdmin(users);

    const allTestUsers = await listTestUsers(admin);
    const queryMatches = await listTestUsers(admin, "TESTER-103");

    assert.equal(allTestUsers.length, 104);
    assert.deepEqual(queryMatches.map((user) => user.email), ["tester-103@example.com"]);
    assert.equal(queryMatches[0].displayName, "Tester 103");
    assert.equal("app_metadata" in allTestUsers[0], false);
});

test("deletes a tagged test user by email or ID, but refuses untagged users", async () => {
    const admin = createFakeAdmin([
      {
        id: "real-user",
        email: "person@example.com",
        app_metadata: {},
      },
      {
        id: "test-user",
        email: "postmarked-test@example.com",
        app_metadata: { [TEST_USER_FLAG]: true },
      },
    ]);

    await assert.rejects(deleteTestUser(admin, "person@example.com"), /No tagged test user/);
    assert.deepEqual(admin.deletedIds, []);

    const deleted = await deleteTestUser(admin, "POSTMARKED-TEST@example.com");
    assert.equal(deleted.id, "test-user");
    assert.deepEqual(admin.deletedIds, ["test-user"]);
    assert.deepEqual(admin.users.map((user) => user.id), ["real-user"]);
});

test("propagates errors returned by the Auth Admin API", async () => {
    const failure = new Error("Auth Admin unavailable.");
    const admin = {
      auth: {
        admin: {
          async listUsers() {
            return { data: null, error: failure };
          },
          async createUser() {
            return { data: { user: null }, error: failure };
          },
        },
      },
    };

    await assert.rejects(listTestUsers(admin), (error) => error === failure);
    await assert.rejects(
      createTestUser(admin, {
        email: "tester@example.com",
        password: "test-password-123",
        displayName: "Tester",
      }),
      (error) => error === failure,
    );
});

test("generates unique example.com test credentials", () => {
    const first = generateTestCredentials();
    const second = generateTestCredentials();
    assert.match(first.email, /^postmarked-test-[a-f0-9]+@example\.com$/);
    assert.ok(first.password.length >= 12);
    assert.notEqual(first.email, second.email);
    assert.notEqual(first.password, second.password);
});

test.run();
