import { HeroSkeleton, SectionSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <>
      <HeroSkeleton />
      <div className="page-container mt-10">
        <SectionSkeleton />
      </div>
    </>
  );
}
