import type { Metadata } from "next";
import "./globals.css";
import GlobalReportButton from "./components/GlobalReportButton";
import FaviconSync from "./components/FaviconSync";
import MaintenanceGuard from "./components/MaintenanceGuard";

export const metadata: Metadata = {
  title: "Trạm Chữ Novel — Đọc Truyện Tiểu Thuyết Online",
  description: "Nền tảng đọc truyện tiểu thuyết online miễn phí.",
  keywords: ["đọc truyện", "tiểu thuyết", "truyện online", "novel", "light novel"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Saira:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <MaintenanceGuard enabled={false}>
          {children}
          <GlobalReportButton />
        </MaintenanceGuard>
        <FaviconSync />
      </body>
    </html>
  );
}
