// Imports
import { Command } from "../deps.ts";
import version from "../../version.ts";
import init from "./init.ts";
import upgrade from "./upgrade.ts";

export type DotOpts = {
  verbose: number;
  dir: string;
};

let _ = new Command()
  .name("dot")
  .version(version)
  .versionOption("-V, --version", "Show the version number for this program.", {
    action: () => {
      if (Deno.args.some((value) => value == "-V")) {
        console.log("dot " + version); // Short version.
        return;
      }
      console.log(
        [
          "dot %s",
          "deno %s",
          "v8 %s",
          "typescript %s",
        ].join("\n"),
        version,
        Deno.version.deno,
        Deno.version.v8,
        Deno.version.typescript,
      );
    },
  })
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
addCmd(upgrade);

export default _;
