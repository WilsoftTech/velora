export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60">
      <div className="page-container flex flex-col gap-3 pt-8 pb-24 text-sm md:pb-8 text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold text-foreground">Verola</span>
          <span className="ml-3">A more cinematic you.</span>
        </p>
        <p className="text-xs">
          Movie and TV data provided by TMDB. This product is not endorsed or certified by TMDB.
        </p>
      </div>
    </footer>
  );
}
