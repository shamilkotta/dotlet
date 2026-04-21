import Link from "next/link";

import { AppLogo } from "@/components/app-logo";

type AuthFormLayoutProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footerLink: { href: string; label: string; linkText: string };
};

export function AuthFormLayout({ title, description, children, footerLink }: AuthFormLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <Link
        href="/"
        className="fixed left-4 sm:left-6 top-[17px] z-60 flex items-center group"
        style={{ left: "max(16px, calc((100vw - 1400px) / 2 + 16px))" }}
      >
        <AppLogo className="" imgClassName="w-5 h-5" />
      </Link>

      <div className="w-full max-w-[400px] space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        {children}

        <p className="text-center text-sm text-muted-foreground">
          {footerLink.label}{" "}
          <Link
            href={footerLink.href}
            className="font-medium text-primary hover:underline underline-offset-4"
          >
            {footerLink.linkText}
          </Link>
        </p>
      </div>
    </div>
  );
}
