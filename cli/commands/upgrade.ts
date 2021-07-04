// Imports
import type { DotOpts } from "./mod.ts";
import { valid } from "https://deno.land/x/semver@v1.4.0/mod.ts";
import { Cash } from "https://deno.land/x/cash@0.1.0-alpha.13/mod.ts";
import { Command } from "../deps.ts";
import cversion from "../../version.ts";
import DotError from "../../lib/DotError.ts";

export type UpgradeOpts = {
  canary?: true;
};

export type UpgradeArgs = [version?: string];

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

function target(version: string) {
  return `https://github.com/ihack2712/dottie/releases/download/${version}/dot-${Deno.build.target}.zip`;
}

function versionList(canary: boolean) {
  return `https://raw.githubusercontent.com/ihack2712/dottie/install-map/history${
    canary ? "-canary" : ""
  }.txt`;
}

function versionLatest(canary: boolean) {
  return `https://raw.githubusercontent.com/ihack2712/dottie/install-map/latest${
    canary ? "-canary" : ""
  }.txt`;
}

async function getVersions(canary = false): Promise<string[]> {
  return (await (await fetch(versionList(canary))).text()).trim().split(/\s+/);
}

async function getLatestVersion(canary = false): Promise<string> {
  return (await (await fetch(versionLatest(canary))).text()).trim();
}

const _mode = 33279;

function download(
  from: string,
  to: string,
  showProgress = true,
): Promise<void> {
  return new Promise<void>((resolve, reject) =>
    fetch(from).then((response) => {
      if (!response.ok) {
        return reject(new Error("Request did not return an ok response code."));
      }
      if (!response.body) {
        return reject(new Error("Request did not return a body!"));
      }
      const reader = response.body.getReader();
      const bytes = Number(response.headers.get("content-type"));
      if (bytes < 1) {
        return Deno.writeTextFile(to, "").then(resolve).catch(reject);
      }
    }).catch(reject)
  );
}

export default new Command<UpgradeOpts, UpgradeArgs, DotOpts>()
  .name("upgrade")
  .description("Upgrade or degrade dottie.")
  .arguments("[version:string]")
  .option(
    "-c, --canary",
    "Install latest canery version. If in use with --list, include canary versions in history.",
  )
  .option("-l, --list", "List the available.", {
    action: async (opts) => {
      try {
        console.log(" - %s", (await getVersions(!!opts.canary)).join("\n - "));
      } catch {
        throw new DotError("Could not fetch version list!");
      }
    },
  })
  .action(async (opts, _version) => {
    let version!: string;
    let tag!: string;
    try {
      tag = await getLatestVersion(!!opts.canary);
      version = tagToSemver(tag)!;
      if (!tag) throw 1;
    } catch {
      throw new DotError("Could not fetch version list!");
    }
    const $ = new Cash();
    $.verbose = opts.verbose ?? $.verbose;
    if (opts.verbose) console.log("Checking for unzip!");
    try {
      await $`command -v unzip`;
    } catch (err) {
      console.log(err);
      throw new Error("unzip is required to upgrade!");
    }
    if (opts.verbose) {
      console.log("Upgrading from '%s' to '%s'", cversion, version);
    }
    await download(target(version), Deno.env.get("HOME") + "/.dotbin/dot.zip");
  });
