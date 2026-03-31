import { toNextJsHandler } from "better-auth/adapters/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
