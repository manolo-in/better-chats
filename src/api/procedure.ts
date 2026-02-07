import { os } from "@orpc/server";

type StaticContextORPC = {};

type Context = StaticContextORPC;

export const o = os.$context<Context>();

export const publicProcedure = o;
