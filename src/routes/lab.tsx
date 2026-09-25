import { createFileRoute } from "@tanstack/react-router";
import { StoryPage } from "@/components/landing/story";

export const Route = createFileRoute("/lab")({ component: StoryPage });
