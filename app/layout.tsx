import type { Metadata } from "next";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  let siteName = "Novel Violet";
  let description = "Nền tảng đọc truyện tiểu thuyết online miễn phí.";
  let faviconUrl = "/favicon.ico"; // Fallback
  
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/settings`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const settings = data.data;
        const nameSetting = settings.find((s: any) => s.key === 'site_name');
        const descSetting = settings.find((s: any) => s.key === 'site_description');
        const faviconSetting = settings.find((s: any) => s.key === 'favicon_url');
        
        if (nameSetting?.value) siteName = nameSetting.value;
        if (descSetting?.value) description = descSetting.value;
        if (faviconSetting?.value) faviconUrl = faviconSetting.value;
      }
    }
  } catch (err) {
    console.error("Failed to fetch site settings for metadata", err);
  }

  return {
    title: `${siteName} — Đọc Truyện Tiểu Thuyết Online`,
    description: description,
    keywords: ["đọc truyện", "tiểu thuyết", "truyện online", "novel", "light novel"],
    icons: {
      icon: faviconUrl,
    }
  };
}

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
        {children}
      </body>
    </html>
  );
}
