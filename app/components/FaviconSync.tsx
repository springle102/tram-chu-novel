"use client";

import { useEffect } from "react";

const FAVICON_UPDATED_EVENT = "site-favicon-updated";
const FAVICON_UPDATED_STORAGE_KEY = "site-favicon-updated-at";

interface PublicSiteSetting {
  key: string;
  value: string;
}

interface SettingsResponse {
  success?: boolean;
  data?: PublicSiteSetting[];
}

function updateFavicon(faviconUrl: string) {
  const faviconLinks = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
  );

  if (!faviconUrl) {
    faviconLinks.forEach((link) => link.remove());
    return;
  }

  if (faviconLinks.length === 0) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = faviconUrl;
    document.head.appendChild(link);
    return;
  }

  faviconLinks.forEach((link) => {
    link.href = faviconUrl;
  });
}

export default function FaviconSync() {
  useEffect(() => {
    const controller = new AbortController();
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    const syncFavicon = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/settings`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = (await response.json()) as SettingsResponse;
        if (controller.signal.aborted || !data.success || !Array.isArray(data.data)) return;

        const faviconSetting = data.data.find((setting) => setting.key === "favicon_url");
        updateFavicon(faviconSetting?.value?.trim() || "");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.warn("Không thể đồng bộ favicon từ cấu hình website:", error);
      }
    };

    const handleFaviconUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ faviconUrl?: string }>).detail;
      if (typeof detail?.faviconUrl === "string") {
        updateFavicon(detail.faviconUrl.trim());
      } else {
        void syncFavicon();
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === FAVICON_UPDATED_STORAGE_KEY) {
        void syncFavicon();
      }
    };

    void syncFavicon();
    window.addEventListener(FAVICON_UPDATED_EVENT, handleFaviconUpdated);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      controller.abort();
      window.removeEventListener(FAVICON_UPDATED_EVENT, handleFaviconUpdated);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return null;
}
