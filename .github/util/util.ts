// Imports
import type { Cash } from "https://deno.land/x/cash@0.1.0-alpha.14/mod.ts";
import {
  inc,
  maxSatisfying,
  ReleaseType,
  sort,
  valid,
} from "https://deno.land/x/semver@v1.4.0/mod.ts";

const svopts = {
  includePrerelease: true,
  loose: false,
};

export function tagToSemver(tags: string): string | null {
  const parts: string[] = tags.split("/");
  if (parts.length == 3) {
    if (!(parts[1] = valid(parts[1])!)) {
      throw new Error("Invalid semver version!");
    }
    if (parts[0] !== "canary") throw new Error("Invalid semver extension!");
    if (!/^\d+$/g.test(parts[2])) {
      throw new Error("Invalid semver extension version!");
    }
    return parts[1] + "-" + parts[0] + "." + parts[2];
  } else if (parts.length === 1) return parts[0];
  else throw new Error("Invalid tag!");
}

export function filterTagsToVersions(tags: string[]): string[] {
  return tags.filter((tag) => !!tag);
}

export async function getVersions($: Cash, remote: string): Promise<string[]> {
  return semverSort(filterTagsToVersions(
    (await $`git ls-remote -q --tags ${remote}`
      .stdout()).trim().replace(/\^\{\}/gi, "").substring(58)
      .split(/\r*\n+\w+\t\w+\/\w+\//gi).map((tag) => tagToSemver(tag)!),
  ));
}

export async function getLatestVersion(
  $: Cash,
  remote: string,
): Promise<{ canary: boolean; version: string }> {
  const version = ((maxSatisfying(
    await getVersions($, remote) as string[],
    ">= 0",
    svopts,
  )) as string ||
    "0.1.0") as unknown as string & { canary: boolean };
  return { version, canary: version.includes("canary") };
}

const _semverToTag1 = /^\d+\.\d+\.\d+$/g;
const _semverToTag2 = /^\d+\.\d+\.\d+\-canary\.\d+$/g;

export function semverToTag(version: string): string {
  version = version.trim();
  if (_semverToTag1.test(version)) {
    version = valid(version, svopts)!;
    if (!version) throw new Error("Invalid semver version: " + version);
    return version;
  }
  if (_semverToTag2.test(version)) {
    const v = valid(version.substring(0, version.indexOf("-")), svopts);
    if (!v) throw new Error("Invalid semver version: " + version);
    return "canary/" + v + "/" +
      version.substring(version.lastIndexOf(".") + 1);
  }
  throw new Error("Invalid semver version: " + version);
}

export function semverSort(tags: string[]): string[] {
  return sort(tags, svopts);
}

export function hasTags<X extends string[]>(
  str: string,
  ...tags: X
): Record<X[number], boolean> {
  const out: Record<X[number], boolean> = {} as Record<X[number], boolean>;
  for (const tag of tags) {
    (out as unknown as Record<string, boolean>)[tag] = str.includes("#" + tag);
  }
  return out;
}

export function hasAllTags(str: string, ...tags: string[]) {
  return tags.every((tag) => str.includes("#" + tag));
}

export function upgradeVersion(
  current: string,
  type: string,
  canary = true,
): { version: string; canary: boolean } {
  const version = inc(
    current,
    type as ReleaseType,
    { includePrerelease: true, loose: true },
    canary ? "canary" : undefined,
  )! as string & { canary: boolean };
  return { canary: version.includes("canary"), version };
}

async function saveVersionToFile(
  version: string,
  isSemver = true,
  path = "./version.ts",
) {
  if (!isSemver) version = tagToSemver(version)!;
  if (!version) throw new Error("Invalid version!");
  await Deno.writeTextFile(path, `export default "${version}";\n`);
}

async function saveVersionToGit($: Cash, version: string, isSemver = true) {
  if (isSemver) version = semverToTag(version);
  if (!version) throw new Error("Invalid version!");
  await $`git add version.ts`;
  await $`git commit -m "Updated version!"`;
  await $`git tag "${version}"`;
  await $`git push -u origin "${version}"`;
}

export async function saveVersion(
  $: Cash,
  version: string,
  isSemver = true,
  path = "./version.ts",
) {
  version = version.trim();
  await saveVersionToFile(version, isSemver, path);
  await generateBinaries($);
  await saveVersionToGit($, version, isSemver);
}

export async function generateBinaries(
  $: Cash,
  targets: [target: string, executableName: string][] = [
    ["x86_64-unknown-linux-gnu", "dot-x86_64-unknown-linux-gnu"],
    ["x86_64-pc-windows-msvc", "dot-x86_64-pc-windows-msvc.exe"],
    ["x86_64-apple-darwin", "dot-x86_64-apple-darwin"],
    ["aarch64-apple-darwin", "dot-aarch64-apple-darwin"],
  ],
) {
  for (const target of targets) {
    // deno-fmt-ignore
    await $`deno compile -o dot-${target[0]} --target ${target[0]} -A --no-check cli.ts`;
    await $`zip dot-${target[0]} ${target[1]}`;
  }
}
