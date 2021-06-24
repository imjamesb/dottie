// Imports
import type { DotOpts } from "./mod.ts";
import { Command } from "../deps.ts";
import { initialize } from "../../lib/api.ts";

export type InitOpts = {
  branch: string;
  force?: true;
};

export type InitArgs = [remote: string];

export default new Command<InitOpts, InitArgs, DotOpts>()
  .name("init")
  .description("Initialize a new dot config directory.")
  .arguments("<remote:string>")
  .option(
    "-b, --branch <name:string>",
    "The branch name to use when initializing.",
    { default: "main" },
  )
  .option(
    "-f, --force",
    "Overwrite the target directory if it already exsits.",
  )
  .env("DOTPASS=<value:string>", "The master password used to encrypt files.")
  .env(
    "SAVEPASS=<value:string>",
    "Store the master in plain text, this will not be commited (y to store).",
  )
  .action(async (opts, remote) => {
    await initialize(opts.dir, {
      branchName: opts.branch,
      force: opts.force,
      remote,
      verbose: opts.verbose,
      password: Deno.env.get("DOTPASS"),
      storePlainPassword: Deno.env.get("SAVEPASS") == "y",
    });
  });
