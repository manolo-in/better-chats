import { os } from "@orpc/server";
import type { Context } from "../type.ts";

export const orpc_os = os.$context<Context>();

export const publicProcedure = orpc_os;
