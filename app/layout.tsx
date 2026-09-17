import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SimplySplit",
  description: "Simplify shared expenses",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
