// Imports
import {
  assertObjectMatch,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.99.0/testing/asserts.ts";
import * as util from "../lib/util.ts";

const oldHome = Deno.env.get("HOME");
Deno.env.set("HOME", "/home");
Deno.test("Gets correct home.", () =>
  assertStrictEquals(util.getHome(), "/home/"));

Deno.test("pathToStore('/home/test')", () =>
  assertStrictEquals(util.pathToStore("/home/test"), "~/test"));

Deno.test("pathToStore('/not-home/test')", () =>
  assertStrictEquals(util.pathToStore("/not-home/test"), "/not-home/test"));

Deno.test("storeToPath('~/test')", () =>
  assertStrictEquals(util.storeToPath("~/test"), "/home/test"));

Deno.test("storeToPath('/not-home/test')", () =>
  assertStrictEquals(util.storeToPath("/not-home/test"), "/not-home/test"));

Deno.test("hash('text')", () =>
  assertStrictEquals(
    util.hash("text"),
    "982D9E3EB996F559E633F4D194DEF3761D909F5A3B647D1A851FEAD67C32C9D1",
  ));
Deno.test("hash('text', 'key')", () =>
  assertStrictEquals(
    util.hash("text", "key"),
    "6AFA9046A9579CAD143A384C1B564B9A250D27D6F6A63F9F20BF3A7594C9E2C6",
  ));

Deno.test("verifyPassword(passwordHash('text'), 'text')", () => {
  util.verifyPassword(util.passwordHash("text"), "text");
});

Deno.test("passwordHash('text', ''): should throw", () => {
  assertThrows(() => util.passwordHash("text", ""));
});

Deno.test("createProfileObject('text')", () => {
  assertObjectMatch(util.createProfileObject("text"), {
    name: "text",
    id: "982D9E3EB996F559E633F4D194DEF3761D909F5A3B647D1A851FEAD67C32C9D1",
    files: [],
  });
});

Deno.test("createFileObject('e3b...', 'text', 0)", () => {
  assertObjectMatch(
    util.createFileObject(
      "982D9E3EB996F559E633F4D194DEF3761D909F5A3B647D1A851FEAD67C32C9D1",
      "/text",
      0,
    ),
    {
      path: "/text",
      id: "680D60A26235C4D52D0712D48328A23AC1C8B7656201DCA5D15FE9B2A440D5E1",
      profile:
        "982D9E3EB996F559E633F4D194DEF3761D909F5A3B647D1A851FEAD67C32C9D1",
      mode: 0,
    },
  );
});

if (oldHome) {
  Deno.test("Restore $HOME (util)", () => Deno.env.set("HOME", oldHome));
}
