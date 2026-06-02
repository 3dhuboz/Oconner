import type { Metadata } from 'next';

export const siteUrl = 'https://oconnoragriculture.com.au';
export const siteName = "O'Connor Agriculture";
export const defaultShareImage = {
  url: `${siteUrl}/og-card.jpg`,
  width: 1200,
  height: 630,
  alt: "O'Connor Agriculture grass fed beef from the Boyne Valley",
};

export const defaultDescription =
  'Local grass fed beef from Calliope and the Boyne Valley, QLD. First generation family farm delivering naturally healthy beef boxes to your door.';

export function pageMetadata({
  title,
  description = defaultDescription,
  path = '/',
}: {
  title: string;
  description?: string;
  path?: string;
}): Metadata {
  const url = `${siteUrl}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      siteName,
      type: 'website',
      url,
      title: `${title} | ${siteName}`,
      description,
      images: [defaultShareImage],
      locale: 'en_AU',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description,
      images: [defaultShareImage.url],
    },
  };
}
