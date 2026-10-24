import { createFileRoute } from "@tanstack/react-router";
import { getHallOfFame } from "@/lib/cms/public-api";
import { HallOfFamePage } from "@/components/landing/hall-of-fame";
import type { HallOfFameMember } from "@/lib/cms/schemas";

export const Route = createFileRoute("/hall-of-fame")({
  loader: async (): Promise<{ members: HallOfFameMember[] }> => {
    const doc = await getHallOfFame().catch(() => ({ members: [] }));
    return { members: doc.members ?? [] };
  },
  head: () => ({
    meta: [
      { title: "Hall of Fame — QRWho" },
      {
        name: "description",
        content:
          "The circles of QRWho's colorful world — the people who support QRWho with a coffee and take a permanent place in the Chromatic, Prism, Aurora or Spark Circle.",
      },
    ],
  }),
  component: HallOfFameRoute,
});

function HallOfFameRoute() {
  const { members } = Route.useLoaderData();
  return <HallOfFamePage members={members} />;
}
