import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable} h-full`}>
      <body
        className={`${poppins.className} antialiased min-h-full flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
