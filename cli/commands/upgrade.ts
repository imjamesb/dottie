// Imports
import type { DotOpts } from "./mod.ts";
import { Command } from "../deps.ts";

export type UpgradeOpts = {
  canary?: true;
};

export type UpgradeArgs = [version?: string];

function _target(version: string) {
  return `https://github.com/ihack2712/dottie/releases/download/${version}/dot-${Deno.build.target}.zip`;
}

function versionList(canary: boolean) {
  return `https://raw.githubusercontent.com/ihack2712/dottie/install-map/history${
    canary ? "-canary" : ""
  }.txt`;
}

async function getVersions(canary = false): Promise<string[]> {
  return (await (await fetch(versionList(canary))).text()).trim().split(/\s+/);
}

const _mode = 33279;

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
        console.error("error: Could not fetch version list!");
      }
    },
  })
  .action(async (_opts, _version) => {
    console.error("error: Not implemented!");
    await Promise.resolve();
    Deno.exit(1);
  });
