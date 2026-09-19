import Image from "next/image";
import type { CastMember } from "@/types/media";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function PersonCard({ person }: { person: CastMember }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto size-20 overflow-hidden rounded-full border border-border bg-surface-elevated sm:size-24">
        {person.profilePath ? (
          <Image src={person.profilePath} alt="" fill sizes="96px" className="object-cover" />
        ) : (
          <span aria-hidden className="flex size-full items-center justify-center text-headline-sm text-muted">
            {initials(person.name)}
          </span>
        )}
      </div>
      <p className="mt-2 text-body-sm font-semibold">{person.name}</p>
      {person.character && <p className="mt-0.5 text-body-sm text-muted">{person.character}</p>}
    </div>
  );
}
