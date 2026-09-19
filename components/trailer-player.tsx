"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { BackdropImage } from "@/components/media-image";

interface TrailerPlayerProps {
  videoKey: string;
  title: string;
  backdropPath: string | null;
}

/** Click-to-load facade: the YouTube iframe (and its weight) only loads on demand. */
export function TrailerPlayer({ videoKey, title, backdropPath }: TrailerPlayerProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-canvas-subtle">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0`}
          title={`${title} trailer`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${title} trailer`}
          className="group absolute inset-0"
        >
          <BackdropImage path={backdropPath} sizes="(min-width: 1024px) 896px, 100vw" />
          <span className="absolute inset-0 bg-background/30 transition-colors group-hover:bg-background/10" />
          <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-accent-foreground shadow-glow transition duration-200 group-hover:scale-105 group-hover:bg-accent-hover">
            <Play aria-hidden className="size-7 fill-current" />
          </span>
        </button>
      )}
    </div>
  );
}
