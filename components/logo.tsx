import Image from "next/image";

interface LogoProps {
  /** Height utility (default `h-8`); width follows the artwork's aspect ratio. */
  className?: string;
  /** Load immediately; use for the header, which is always above the fold. */
  eager?: boolean;
}

/**
 * Mark + wordmark lockup with a transparent background, cut from
 * `public/images/logo.webp`. `unoptimized` is required: the app-wide image
 * loader points at the TMDB CDN, which is wrong for a local file.
 */
export function Logo({ className, eager }: LogoProps) {
  return (
    <Image
      src="/images/logo-lockup.webp"
      alt="Velora"
      width={550}
      height={120}
      unoptimized
      loading={eager ? "eager" : undefined}
      className={`${className ?? "h-8"} w-auto`}
    />
  );
}
