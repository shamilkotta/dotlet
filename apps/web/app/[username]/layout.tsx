import { LandingFooter } from "@/components/landing-footer";
import "./style.css";

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      data-device-islets
      className="flex min-h-screen flex-col bg-[#ffffff] text-[#1f2328] antialiased transition-colors duration-200 dark:bg-[#0a0a0a] dark:text-[#e2e2e2]"
    >
      {children}
      <LandingFooter className="mx-auto max-w-[1600px] px-4 md:px-8" />
    </div>
  );
}
