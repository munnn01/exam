import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://examguard-phi.vercel.app"),
  title: "ExamGuard — Giám sát thi trực tuyến",
  description: "Nền tảng thi trực tuyến giám sát rời tab, copy-paste, hướng nhìn, điện thoại và người thứ hai mà không nhận diện danh tính.",
  applicationName: "ExamGuard",
  keywords: ["thi trực tuyến", "giám sát thi", "proctoring", "ExamGuard"],
  openGraph: {
    title: "ExamGuard — Thi cử minh bạch, giám sát riêng tư",
    description: "Giám sát rời tab, copy-paste, điện thoại, hướng nhìn và người thứ hai mà không nhận diện danh tính.",
    images: [{ url: "/og.png", width: 1745, height: 909, alt: "ExamGuard — Thi cử minh bạch, giám sát riêng tư" }],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ExamGuard — Thi cử minh bạch, giám sát riêng tư",
    description: "Nền tảng thi trực tuyến giám sát ngay trên thiết bị.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
