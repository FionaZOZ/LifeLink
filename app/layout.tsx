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
  return (
    <html lang="en">
      <body>
        <Stage>{children}</Stage>
        <RoleSwitcher />
        <IncomingCallTrigger />
      </body>
    </html>
  );
}
