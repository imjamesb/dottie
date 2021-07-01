// Imports
import type { DotInitOpts } from "./types.ts";
import { exists } from "https://deno.land/std@0.99.0/fs/exists.ts";
import { basename, resolve } from "https://deno.land/std@0.99.0/path/mod.ts";
import { Cash } from "https://deno.land/x/cash@0.1.0-alpha.13/mod.ts";
import DotError from "./DotError.ts";
import { passwordHash, storeToPath } from "./util.ts";

export async function initialize(dir: string, options?: Partial<DotInitOpts>) {
  dir = resolve(Deno.cwd(), storeToPath(dir));
  options ??= {};
  options.branchName ??= "main";
  const branch = options.branchName.replace(/./g, (s) => "\\" + s);
  const $ = new Cash({ cwd: dir });
  $.verbose = options.verbose ?? $.verbose;
  if ($.verbose) {
    console.log('Creating dotfiles config directory "%s"', basename(dir));
  }
  if (await exists(dir)) {
    if (options.force !== true) {
      throw new DotError("Target directory already exists!");
    }
    if ($.verbose) console.log("Overwriting target...");
    await Deno.remove(dir, { recursive: true });
  }
  await Deno.mkdir(dir, {
    recursive: true,
    mode: 0o755,
  });
  await $`git init`;
  if (options.branchName !== "master") {
    if ($.verbose) console.log('Renaming target to "%s"', options.branchName);
    await $`git checkout -b ${branch}`;
  }
  if ($.verbose) console.log("Writing default dot template.");
  await Deno.mkdir(resolve(dir, "./profiles/main"), {
    mode: 0o755,
    recursive: true,
  });
  await Deno.writeTextFile(resolve(dir, "./profiles/main/_"), "", {
    mode: 0o644,
  });
  await Deno.writeTextFile(resolve(dir, "./_"), "main 0 main\n", {
    mode: 0o644,
  });
  await Deno.writeTextFile(resolve(dir, "./current"), "main", { mode: 0o644 });
  await Deno.writeTextFile(
    resolve(dir, "./.gitignore"),
    [
      "*",
      "!/.gitignore",
      "!/README.md",
      "!/_",
      "!/passwordHash",
      "!/profiles/",
      "!/profiles/*/",
      "!/profiles/*/*",
      "/profiles/*/.*",
    ].join("\n") + "\n",
    {
      mode: 0o644,
    },
  );
  if (options.password) {
    if ($.verbose) console.log("Creating a passwordHash file.");
    await Deno.writeTextFile(
      resolve(dir, "./passwordHash"),
      passwordHash(options.password) + "\n",
      { mode: 0o644 },
    );
    if (options.storePlainPassword === true) {
      if ($.verbose) {
        console.log(
          "\x1b[31mWARNING: $SAVEPASS: Also storing master password in plain text, it is not recommended to use this option!\x1b[39m",
        );
      }
      await Deno.writeTextFile(
        resolve(dir, "./.password"),
        options.password + "\n",
        { mode: 0o644 },
      );
    }
  }
  await $`git add . && git commit -m "Initial commit.."`;
  if (options.remote) {
    await $`git remote add origin ${
      options.remote.replace(/./g, (s) => "\\" + s)
    }`;
  }
}
