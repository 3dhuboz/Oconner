import { Sparkles, ExternalLink } from 'lucide-react';

const SOCIAL_STUDIO_URL = 'https://oconnor-social.pages.dev';

export default function SocialHubPage() {
  return (
    <div className="flex flex-col h-full -m-6">
      <div className="bg-white border-b px-6 py-4 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand" />
          <h1 className="text-lg font-bold text-gray-900">Social AI Studio</h1>
          <span className="text-xs text-gray-400">— powered by Penny Wise I.T</span>
        </div>
        <a href={SOCIAL_STUDIO_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand border rounded-lg px-3 py-1.5">
          <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
        </a>
      </div>
      <iframe src={SOCIAL_STUDIO_URL} className="flex-1 w-full border-0" title="Social AI Studio"
        allow="camera; microphone; clipboard-read; clipboard-write" />
    </div>
  );
}
