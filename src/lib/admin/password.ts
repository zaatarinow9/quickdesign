import {
  pbkdf2 as pbkdf2Callback,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const pbkdf2 = promisify(pbkdf2Callback);
const HASH_ALGORITHM = "sha256";
const HASH_ITERATIONS = 120_000;
const HASH_KEY_LENGTH = 32;
const HASH_PREFIX = "pbkdf2_sha256";

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await pbkdf2(
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

export async function verifyAdminPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [prefix, iterationsRaw, salt, storedHash] = passwordHash.split("$");
  const iterations = Number.parseInt(iterationsRaw ?? "", 10);

  if (
    prefix !== HASH_PREFIX ||
    !Number.isFinite(iterations) ||
    iterations <= 0 ||
    !salt ||
    !storedHash
  ) {
    return false;
  }

  const derivedKey = await pbkdf2(
    password,
    salt,
    iterations,
    HASH_KEY_LENGTH,
    HASH_ALGORITHM,
  );
  const storedBuffer = Buffer.from(storedHash, "hex");

  return (
    storedBuffer.length === derivedKey.length &&
    timingSafeEqual(storedBuffer, derivedKey)
  );
}
