import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins/bearer";
import { deviceAuthorization } from "better-auth/plugins/device-authorization";
import { username } from "better-auth/plugins/username";
import { nextCookies } from "better-auth/next-js";

import { isValidUsername } from "./core/username";
import { db } from "./db/client";
import { account, deviceCode, rateLimit, session, user, verification } from "./db/schema";
import { allocateUniqueUsername, mapGithubProfileToUser } from "./auth/github-username";

export const auth = betterAuth({
  appName: "dotlet",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  rateLimit: {
    enabled: true,
    storage: "database",
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      deviceCode,
      rateLimit,
    },
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      scope: ["read:user", "user:email"],
      mapProfileToUser: (profile) => mapGithubProfileToUser(profile),
    },
  },
  plugins: [
    username({
      minUsernameLength: 1,
      maxUsernameLength: 255,
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
    user: {
      create: {
        before: async (createdUser) => {
          const usernameValue = createdUser.username as string;
          if (!usernameValue) {
            return { data: createdUser };
          }

          const uniqueUsername = await allocateUniqueUsername(usernameValue, createdUser.email);
          if (uniqueUsername === usernameValue) {
            return { data: createdUser };
          }

          return {
            data: {
              ...createdUser,
              username: uniqueUsername,
            },
          };
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
  },
});
