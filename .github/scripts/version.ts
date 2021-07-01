#!/usr/bin/env -S deno run -A --no-check --unstable
import version from "../../version.ts";
import { semverToTag } from "../util/util.ts";
const arg = Deno.args[0] ?? "semver";

const encoder = new TextEncoder();

if (arg === "semver" || version === "latest") {
  Deno.stdout.writeSync(encoder.encode(version));
} else if (arg === "tag") {
  Deno.stdout.writeSync(encoder.encode(semverToTag(version)));
} else {
  console.error("error: unknown version type!");
  Deno.exit(1);
}
