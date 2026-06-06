require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const {
  detectDatabaseProviderTarget,
  ensureRequiredEnvValue,
  isLocalSqliteDatabaseUrl,
  maskDatabaseTarget,
} = require("./admin-db-utils.cjs");

const prisma = new PrismaClient();

const ROLE_SORT_ORDER = {
  SUPER_ADMIN: 0,
  ADMIN: 1,
  STAFF: 2,
};

function sortAdminUsers(users) {
  return [...users].sort((leftUser, rightUser) => {
    const roleDifference =
      (ROLE_SORT_ORDER[leftUser.role] ?? 99) - (ROLE_SORT_ORDER[rightUser.role] ?? 99);

    if (roleDifference !== 0) {
      return roleDifference;
    }

    return leftUser.username.localeCompare(rightUser.username);
  });
}

async function main() {
  const databaseUrl = ensureRequiredEnvValue(
    "DATABASE_URL",
    "DATABASE_URL is missing. Set DATABASE_URL before running admin diagnostics.",
  );
  const providerTarget = detectDatabaseProviderTarget(databaseUrl);

  console.log(
    `Database provider target detected from DATABASE_URL: ${providerTarget}`,
  );
  console.log(`Using database: ${maskDatabaseTarget(databaseUrl)}`);

  if (isLocalSqliteDatabaseUrl(databaseUrl)) {
    console.warn("WARNING: This points to local SQLite, not Supabase.");
  }

  await prisma.$connect();

  const users = sortAdminUsers(
    await prisma.adminUser.findMany({
      select: {
        username: true,
        role: true,
        isActive: true,
      },
    }),
  );
  const activeSuperAdminCount = users.filter((user) => {
    return user.isActive && user.role === "SUPER_ADMIN";
  }).length;

  console.log(`AdminUser count: ${users.length}`);
  console.log(`Active SUPER_ADMIN count: ${activeSuperAdminCount}`);

  if (users.length === 0) {
    console.log("Admin users: none");
    return;
  }

  console.log("Admin users:");
  console.table(
    users.map((user) => ({
      username: user.username,
      role: user.role,
      isActive: user.isActive,
    })),
  );
}

main()
  .catch((error) => {
    console.error("Admin doctor failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
