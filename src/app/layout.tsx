import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pryro SOP — AI-Powered SOP Generator",
    template: "%s | Pryro SOP",
  },
  description:
    "Transform simple process descriptions into complete, professional Standard Operating Procedures using AI.",
  keywords: ["SOP", "Standard Operating Procedure", "AI", "documentation", "business process"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster
              richColors
              position="top-right"
              expand={true}
              closeButton
              theme="dark"
              toastOptions={{
                style: {
                  background: "#0d0d0d",
                  color: "#ffffff",
                  border: "1px solid #2f2f2f",
                  borderRadius: "10px",
                },
                classNames: {
                  title: "text-white font-medium text-sm",
                  description: "text-zinc-400 text-xs",
                  closeButton: "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white",
                  actionButton: "bg-white text-black text-xs font-medium",
                  cancelButton: "bg-zinc-800 text-zinc-300 text-xs",
                },
                duration: 4000,
              }}
            />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
