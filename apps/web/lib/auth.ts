import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins/bearer";
import { deviceAuthorization } from "better-auth/plugins/device-authorization";
import { username } from "better-auth/plugins/username";
import { nextCookies } from "better-auth/next-js";
import { isValidUsername } from "./core/username";
import { db } from "./db/client";
import { account, deviceCode, session, user, verification } from "./db/schema";

export const auth = betterAuth({
  appName: "dotlet",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      deviceCode,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username({
      maxUsernameLength: 16,
      minUsernameLength: 3,
      usernameValidator: isValidUsername,
    }),
    deviceAuthorization({
      verificationUri: "/oauth/device",
      validateClient: async (clientId) => clientId === "dotlet-cli",
    }),
    bearer(),
    nextCookies(),
  ],
  databaseHooks: {
    // user: {
    //   create: {
    //     after: async (createdUser) => {
    //       if (!createdUser?.id) {
    //         return;
    //       }
    //       await db.insert(devices).values({
    //         userId: createdUser.id,
    //         name: "personal",
    //       });
    //     },
    //   },
    // },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
  },
});
