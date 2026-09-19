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
      <div className="relative mx-auto size-20 overflow-hidden rounded-full bg-surface-elevated sm:size-24">
        {person.profilePath ? (
          <Image src={person.profilePath} alt="" fill sizes="96px" className="object-cover" />
        ) : (
          <span aria-hidden className="flex size-full items-center justify-center text-lg font-semibold text-muted">
            {initials(person.name)}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm font-medium">{person.name}</p>
      {person.character && <p className="mt-0.5 text-xs text-muted">{person.character}</p>}
    </div>
  );
}
