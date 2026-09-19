import Image from "next/image";
import { cn } from "@/lib/utils";

interface MediaImageProps {
  /** TMDB image path (e.g. "/abc.jpg"), or null when the title has no artwork. */
  path: string | null;
  title: string;
  sizes: string;
  /** Alt text. Leave empty when the title is already rendered next to the image. */
  alt?: string;
  /** Reserve for the single most important above-the-fold image. */
  preload?: boolean;
  className?: string;
}

// A stable per-title hue keeps artwork-less cards distinct without any assets.
function hueFor(title: string) {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

export function PosterImage({ path, title, sizes, alt = "", preload, className }: MediaImageProps) {
  const hue = hueFor(title);
  return (
    <div className={cn("relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-elevated", className)}>
      {path ? (
        <Image src={path} alt={alt} fill sizes={sizes} preload={preload} className="object-cover" />
      ) : (
        <div
          className="flex size-full items-end p-3"
          style={{ backgroundImage: `linear-gradient(160deg, hsl(${hue} 38% 24%), hsl(${(hue + 40) % 360} 42% 9%))` }}
        >
          <span className="line-clamp-4 text-sm font-semibold leading-tight text-foreground/90">{title}</span>
        </div>
      )}
    </div>
  );
}

/** Fills its (relatively positioned) parent; the parent controls the height. */
export function BackdropImage({ path, sizes, alt = "", preload, className }: Omit<MediaImageProps, "title">) {
  if (!path) {
    return (
      <div
        aria-hidden
        className={cn("absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgb(131_82_245/0.35),transparent_60%)] bg-surface", className)}
      />
    );
  }
  return (
    <Image
      src={path}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      className={cn("object-cover object-[50%_20%]", className)}
    />
  );
}
