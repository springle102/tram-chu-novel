import type { Metadata } from "next";
import "./globals.css";
import GlobalReportButton from "./components/GlobalReportButton";
import FaviconSync from "./components/FaviconSync";
import MaintenanceGuard from "./components/MaintenanceGuard";

export const dynamic = "force-dynamic";
export const runtime = "edge";

interface PublicSiteSetting {
  key: string;
  value: string;
}

async function getPublicSiteSettings(): Promise<PublicSiteSetting[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/settings`, { cache: "no-store" });
    if (!res.ok) return [];

    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data as PublicSiteSetting[] : [];
  } catch (err) {
    console.error("Failed to fetch site settings", err);
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  let siteName = "Trạm Chữ Novel";
  let description = "Nền tảng đọc truyện tiểu thuyết online miễn phí.";
  let faviconUrl: string | undefined;

  const settings = await getPublicSiteSettings();
  const nameSetting = settings.find((setting) => setting.key === 'site_name');
  const descSetting = settings.find((setting) => setting.key === 'site_description');
  const faviconSetting = settings.find((setting) => setting.key === 'favicon_url');

  if (nameSetting?.value) siteName = nameSetting.value;
  if (descSetting?.value) description = descSetting.value;
  if (faviconSetting?.value?.trim()) faviconUrl = faviconSetting.value.trim();

  return {
    title: `${siteName} — Đọc Truyện Tiểu Thuyết Online`,
    description: description,
    keywords: ["đọc truyện", "tiểu thuyết", "truyện online", "novel", "light novel"],
    ...(faviconUrl ? { icons: { icon: faviconUrl } } : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getPublicSiteSettings();
  const maintenanceSetting = settings.find((setting) => setting.key === 'maintenance_mode');
  const maintenanceMode = maintenanceSetting?.value?.trim().toLowerCase() === 'true';

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
        <MaintenanceGuard enabled={maintenanceMode}>
          {children}
          <GlobalReportButton />
        </MaintenanceGuard>
        <FaviconSync />
      </body>
    </html>
  );
}
