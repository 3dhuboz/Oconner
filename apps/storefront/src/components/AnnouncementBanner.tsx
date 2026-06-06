'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@butcher/shared';

interface AnnouncementBannerConfig {
  enabled: boolean;
  text: string;
  linkUrl?: string;
  linkLabel?: string;
}

const DEFAULT_BANNER: AnnouncementBannerConfig = {
  enabled: false,
  text: '',
  linkUrl: '',
  linkLabel: '',
};

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export default function AnnouncementBanner() {
  const [banner, setBanner] = useState<AnnouncementBannerConfig>(DEFAULT_BANNER);

  useEffect(() => {
    let cancelled = false;
    api.config.get('announcementBanner')
      .then((data) => {
        const value = (data as any)?.value ?? data;
        if (!cancelled && value) setBanner({ ...DEFAULT_BANNER, ...value });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!banner.enabled || !banner.text.trim()) return null;

  const content = (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
      <span>{banner.text}</span>
      {banner.linkLabel?.trim() && (
        <span className="font-black underline decoration-white/50 underline-offset-2">
          {banner.linkLabel}
        </span>
      )}
    </span>
  );

  const className = "block bg-accent text-white text-center text-sm md:text-base font-bold px-4 py-2 tracking-wide";

  if (banner.linkUrl?.trim()) {
    const href = banner.linkUrl.trim();
    if (isExternalUrl(href)) {
      return <a href={href} className={className}>{content}</a>;
    }
    return <Link href={href} className={className}>{content}</Link>;
  }

  return <div className={className}>{content}</div>;
}
