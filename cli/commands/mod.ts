export type DotOpts = {
  verbose: number;
  dir: string;
};

// Imports
import { Command } from "../deps.ts";
import version from "../../version.ts";
import init from "./init.ts";

let _ = new Command()
  .name("dot")
  .version(version)
  .description("A dotfile sync/manager tool.")
  .option("-d, --dir <dir:string>", "The dot config directory.", {
    global: true,
    default: "~/.dot",
  })
  .option(
    "-v, --verbose <level:number>",
    "The verbose level.",
    { default: 0, global: true },
  )
  .action(() => _.showHelp());

function addCmd(cmd: Command) {
  _ = _.command(cmd.getName(), cmd);
}

addCmd(init);

export default _;
