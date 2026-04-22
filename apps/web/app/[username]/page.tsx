import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Image from "next/image";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { AuthHeader } from "@/components/auth-header";
import { DeviceListSkeleton, DevicesList } from "@/components/user/devices";
import { UserOverview, UserOverviewSkeleton } from "@/components/user/overview";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `${username} | dotlet`,
    description: `Devices and profile for @${username}.`,
  };
}

export default async function UserHomePage({ params }: { params: Promise<{ username: string }> }) {
  const { username: usernameParam } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const [profile] = await db
    .select({
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(sql`lower(${user.username}) = ${usernameParam.toLowerCase()}`)
    .limit(1);

  if (!profile || !profile.username) {
    notFound();
  }

  const isOwner = session?.user.id === profile.id;

  return (
    <>
      <header className="sticky top-0 z-50 mx-auto flex h-14 w-full max-w-[1600px] items-center border-b border-[#e1e4e8] bg-white px-4 dark:border-[#2a2a2a] dark:bg-[#0a0a0a] md:px-8">
        <div className="flex flex-1 items-center gap-4">
          <Link
            className="font-mono text-sm tracking-tight text-[#57606a] transition-colors hover:text-[#1f2328] dark:text-[#919191] dark:hover:text-white"
            href="/"
          >
            dotlet
          </Link>
          <span className="text-[#e1e4e8] dark:text-[#2a2a2a]">/</span>
          <span className="font-mono text-sm font-semibold text-[#1f2328] dark:text-white">
            {profile.username}
          </span>
        </div>
        <AuthHeader session={session} />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">
        <div className="">
          <div className="mb-12">
            <div className="flex flex-col items-start gap-5 border-b border-[#e1e4e8]  p-6 md:flex-row dark:border-[#2a2a2a] ">
              {profile.image ? (
                <Image
                  alt=""
                  className="size-8 rounded-full border border-foreground/5"
                  src={profile.image}
                  width={32}
                  height={32}
                  unoptimized
                />
              ) : (
                <div className="flex size-16  items-center justify-center rounded-full border border-[#e1e4e8] bg-[#f6f8fa] text-xl font-medium text-[#57606a] dark:border-[#2a2a2a] dark:bg-[#2a2a2a]/30 dark:text-[#919191]">
                  {(profile.name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 space-y-2">
                <div>
                  <h1 className="text-2xl font-bold text-[#1f2328] dark:text-white">
                    {profile.name}{" "}
                    <span className="text-sm font-normal text-[#57606a] dark:text-[#737373]">
                      ({profile.username})
                    </span>
                  </h1>
                  {/* <p className="mt-1 italic text-[#57606a] dark:text-[#737373]">
                    &quot;{profile.name}&quot;
                  </p> */}
                </div>
                <Suspense fallback={<UserOverviewSkeleton />}>
                  <UserOverview userId={profile.id} isOwner={isOwner} />
                </Suspense>
              </div>
            </div>
          </div>

          <Suspense fallback={<DeviceListSkeleton />}>
            <DevicesList isOwner={isOwner} profile={profile} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
