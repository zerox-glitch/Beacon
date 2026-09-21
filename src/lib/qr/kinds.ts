import {
  CalendarDays,
  CreditCard,
  FileText,
  Share2,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Smartphone,
  Star,
  Type,
  UserRound,
  Utensils,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { Payload, PayloadKind } from "./types";

export interface KindMeta {
  id: PayloadKind;
  label: string;
  group: "primary" | "more";
  icon: LucideIcon;
  hint: string;
  placeholder: string;
  field: keyof Payload;
}

export const KIND_META: KindMeta[] = [
  { id: "url", label: "Website", group: "primary", icon: Link2, hint: "Any https link", placeholder: "https://", field: "url" },
  { id: "wifi", label: "Wi-Fi", group: "primary", icon: Wifi, hint: "Join a network", placeholder: "Network name", field: "wifiSsid" },
  { id: "vcard", label: "Contact", group: "primary", icon: UserRound, hint: "vCard for a phone", placeholder: "First name", field: "firstName" },
  { id: "text", label: "Text", group: "primary", icon: Type, hint: "Plain message", placeholder: "Write anything", field: "text" },
  { id: "email", label: "Email", group: "more", icon: Mail, hint: "mailto", placeholder: "name@studio.com", field: "email" },
  { id: "phone", label: "Phone", group: "more", icon: Phone, hint: "tel:", placeholder: "+1 555 0100", field: "phone" },
  { id: "sms", label: "SMS", group: "more", icon: MessageSquare, hint: "Prefilled text", placeholder: "+1 555 0100", field: "phone" },
  { id: "whatsapp", label: "WhatsApp", group: "more", icon: MessageCircle, hint: "wa.me chat", placeholder: "15550100", field: "whatsapp" },
  { id: "geo", label: "Location", group: "more", icon: MapPin, hint: "Map pin", placeholder: "37.78", field: "lat" },
  { id: "event", label: "Event", group: "more", icon: CalendarDays, hint: "Calendar invite", placeholder: "Studio opening", field: "eventTitle" },
  { id: "menu", label: "Menu", group: "more", icon: Utensils, hint: "Restaurant menu URL", placeholder: "https://your-menu.com", field: "url" },
  { id: "pdf", label: "PDF", group: "more", icon: FileText, hint: "Link to a file", placeholder: "https://…/menu.pdf", field: "url" },
  { id: "review", label: "Review", group: "more", icon: Star, hint: "Google / Yelp link", placeholder: "https://g.page/r/…", field: "url" },
  { id: "payment", label: "Payment", group: "more", icon: CreditCard, hint: "PayPal, Venmo, Stripe", placeholder: "https://paypal.me/you", field: "url" },
  { id: "app", label: "App", group: "more", icon: Smartphone, hint: "App Store / Play", placeholder: "https://apps.apple.com/…", field: "url" },
  { id: "social", label: "Social", group: "more", icon: Share2, hint: "Profile or bio", placeholder: "https://instagram.com/you", field: "url" },
];

export function kindMeta(id: PayloadKind): KindMeta {
  return KIND_META.find((k) => k.id === id) ?? KIND_META[0]!;
}

export const PRIMARY_KINDS = KIND_META.filter((k) => k.group === "primary");
export const MORE_KINDS = KIND_META.filter((k) => k.group === "more");
