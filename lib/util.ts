// Imports
import type { File, ID, Profile } from "./types.ts";
import { resolve } from "https://deno.land/std@0.99.0/path/mod.ts";
import {
  HmacSha256,
  Sha256,
} from "https://deno.land/std@0.99.0/hash/sha256.ts";
import DotError from "./DotError.ts";

let home: string | null;
export function getHome() {
  if (home !== undefined) return home;
  const _home = Deno.env.get("HOME");
  if (_home) return home = _home + "/";
  return home = null;
}

export function hash(message: string, key?: string): string {
  return (key ? new HmacSha256(key) : new Sha256()).update(message).hex()
    .toUpperCase();
}

export function passwordHash(password: string, salt?: string): string {
  salt ??= crypto.getRandomValues(new Uint8Array(16)).reduce(
    (p, c) => p += c.toString(16).toUpperCase().padStart(2, "0"),
    "",
  );
  if (salt.length !== 32) throw new Error("Salt length must be 32!");
  return salt + hash(salt + password);
}

export function verifyPassword(data: string, password: string): boolean {
  return data ===
    passwordHash(password, data.substring(0, 32));
}

export function createProfileObject(name: string): Profile {
  return {
    name,
    id: hash(name),
    files: [],
  };
}

export function createFileObject(
  profile: ID,
  path: string,
  mode: number,
): File {
  path = pathToStore(path);
  return {
    profile,
    id: hash(path),
    path,
    mode,
  };
}

export function pathToStore(path: string): string {
  const home = getHome();
  if (home === null) {
    throw new DotError(
      "Cannot convert path to storage type path. Missing $HOME!",
    );
  }
  if (path.substring(0, home.length) === home) {
    path = "~" + resolve(path.substring(home.length - 1, path.length));
  } else {
    path = resolve(path);
  }
  return path;
}

export function storeToPath(path: string): string {
  const home = getHome();
  if (path.substring(0, 2) === "~/") {
    if (home === null) {
      throw new DotError(
        "Cannot convert storage type path to path. Missing $HOME!",
      );
    }
    path = home + path.substring(2, path.length);
  }
  return resolve(path);
}
