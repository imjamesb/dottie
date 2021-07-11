// Imports
import type { DotOpts } from "./mod.ts";
import { basename, dirname } from "https://deno.land/std@0.100.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.100.0/fs/exists.ts";
import { valid } from "https://deno.land/x/semver@v1.4.0/mod.ts";
import { Cash } from "https://deno.land/x/cash@0.1.0-alpha.13/mod.ts";
import { Command } from "../deps.ts";
import cversion from "../../version.ts";
import DotError from "../../lib/DotError.ts";

export type UpgradeOpts = {
  canary?: true;
  version?: string;
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

export function semverToTag(version: string): string {
  version = version.trim();
  const [_, major, minor, patch, , suffix, , pre] = [
    ...(version.match(/^(\d+)\.(\d+)\.(\d+)(\-(\w+)(\.(\d+))?)?$/)) || [],
  ];
  if (!_) throw new Error("Invalid semver version: " + version);
  return `${
    suffix !== undefined ? suffix + "/" : ""
  }${major}.${minor}.${patch}${pre !== undefined ? "/" + pre : ""}`;
}

function target(version: string) {
  return `https://github.com/ihack2712/dottie/releases/download/${
    semverToTag(version)
  }/dot-${Deno.build.target}.zip`;
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

const mode = 33279;

const encoder = new TextEncoder();

type Sizes = "b" | "kb" | "mb";
const sizes: [size: number, code: Sizes, display: string][] = [
  [1, "b", "bytes"],
  [1024, "kb", "KiB"],
  [1024 * 1024, "mb", "MiB"],
];
function formatSize(
  bytes: number,
  forceTo?: Sizes,
): [size: string, kind: Sizes] {
  if (forceTo) {
    if (forceTo === "b") return [bytes + " b", "b"];
    if (forceTo === "kb") return [(bytes / 1024) + " KiB", "kb"];
    if (forceTo === "mb") return [(bytes / (1024 * 1024)) + " MiB", "mb"];
    return [bytes + " bytes", "b"];
  }
  for (let i = sizes.length - 1; i > 0; i--) {
    const [currentSize, currentCode, currentDisplay] = sizes[i - 1];
    const [nextSize, nextCode, nextDisplay] = sizes[i];
    const next = bytes / nextSize;
    const nextStr = next.toFixed(1) + " " + nextDisplay;
    if (next >= 1) return [nextStr, nextCode];
    const current = bytes / currentSize;
    if (current < 1) continue;
    const currentStr = current.toFixed(1) + " " + currentDisplay;
    if (currentStr.length > 4) return [nextStr, nextCode];
    return [currentStr, currentCode];
  }
  return [bytes + " bytes", "b"];
}

async function download(
  from: string,
  to: string,
  version: string,
): Promise<void> {
  const response = await fetch(from);
  if (!response.ok) throw new Error("Request returned a non-ok status code.");
  if (!response.body) throw new Error("Request does not include a body!");
  if (!response.headers.has("content-length")) {
    throw new Error("Request did not return a content-length header!");
  }
  if (!/^\d+$/g.test(response.headers.get("content-length")!)) {
    throw new Error("Invalid content-length header!");
  }
  const totalBytes = Number(response.headers.get("content-length"));
  await Deno.mkdir(dirname(to), { recursive: true });
  if (totalBytes < 1) {
    await Deno.writeTextFile(to, "");
    return;
  }
  if (await exists(to)) Deno.remove(to);
  const reader = response.body.getReader();
  const writer = await Deno.open(to, {
    create: true,
    mode: 0o666,
    write: true,
  });
  let bytesReceived = 0;
  const _totalBytesReceivedStr = formatSize(totalBytes);
  const _ = _totalBytesReceivedStr[0];
  await Deno.stdout.write(new Uint8Array([13, 27, 91, 50, 75]));
  await Deno.stdout.write(
    encoder.encode(
      "Downloading Dottie (" +
        (bytesReceived / totalBytes * 100).toFixed(2).padStart(6) + "%)",
    ),
  );
  while (bytesReceived < totalBytes) {
    const chunk = await reader.read();
    if (chunk.value) {
      bytesReceived += chunk.value.length;
      await writer.write(chunk.value);
      const _bytes = formatSize(bytesReceived, _totalBytesReceivedStr[1]);
      await Deno.stdout.write(
        encoder.encode(
          "\x1b[8D" +
            (bytesReceived / totalBytes * 100).toFixed(2).padStart(6) +
            "\x1b[2C",
        ),
      );
    }
    if (chunk.done) break;
  }
  writer.close();
  await Deno.stdout.write(
    encoder.encode("\r\x1b[2KDownload complete! (" + to + ")\n"),
  );
}

export default new Command<UpgradeOpts, UpgradeArgs, DotOpts>()
  .name("upgrade")
  .description("Upgrade or degrade dottie.")
  .option(
    "-c, --canary",
    "Install latest canery version. If in use with --list, include canary versions in history.",
  )
  .option(
    "-x, --version [version:string]",
    "The version to install, for instance 0.1.0, or canary/0.1.0/1.",
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
  .env("DOT_INSTALL", "The installation directory of where to install dottie.")
  .action(async (opts) => {
    // deno-lint-ignore prefer-const
    let version!: string;
    let tag: string = opts.version!;
    if (tag === undefined) {
      try {
        console.log("Fetching latest version...");
        tag = await getLatestVersion(!!opts.canary);
        if (!tag) throw 1;
      } catch (error) {
        if (opts.verbose) console.log(error);
        throw new DotError("Could not fetch version list!");
      }
    }
    version = tagToSemver(tag)!;
    if (!version) throw new DotError("Could not convert tag to version.");
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
    const installDir =
      (Deno.env.get("DOT_INSTALL") ?? (Deno.env.get("HOME") + "/.dotbin"));
    await download(
      target(version),
      installDir + "/dot.zip",
      version,
    );
    await $
      `unzip -d "${installDir}" -o "${installDir}/dot.zip"&&rm -rf "${installDir}/dot.zip"`;
    const ext = (Deno.build.os === "windows" ? ".exe" : "");
    try {
      await Deno.remove(installDir + "/dot" + ext, { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    Deno.rename(
      installDir + "/dot-" + Deno.build.target + ext,
      installDir + "/dot" + ext,
    );
    try {
      await $`command -v dot`;
    } catch {
      console.log("Dottie was not found in your PATH variable.");
      console.log("You should probably add it.");
      console.log();
      console.log('    export PATH="%s:$PATH"', installDir);
      console.log();
    }
    console.log("Upgrade completed!");
  });
