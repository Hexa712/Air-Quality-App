import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { AuthProvider } from "@/lib/AuthContext";

// Vercel trigger: 2026-04-20
export const metadata: Metadata = {
  title: "Respira Flare – Smart Environmental Intelligence",
  description: "Monitor real-time pollution, get personalized health routing, and analyze atmospheric impact with Respira Flare.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body>
        <AuthProvider>
          <Header />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
