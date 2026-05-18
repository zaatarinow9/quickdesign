const { pbkdf2Sync, randomBytes } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const HASH_ALGORITHM = "sha256";
const HASH_ITERATIONS = 120000;
const HASH_KEY_LENGTH = 32;
const HASH_PREFIX = "pbkdf2_sha256";

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
  const passwordHash = hashAdminPassword("admin123");

  await prisma.adminUser.upsert({
    where: { username: "admin" },
    create: {
      name: "Default Super Admin",
      username: "admin",
      email: null,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    update: {
      name: "Default Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log("Default SUPER_ADMIN is ready.");
  console.log("Login: admin / admin123");
  console.log("Change this password before production.");
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
