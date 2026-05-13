import { Fraunces, Noto_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "Moodbuilder",
  description: "Studio for assembling brand moods — color, type, marks, gradients, image.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${notoSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
