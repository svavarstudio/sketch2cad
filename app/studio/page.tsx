import StudioApp from "@/components/studio/StudioApp";

/** Studio is a client-heavy SPA surface; loading.tsx provides the instant shell. */
export const instant = true;

export default function StudioPage() {
  return <StudioApp />;
}
