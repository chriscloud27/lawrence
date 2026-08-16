'use client';

import { useEffect } from 'react';

interface CalendlyEmbedProps {
  url: string;
  onBooked?: () => void;
}

export default function CalendlyEmbed({ url, onBooked }: CalendlyEmbedProps) {
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.event === 'calendly.event_scheduled') {
        onBooked?.();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onBooked]);

  if (!url) return null;

  const embedUrl = url.includes('?') ? `${url}&embed_type=Inline` : `${url}?embed_type=Inline`;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 my-2">
      <iframe
        src={embedUrl}
        width="100%"
        height="480"
        frameBorder="0"
        title="Book a call"
      />
    </div>
  );
}
