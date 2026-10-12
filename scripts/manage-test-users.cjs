#!/usr/bin/env node
if (Number(process.versions.node.split(".")[0]) < 22) {
  console.error("The Supabase client requires Node 22 or newer to run this CLI.");
  process.exit(1);
}

const { createClient } = require("@supabase/supabase-js");
const {
  createTestUser,
  deleteTestUser,
  generateTestCredentials,
  listTestUsers,
} = require("./test-users.cjs");

const [command, ...args] = process.argv.slice(2);

function usage() {
  console.error(`Usage:
  npm run test-users -- create [email] --name <display-name>
  npm run test-users -- list [email-or-id-search]
  npm run test-users -- delete <email-or-id> --confirm`);
}

function getAdminClient() {
  const url = process.env.POSTMARKED_TEST_SUPABASE_URL;
  const key = process.env.POSTMARKED_TEST_SUPABASE_ADMIN_KEY;
  if (!url || !key) {
    throw new Error(
      "Set POSTMARKED_TEST_SUPABASE_URL and POSTMARKED_TEST_SUPABASE_ADMIN_KEY for a dedicated test project.",
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("POSTMARKED_TEST_SUPABASE_URL must be a valid URL.");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("The test Supabase URL must use HTTP or HTTPS.");
  }
  const isLocal =
    parsedUrl.hostname === "localhost" ||
    parsedUrl.hostname === "127.0.0.1" ||
    parsedUrl.hostname === "::1";
  if (!isLocal && process.env.POSTMARKED_TEST_SUPABASE_ALLOW_REMOTE !== "I_UNDERSTAND") {
    throw new Error(
      "Remote projects are blocked by default. Set POSTMARKED_TEST_SUPABASE_ALLOW_REMOTE=I_UNDERSTAND only for a dedicated test project.",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function printUsers(users) {
  if (users.length === 0) {
    console.log("No tagged test users found.");
    return;
  }
  for (const user of users) {
    console.log(
      `${user.id}\t${user.displayName || "(no name)"}\t${user.email || "(no email)"}\t${user.emailConfirmed ? "confirmed" : "unconfirmed"}\t${user.createdAt || ""}`,
    );
  }
}

async function main() {
  if (command === "create") {
    let email;
    let displayName;
    for (let index = 0; index < args.length; index += 1) {
      if (args[index] === "--name") {
        if (displayName || !args[index + 1]) {
          throw new Error("Create requires one display name after --name.");
        }
        displayName = args[index + 1];
        index += 1;
      } else if (args[index].startsWith("--")) {
        throw new Error(`Unknown create option: ${args[index]}`);
      } else if (email) {
        throw new Error("Create accepts at most one email address.");
      } else {
        email = args[index];
      }
    }
    if (!displayName) throw new Error("Create requires --name <display-name>.");

    const generated = generateTestCredentials();
    const credentials = {
      ...generated,
      ...(email ? { email } : {}),
      displayName,
    };
    const user = await createTestUser(getAdminClient(), credentials);
    console.log(`Created tagged test user ${credentials.displayName}: ${user.email} (${user.id}).`);
    console.log(`Password (shown once): ${credentials.password}`);
    return;
  }

  if (command === "list") {
    if (args.length > 1) throw new Error("List accepts at most one search term.");
    printUsers(await listTestUsers(getAdminClient(), args[0] || ""));
    return;
  }

  if (command === "delete") {
    const [identifier, confirmation, ...extra] = args;
    if (!identifier || confirmation !== "--confirm" || extra.length) {
      throw new Error("Deleting a test user requires an identifier and the --confirm flag.");
    }
    const user = await deleteTestUser(getAdminClient(), identifier);
    console.log(`Deleted tagged test user ${user.email} (${user.id}).`);
    return;
  }

  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
