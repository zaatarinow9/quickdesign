const { pbkdf2Sync, randomBytes } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const HASH_ALGORITHM = "sha256";
const HASH_ITERATIONS = 120000;
const HASH_KEY_LENGTH = 32;
const HASH_PREFIX = "pbkdf2_sha256";
const MIN_ADMIN_PASSWORD_LENGTH = 10;

function readEnvValue(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function ensureRequiredEnvValue(name, message) {
  const value = readEnvValue(name);

  if (!value) {
    throw new Error(message);
  }

  return value;
}

function normalizeAdminUsername(value) {
  return value.trim().toLowerCase();
}

function validateSeedPassword(password) {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `ADMIN_SEED_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters long.`,
    );
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error(
      "ADMIN_SEED_PASSWORD must contain at least one letter and one number.",
    );
  }
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
  ensureRequiredEnvValue(
    "DATABASE_URL",
    "DATABASE_URL is missing. Set DATABASE_URL before running the SUPER_ADMIN bootstrap.",
  );

  const username = normalizeAdminUsername(
    ensureRequiredEnvValue(
      "ADMIN_SEED_USERNAME",
      "ADMIN_SEED_USERNAME is missing. Set ADMIN_SEED_USERNAME before running the SUPER_ADMIN bootstrap.",
    ),
  );
  const password = ensureRequiredEnvValue(
    "ADMIN_SEED_PASSWORD",
    "ADMIN_SEED_PASSWORD is missing. Set ADMIN_SEED_PASSWORD before running the SUPER_ADMIN bootstrap.",
  );
  const seedName = readEnvValue("ADMIN_SEED_NAME");
  const seedEmail = readEnvValue("ADMIN_SEED_EMAIL").toLowerCase() || null;
  const name = seedName || username;
  const email = seedEmail;

  validateSeedPassword(password);
  await prisma.$connect();

  const passwordHash = hashAdminPassword(password);
  const existingUser = await prisma.adminUser.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    await prisma.adminUser.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
        ...(seedName
          ? {
              name,
            }
          : {}),
        ...(seedEmail
          ? {
              email,
            }
          : {}),
      },
    });
  } else {
    await prisma.adminUser.create({
      data: {
        name,
        username,
        email,
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
  }

  console.log(`SUPER_ADMIN ${username} is ready.`);
  console.log("Do not reuse bootstrap credentials beyond initial setup.");
}

main()
  .catch((error) => {
    console.error("SUPER_ADMIN bootstrap failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
