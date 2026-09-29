import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "@/components/landing/legal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — QRWho" },
      {
        name: "description",
        content:
          "How QRWho handles your information: QR creation runs entirely in your browser, with no accounts, no analytics and no uploaded photos stored anywhere. What we collect (almost nothing) and how your browser keeps your work.",
      },
    ],
  }),
  component: PrivacyPage,
});
