import "./device-islets.css";

export default function DeviceSegmentLayout({
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
    </div>
  );
}
