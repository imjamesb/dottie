#!/usr/bin/env -S deno run -A --unstable
// Imports
import { exists } from "https://deno.land/std@0.99.0/fs/exists.ts";
import $ from "https://deno.land/x/cash@0.1.0-alpha.14/mod.ts";
import {
  getLatestVersion,
  getVersions,
  hasTags,
  saveVersion,
  semverToTag,
  upgradeVersion,
} from "../util/util.ts";

function error(message: string) {
  throw new Error(message);
}

$.verbose = 4;
$.env ??= Deno.env.toObject();

const user = $.env.AUTH_USER ??= "x-access-token";
const pass = $.env.AUTH_PASS ??= $.env.GITHUB_TOKEN;
if (!pass) error("Missing AUTH_PASS or GITHUB_TOKEN!");
const auth = `${user}:${pass}`;
const repo = $.env.GITHUB_REPOSITORY;
if (!repo) error("Missing GITHUB_REPOSITORY!");
const remote = `https://${auth}@github.com/${repo}`;
const msg = $.env.COMMIT_MESSAGE;
if (!msg) Deno.exit(0);

$.secret(pass);

const latest = await getLatestVersion($, remote);
const tags = hasTags(msg, "canary", "pre", "patch", "minor", "major");

let newVersion = latest;

if (tags.major) {
  newVersion = upgradeVersion(
    newVersion.version,
    (tags.canary ? "pre" : "") + "major",
  );
}
if (tags.minor) {
  newVersion = upgradeVersion(
    newVersion.version,
    (tags.canary ? "pre" : "") + "minor",
  );
}
if (tags.patch) {
  newVersion = upgradeVersion(
    newVersion.version,
    (tags.canary ? "pre" : "") + "patch",
  );
}
if ((tags.pre && !tags.canary)) {
  newVersion = upgradeVersion(newVersion.version, "pre", false);
} else if (tags.canary && latest === newVersion) {
  newVersion = upgradeVersion(newVersion.version, "pre");
}

if (newVersion.version !== latest.version) {
  if (await exists(".git/hooks")) {
    Deno.rename(".git/hooks", ".git/hooks-tmp");
  }
  await $`git remote set-url origin ${remote}`;
  await $`git config --global user.email "${user}@users.noreply.github.com"`;
  await $`git config --global user.name "${user}"`;
  await saveVersion($, newVersion.version, true, "./version.ts");

  // Generate install map.
  const versionsWithCanaries = await getVersions($, remote);
  const versions = await getVersions($, remote, false, versionsWithCanaries);
  const latestVersionWithCanary = semverToTag(
    (await getLatestVersion(
      $,
      remote,
      versionsWithCanaries,
    )).version,
  );
  const latestVersion = semverToTag(
    (await getLatestVersion($, remote, versions)).version,
  );
  await $`mkdir -p .install-map`;
  $.cwd = $.cwd + "/.install-map";
  await $`git init`;
  await $`git remote add origin ${remote}`;
  await $`git config --global user.email "${user}@users.noreply.github.com"`;
  await $`git config --global user.name "${user}"`;
  await $`git checkout --orphan install-map`;
  await Deno.writeTextFile(".install-map/latest.txt", latestVersion);
  await Deno.writeTextFile(
    ".install-map/latest-canary.txt",
    latestVersionWithCanary,
  );
  await Deno.writeTextFile(
    ".install-map/history.txt",
    versions.map(semverToTag).join("\n"),
  );
  await Deno.writeTextFile(
    ".install-map/history-canary.txt",
    versionsWithCanaries.map(semverToTag).join("\n"),
  );
  await Deno.writeTextFile(
    ".install-map/.gitignore",
    [
      "*",
      "!/latest.txt",
      "!/latest-canary.txt",
      "!/history.txt",
      "!/history-canary.txt",
    ].join("\n"),
  );
  await $`git add .`;
  await $`ls -la`;
  await $`git commit -m "Initialized install map (tagged)."`;
  await $`git push -fu origin install-map`;

  if (await exists(".git/hooks-tmp")) {
    Deno.rename(".git/hooks-tmp", ".git/hooks");
  }
  console.log("Upgraded from %s to %s", latest.version, newVersion.version);
} else {
  console.log("Same version, not updating!");
}
