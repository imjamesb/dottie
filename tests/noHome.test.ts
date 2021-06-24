// Imports
import {
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.99.0/testing/asserts.ts";
import * as util from "../lib/util.ts";

Deno.env.delete("HOME");
Deno.test("getHome() is null", () => assertStrictEquals(util.getHome(), null));

Deno.test("pathToStore('/home/test'): Should throw", () => {
  assertThrows(() => util.pathToStore("/home/test"));
});

Deno.test("storeToPath('~/test'): Should throw", () => {
  assertThrows(() => util.storeToPath("~/test"));
});
