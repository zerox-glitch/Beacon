import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KIND_META, MORE_KINDS, PRIMARY_KINDS } from "@/lib/qr/kinds";
import { USE_CASES } from "@/lib/qr/usecase";
import type { PayloadKind } from "@/lib/qr/types";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/store";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-[10px] leading-snug text-subtle">{hint}</p> : null}
    </label>
  );
}

export function ContentPanel() {
  const payload = useStudio((s) => s.payload);
  const setKind = useStudio((s) => s.setKind);
  const patch = useStudio((s) => s.patchPayload);
  const useCase = useStudio((s) => s.useCase);
  const applyUseCase = useStudio((s) => s.applyUseCase);
  const active = KIND_META.find((k) => k.id === payload.kind);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">What are you creating?</p>
        <div className="grid grid-cols-4 gap-1.5">
          {PRIMARY_KINDS.map((k) => {
            const Icon = k.icon;
            const on = payload.kind === k.id;
            return (
              <button
                key={k.id}
                type="button"
                title={k.hint}
                onClick={() => setKind(k.id)}
                className={cn(
                  "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-1 text-[11px] font-semibold transition-colors",
                  on
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-elevated text-fg/80 hover:bg-surface hover:text-fg",
                )}
              >
                <Icon className="size-4" />
                {k.label}
              </button>
            );
          })}
        </div>
        <label className="mt-2 grid gap-1.5">
          <span className="text-[11px] font-medium text-muted">More types</span>
          <select
            value={MORE_KINDS.some((k) => k.id === payload.kind) ? payload.kind : ""}
            onChange={(e) => {
              if (e.target.value) setKind(e.target.value as PayloadKind);
            }}
            className="h-11 rounded-md border border-border bg-elevated px-3 text-sm text-fg"
          >
            <option value="">
              {active && MORE_KINDS.some((k) => k.id === active.id)
                ? active.label
                : "Menu, PDF, review, payment…"}
            </option>
            {MORE_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Where will it live?</p>
        <div className="flex flex-wrap gap-1.5">
          {USE_CASES.map((u) => (
            <button
              key={u.id}
              type="button"
              title={u.hint}
              onClick={() => applyUseCase(u.id)}
              className={cn(
                "h-8 rounded-full border px-2.5 text-[11px] font-semibold",
                useCase === u.id
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-elevated text-fg/80 hover:text-fg",
              )}
            >
              {u.label}
            </button>
          ))}
        </div>
        {useCase && (
          <p className="mt-2 text-[11px] leading-snug text-muted">
            {USE_CASES.find((u) => u.id === useCase)?.printNote}. Quiet zone, contrast, and error
            correction were nudged for that surface — always verify with a phone.
          </p>
        )}
      </div>

      {(payload.kind === "url" ||
        payload.kind === "pdf" ||
        payload.kind === "menu" ||
        payload.kind === "review" ||
        payload.kind === "payment" ||
        payload.kind === "app" ||
        payload.kind === "social") && (
        <Field
          label={
            payload.kind === "menu"
              ? "Menu link"
              : payload.kind === "pdf"
                ? "PDF link"
                : payload.kind === "review"
                  ? "Review link"
                  : payload.kind === "payment"
                    ? "Payment link"
                    : payload.kind === "app"
                      ? "App store link"
                      : payload.kind === "social"
                        ? "Profile or bio link"
                        : "Website or any URL"
          }
        >
          <Input
            value={payload.url}
            placeholder={KIND_META.find((k) => k.id === payload.kind)?.placeholder ?? "https://"}
            inputMode="url"
            autoCapitalize="off"
            onChange={(e) => patch({ url: e.target.value })}
          />
        </Field>
      )}

      {payload.kind === "text" && (
        <Field label="Plain text">
          <Textarea
            value={payload.text}
            placeholder="Write anything"
            onChange={(e) => patch({ text: e.target.value })}
          />
        </Field>
      )}

      {payload.kind === "phone" && (
        <Field label="Phone number">
          <Input
            value={payload.phone}
            placeholder="+1 555 0100"
            inputMode="tel"
            onChange={(e) => patch({ phone: e.target.value })}
          />
        </Field>
      )}

      {payload.kind === "sms" && (
        <>
          <Field label="Phone number">
            <Input
              value={payload.phone}
              placeholder="+1 555 0100"
              inputMode="tel"
              onChange={(e) => patch({ phone: e.target.value })}
            />
          </Field>
          <Field label="Message">
            <Textarea
              value={payload.smsBody}
              placeholder="Optional message"
              onChange={(e) => patch({ smsBody: e.target.value })}
            />
          </Field>
        </>
      )}

      {payload.kind === "email" && (
        <Field label="Email address" hint="The scan opens the mail app ready to write to this address. Subject/body stay out of the QR — they would need a tiny, fragile code.">
          <Input
            value={payload.email}
            placeholder="name@studio.com"
            inputMode="email"
            onChange={(e) => patch({ email: e.target.value })}
          />
        </Field>
      )}

      {payload.kind === "whatsapp" && (
        <>
          <Field label="WhatsApp number">
            <Input
              value={payload.whatsapp}
              placeholder="15550100"
              inputMode="tel"
              onChange={(e) => patch({ whatsapp: e.target.value })}
            />
          </Field>
          <Field label="Prefilled message">
            <Textarea
              value={payload.whatsappText}
              onChange={(e) => patch({ whatsappText: e.target.value })}
            />
          </Field>
        </>
      )}

      {payload.kind === "wifi" && (
        <>
          <Field label="Network name">
            <Input
              value={payload.wifiSsid}
              placeholder="SSID"
              onChange={(e) => patch({ wifiSsid: e.target.value })}
            />
          </Field>
          <Field label="Password">
            <Input
              type="text"
              value={payload.wifiPassword}
              placeholder={payload.wifiType === "nopass" ? "None" : "Password"}
              disabled={payload.wifiType === "nopass"}
              onChange={(e) => patch({ wifiPassword: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-3 gap-1.5">
            {(["WPA", "WEP", "nopass"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => patch({ wifiType: t })}
                className={cn(
                  "h-11 rounded-md border text-xs font-medium",
                  payload.wifiType === t
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-elevated text-muted",
                )}
              >
                {t === "nopass" ? "Open" : t}
              </button>
            ))}
          </div>
          <label className="flex h-11 items-center justify-between rounded-md border border-border bg-elevated px-3 text-sm">
            Hidden network
            <input
              type="checkbox"
              checked={payload.wifiHidden}
              onChange={(e) => patch({ wifiHidden: e.target.checked })}
              className="size-4 accent-accent"
            />
          </label>
        </>
      )}

      {payload.kind === "geo" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Latitude">
              <Input
                value={payload.lat}
                placeholder="37.78"
                inputMode="decimal"
                onChange={(e) => patch({ lat: e.target.value })}
              />
            </Field>
            <Field label="Longitude">
              <Input
                value={payload.lng}
                placeholder="-122.41"
                inputMode="decimal"
                onChange={(e) => patch({ lng: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Label">
            <Input
              value={payload.geoLabel}
              placeholder="Optional place name"
              onChange={(e) => patch({ geoLabel: e.target.value })}
            />
          </Field>
          <button
            type="button"
            className="h-11 rounded-md border border-border bg-surface text-sm text-fg hover:bg-surface-hover"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition((pos) => {
                patch({
                  lat: pos.coords.latitude.toFixed(6),
                  lng: pos.coords.longitude.toFixed(6),
                });
              });
            }}
          >
            Use current location
          </button>
        </>
      )}

      {payload.kind === "vcard" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="First name">
              <Input
                value={payload.firstName}
                onChange={(e) => patch({ firstName: e.target.value })}
              />
            </Field>
            <Field label="Last name">
              <Input
                value={payload.lastName}
                onChange={(e) => patch({ lastName: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Organization">
            <Input value={payload.org} onChange={(e) => patch({ org: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input
              value={payload.vphone}
              inputMode="tel"
              onChange={(e) => patch({ vphone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              value={payload.vemail}
              inputMode="email"
              onChange={(e) => patch({ vemail: e.target.value })}
            />
          </Field>
          <Field label="Website">
            <Input value={payload.vurl} onChange={(e) => patch({ vurl: e.target.value })} />
          </Field>
        </>
      )}

      {payload.kind === "event" && (
        <>
          <Field label="Title">
            <Input
              value={payload.eventTitle}
              placeholder="Studio opening"
              onChange={(e) => patch({ eventTitle: e.target.value })}
            />
          </Field>
          <Field label="Location">
            <Input
              value={payload.eventLocation}
              onChange={(e) => patch({ eventLocation: e.target.value })}
            />
          </Field>
          <Field label="Starts">
            <Input
              type="datetime-local"
              value={payload.eventStart}
              onChange={(e) => patch({ eventStart: e.target.value })}
            />
          </Field>
          <Field label="Ends">
            <Input
              type="datetime-local"
              value={payload.eventEnd}
              onChange={(e) => patch({ eventEnd: e.target.value })}
            />
          </Field>
        </>
      )}
    </div>
  );
}
