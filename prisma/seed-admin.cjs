const { pbkdf2Sync, randomBytes } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const HASH_ALGORITHM = "sha256";
const HASH_ITERATIONS = 120000;
const HASH_KEY_LENGTH = 32;
const HASH_PREFIX = "pbkdf2_sha256";
const DEFAULT_ADMIN_NAME = "Default Super Admin";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin123";
const MIN_ADMIN_PASSWORD_LENGTH = 10;

function readEnvValue(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}

function validateSeedPassword(password) {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `Admin seed password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters long.`,
    );
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("Admin seed password must contain letters and numbers.");
  }
}

function resolveSeedConfig() {
  const production = isProductionEnvironment();
  const username =
    readEnvValue("ADMIN_SEED_USERNAME").toLowerCase() ||
    (production ? "" : DEFAULT_ADMIN_USERNAME);
  const password =
    readEnvValue("ADMIN_SEED_PASSWORD") ||
    (production ? "" : DEFAULT_ADMIN_PASSWORD);
  const name = readEnvValue("ADMIN_SEED_NAME") || DEFAULT_ADMIN_NAME;
  const email = readEnvValue("ADMIN_SEED_EMAIL").toLowerCase() || null;

  if (!username || !password) {
    throw new Error(
      production
        ? "Set ADMIN_SEED_USERNAME and ADMIN_SEED_PASSWORD before running the admin seed in production."
        : "Admin seed requires a username and password.",
    );
  }

  if (production && password === DEFAULT_ADMIN_PASSWORD) {
    throw new Error(
      "Production admin seeds may not use the default admin123 password.",
    );
  }

  validateSeedPassword(password);

  return {
    name,
    username,
    email,
    password,
  };
}

function hashAdminPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = pbkdf2Sync(
    password,
    salt,
    HASH_ITERATIONS,
    HASH_KEY_LENGTH,
    HASH_ALGORITHM,
  );

  return [
    HASH_PREFIX,
    String(HASH_ITERATIONS),
    salt,
    derivedKey.toString("hex"),
  ].join("$");
}

async function main() {
  const seedConfig = resolveSeedConfig();
  const passwordHash = hashAdminPassword(seedConfig.password);

  await prisma.adminUser.upsert({
    where: { username: seedConfig.username },
    create: {
      name: seedConfig.name,
      username: seedConfig.username,
      email: seedConfig.email,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    update: {
      name: seedConfig.name,
      email: seedConfig.email,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  if (
    !isProductionEnvironment() &&
    seedConfig.username === DEFAULT_ADMIN_USERNAME &&
    seedConfig.password === DEFAULT_ADMIN_PASSWORD
  ) {
    console.log("Default SUPER_ADMIN is ready for local development.");
    console.log("Login: admin / admin123");
    console.log("Change this password before production.");
    return;
  }

  console.log(`SUPER_ADMIN ${seedConfig.username} is ready.`);
  console.log("Do not reuse bootstrap credentials beyond initial setup.");
}

main()
  .catch((error) => {
    console.error("Admin seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
