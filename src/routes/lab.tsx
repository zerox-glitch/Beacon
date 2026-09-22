import { createFileRoute } from "@tanstack/react-router";
import { ArtLab } from "@/components/studio/art-lab";

export const Route = createFileRoute("/lab")({ component: LabPage });

function LabPage() {
  return <ArtLab />;
}
