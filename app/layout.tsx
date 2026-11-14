import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Shippori_Mincho_B1 } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { ThemeProvider } from "@/components/theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Headings, rank names and kanji only. Row text stays in Geist. */
const display = Shippori_Mincho_B1({
  variable: "--font-display",
  weight: ["600", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Hashira Arc", template: "%s · Hashira Arc" },
  description:
    "The senior engineer sheet: every systems concept from first principles, as a nested checklist you tick off row by row.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e13" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>
            <AppHeader />
            <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-8 pb-16 sm:px-6">{children}</main>
            {/* Sits just below the sticky header so it never covers it. */}
            <Toaster position="top-center" offset={68} mobileOffset={68} />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
