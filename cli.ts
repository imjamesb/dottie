#!/usr/bin/env -S deno run -A --no-check
// Imports
import dot from "./cli/commands/mod.ts";
import DotError from "./lib/DotError.ts";

try {
  await dot.parse();
} catch (error) {
  if (error instanceof DotError) {
    console.error("Error:", error.message);
    Deno.exit(1);
  } else {
    throw error;
  }
}
