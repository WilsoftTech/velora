import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-canvas-subtle sm:mt-24">
      <div className="page-container flex flex-col gap-3 pt-8 pb-24 text-body-md text-muted md:pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Logo className="h-7" />
          <p>Your World of Entertainment.</p>
        </div>
        <p className="text-body-sm">
          Movie and TV data provided by TMDB. This product is not endorsed or certified by TMDB.
        </p>
      </div>
    </footer>
  );
}
