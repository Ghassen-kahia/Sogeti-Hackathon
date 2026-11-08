import { tracesPictogramme } from "@/lib/pictogrammes";

export function Pictogramme({ slug, className }: { slug: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {tracesPictogramme(slug).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
