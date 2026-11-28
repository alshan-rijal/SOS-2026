import { Poppins, Noto_Sans_Devanagari } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageContext";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// Nepali glyphs: Poppins has no Devanagari, so the stack falls through to this
// font only for the characters it is missing.
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-devanagari",
  display: "swap",
});

export const metadata = {
  title: {
    default: "Sajha Pahal — Community Problem Reporting",
    template: "%s · Sajha Pahal",
  },
  description:
    "Report local infrastructure problems, follow them on a live map, and track what gets fixed.",
};

export const viewport = {
  themeColor: "#0b4a6f",
};

// The stored language lives in a cookie and is read on the client by
// LanguageProvider. Reading it here would need cookies(), which makes every route
// dynamic and stops /_not-found prerendering, so the shell stays English and the
// provider switches it after hydration.
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable} ${devanagari.variable} h-full`}>
      <body className="antialiased min-h-full flex flex-col">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
