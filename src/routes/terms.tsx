import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "@/components/landing/legal";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — QRWho" },
      {
        name: "description",
        content:
          "The terms for using QRWho's free QR code generator: your QR content is yours, the tool must be used lawfully, and the service is provided as-is. Covers user content, prohibited uses, disclaimers and more.",
      },
    ],
  }),
  component: TermsPage,
});
