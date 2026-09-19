import { headers } from "next/headers";

import { OauthDeviceFlow } from "@/components/oauth-device-flow";
import { auth } from "@/lib/auth";
import { AuthHeader } from "@/components/auth-header";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Authorize CLI",
  description: "Approve dotlet CLI access for your account.",
  path: "/oauth/device",
  noIndex: true,
});

function normalizeUserCode(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().replace(/-/g, "").toUpperCase();
  return normalized || undefined;
}

export default async function OAuthDevicePage({
  searchParams,
}: {
  searchParams: Promise<{ user_code?: string }>;
}) {
  const params = await searchParams;
  const userCode = normalizeUserCode(params.user_code);

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // if (!session) {
  //   const resumePath = userCode
  //     ? `/oauth/device?user_code=${encodeURIComponent(userCode)}`
  //     : "/oauth/device";
  //   redirect(`/login?redirect=${encodeURIComponent(resumePath)}`);
  // }

  let verified = false;
  let verificationError = "";
  if (userCode) {
    try {
      const verifyResponse = await auth.api.deviceVerify({
        query: {
          user_code: userCode,
        },
      });
      verified = verifyResponse.status !== "error";
    } catch (error) {
      console.log({ error });
      verified = false;
      verificationError = (error as any).body?.error_description;
      if (!verificationError) {
        verificationError = "Invalid or expired code";
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 mx-auto flex h-14 w-full max-w-[1600px] items-center justify-end bg-background px-4 md:px-8">
        <AuthHeader session={session} />
      </header>
      <main className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden p-6">
        <OauthDeviceFlow initialUserCode={userCode} verified={verified} error={verificationError} />
      </main>
    </div>
  );
}
