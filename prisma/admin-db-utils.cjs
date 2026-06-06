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

function detectDatabaseProviderTarget(databaseUrl) {
  const normalizedValue =
    typeof databaseUrl === "string" ? databaseUrl.trim().toLowerCase() : "";

  if (
    normalizedValue.startsWith("postgresql://") ||
    normalizedValue.startsWith("postgres://")
  ) {
    return "postgresql";
  }

  if (
    normalizedValue.startsWith("file:") ||
    normalizedValue.startsWith("sqlite:") ||
    normalizedValue.includes("dev.db")
  ) {
    return "sqlite";
  }

  return "unknown";
}

function isLocalSqliteDatabaseUrl(databaseUrl) {
  return detectDatabaseProviderTarget(databaseUrl) === "sqlite";
}

function maskDatabaseTarget(databaseUrl) {
  const normalizedValue =
    typeof databaseUrl === "string" ? databaseUrl.trim() : "";

  if (!normalizedValue) {
    return "<missing>";
  }

  if (isLocalSqliteDatabaseUrl(normalizedValue)) {
    const sqliteTarget = normalizedValue.split(/[\\/]/).pop() || "database.db";
    return `file:.../${sqliteTarget}`;
  }

  try {
    const parsed = new URL(normalizedValue);
    const protocol = parsed.protocol.replace(/:$/, "");
    const host = parsed.hostname || parsed.host || "<unknown-host>";
    const pathname = parsed.pathname || "";

    return `${protocol}://...@${host}${pathname}`;
  } catch {
    return "<unparseable>";
  }
}

function allowLocalSeed() {
  return readEnvValue("ADMIN_SEED_ALLOW_LOCAL").toLowerCase() === "true";
}

module.exports = {
  allowLocalSeed,
  detectDatabaseProviderTarget,
  ensureRequiredEnvValue,
  isLocalSqliteDatabaseUrl,
  maskDatabaseTarget,
  readEnvValue,
};
