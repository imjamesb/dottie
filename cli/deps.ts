// Imports
import {
  Command as Cmd,
  IHelpHandler,
} from "https://deno.land/x/cliffy@v0.19.2/command/mod.ts";
import {
  HelpGenerator as HG,
  HelpOptions,
} from "https://deno.land/x/cliffy@v0.19.2/command/help/_help_generator.ts";
import {
  bold,
  getColorEnabled,
  magenta,
  setColorEnabled,
  yellow,
} from "https://deno.land/x/cliffy@v0.19.2/command/deps.ts";
import { Table } from "https://deno.land/x/cliffy@v0.19.2/table/table.ts";

// @ts-ignore ignore
class HelpGenerator extends HG {
  /** Generate help text for given command. */
  public static generate(cmd: Command, options?: HelpOptions): string {
    // @ts-ignore ignore
    return new HelpGenerator(cmd, options).generate();
  }
  public generate(): string {
    const areColorsEnabled = getColorEnabled();
    // @ts-ignore ignore
    setColorEnabled(this.options.colors);
    const result = this.generateHeader() +
      // @ts-ignore ignore
      this.generateDescription() +
      // @ts-ignore ignore
      this.generateOptions() +
      // @ts-ignore ignore
      this.generateCommands() +
      // @ts-ignore ignore
      this.generateEnvironmentVariables() +
      // @ts-ignore ignore
      this.generateExamples() +
      "\n";
    setColorEnabled(areColorsEnabled);
    return result;
  }
  private generateHeader(): string {
    const rows = [
      [
        bold("Usage:"),
        magenta(
          // @ts-ignore ignore
          `${this.cmd.getPath()}${
            // @ts-ignore ignore
            this.cmd.getArgsDefinition()
              ? // @ts-ignore ignore
                " " + this.cmd.getArgsDefinition()
              : ""
          }`,
        ),
      ],
    ];
    // @ts-ignore ignore
    const version: string | undefined = this.cmd.getVersion();
    if (version) {
      // @ts-ignore ignore
      rows.push([bold("Version:"), yellow(`${this.cmd.getVersion()}`)]);
    }
    return "\n" +
      Table.from(rows)
        // @ts-ignore ignore
        .indent(this.indent)
        .padding(1)
        .toString() +
      "\n";
  }
}

// Exports

export class Command<
  // deno-lint-ignore no-explicit-any
  CO extends Record<string, any> | void = any,
  // deno-lint-ignore no-explicit-any
  CA extends Array<unknown> = CO extends number ? any : [],
  // deno-lint-ignore no-explicit-any
  CG extends Record<string, any> | void = CO extends number ? any : void,
  // deno-lint-ignore no-explicit-any
  PG extends Record<string, any> | void = CO extends number ? any : void,
  // deno-lint-ignore no-explicit-any
  P extends Command | undefined = CO extends number ? any : undefined,
> extends Cmd<CO, CA, CG, PG, P> {
  /**
   * Set command help.
   * @param help Help string or method that returns the help string.
   */
  public help(
    help:
      | string
      | IHelpHandler<Partial<CO>, Partial<CA>, CG, PG>
      | HelpOptions,
  ): this {
    if (typeof help === "string") {
      // @ts-ignore ignore
      this.cmd._help = () => help;
    } else if (typeof help === "function") {
      // @ts-ignore ignore
      this.cmd._help = help;
    } else {
      // @ts-ignore ignore
      this.cmd._help = (cmd: Command): string =>
        HelpGenerator.generate(cmd, help);
    }
    return this;
  }
}
