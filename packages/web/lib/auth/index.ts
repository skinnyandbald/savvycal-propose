import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      mapProfileToUser: (profile) => {
        const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase();
        if (!allowedEmail) {
          throw new APIError("INTERNAL_SERVER_ERROR", { message: "ALLOWED_EMAIL is not configured" });
        }
        if (profile.email?.toLowerCase() !== allowedEmail) {
          throw new APIError("FORBIDDEN", { message: "Email not authorized" });
        }
        return {};
      },
    },
  },
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
});
