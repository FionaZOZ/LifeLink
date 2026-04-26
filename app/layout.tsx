import type { Metadata } from "next";
import "./globals.css";
import { Stage } from "@/components/lifelink/Screen";
import { RoleSwitcher } from "@/components/lifelink/RoleSwitcher";
import { IncomingCallTrigger } from "@/components/lifelink/IncomingCallTrigger";

export const metadata: Metadata = {
  title: "LifeLink",
  description: "Emergency response network connecting heart-disease patients with nearby trained volunteers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <html lang="en">
      <body>
        <Stage>{children}</Stage>
        <RoleSwitcher />
        <IncomingCallTrigger />
        {isDev && (
          <a
            href="/dev/dashboard"
            className="fixed bottom-4 right-4 rounded-full bg-zinc-800 px-4 py-2 text-xs font-mono text-zinc-100 shadow-lg hover:bg-zinc-700"
            title="Developer Dashboard"
          >
            🩺 dev
          </a>
        )}
      </body>
    </html>
  );
}
