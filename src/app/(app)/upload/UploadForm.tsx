"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Hand,
  ImagePlus,
  Loader2,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Diya, Mandala } from "@/components/Ornaments";
import { ImageError, prepareImage } from "@/lib/image";
import { ageFromDob } from "@/lib/reading-schema";

export type Prefill = {
  name: string;
  dob: string;
  gender: "" | "male" | "female" | "other" | "prefer_not_to_say";
  hand: "left" | "right";
};

const GENDERS: { value: Prefill["gender"]; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const LOADING_MESSAGES = [
  "Reading your heart line…",
  "Tracing your head line…",
  "Studying your life line…",
  "Following your fate line…",
  "Weighing the mount of Jupiter…",
  "Consulting Samudrika Shastra…",
  "Choosing your remedies…",
];

function todayMinus(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function PalmOutline({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 150" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinejoin="round"
        d="M40 140 C30 120 26 104 22 88 L14 60 C12 52 22 48 26 56 L34 78 L32 30 C32 22 42 22 42 30 L44 70 L46 18 C46 10 56 10 56 18 L57 68 L60 22 C60 14 70 14 70 22 L69 72 L76 38 C78 30 88 32 86 40 L80 92 C78 116 70 130 66 140"
      />
      <path strokeDasharray="4 4" d="M36 96 C52 88 66 88 80 94 M38 108 C52 104 62 108 72 116 M44 90 C38 106 42 124 50 138" />
    </svg>
  );
}

export function UploadForm({ prefill }: { prefill: Prefill }) {
  const router = useRouter();
  const { profile, openPayment, refreshProfile } = useApp();

  const [name, setName] = useState(prefill.name);
  const [dob, setDob] = useState(prefill.dob);
  const [gender, setGender] = useState<Prefill["gender"]>(prefill.gender);
  const [hand, setHand] = useState<Prefill["hand"]>(prefill.hand);

  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [photoError, setPhotoError] = useState<{ title: string; detail?: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!submitting) return;
    setMsgIndex(0);
    const t = setInterval(() => setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length), 2600);
    return () => clearInterval(t);
  }, [submitting]);

  const age = dob ? ageFromDob(dob) : null;
  const fieldErrors = useMemo(
    () => ({
      name: !name.trim() ? "Please enter your name." : null,
      dob: !dob
        ? "Please enter your date of birth."
        : age !== null && age < 18
          ? "Readings are available only for adults (18+)."
          : age !== null && age > 120
            ? "Please enter a valid date of birth."
            : null,
      gender: !gender ? "Please choose an option." : null,
    }),
    [name, dob, gender, age],
  );
  const detailsValid = !fieldErrors.name && !fieldErrors.dob && !fieldErrors.gender;
  const canSubmit = detailsValid && !!photo && !processing && !submitting;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    setError(null);
    setProcessing(true);
    try {
      const blob = await prepareImage(file);
      if (preview) URL.revokeObjectURL(preview);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch (e) {
      setPhotoError({
        title: e instanceof ImageError ? e.message : "We couldn't open that photo. Please try another one.",
      });
    } finally {
      setProcessing(false);
    }
  }

  function removePhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null);
    setPreview(null);
    setPhotoError(null);
  }

  async function submit() {
    if (!photo || !detailsValid) return;
    setError(null);
    setPhotoError(null);
    setSubmitting(true);

    const form = new FormData();
    form.set("name", name.trim());
    form.set("dob", dob);
    form.set("gender", gender);
    form.set("hand", hand);
    form.set("image", photo, "palm.jpg");

    try {
      const res = await fetch("/api/reading", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.id) {
        void refreshProfile();
        router.push(`/reading/${json.id}`);
        return; // keep loading state while navigating
      }
      setSubmitting(false);
      const code = json?.error?.code;
      if (code === "INVALID_PALM") {
        setPhotoError({ title: "Please upload a clearer palm photo", detail: json.error.detail });
        uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (code === "NO_CREDITS") {
        openPayment({ onSuccess: submit, reason: "You've used your reading credits." });
      } else if (res.status === 401) {
        router.replace("/login");
      } else {
        setError(json?.error?.message ?? "Something went wrong. No credit was used — please try again.");
      }
    } catch {
      setSubmitting(false);
      setError("Network error — please check your connection. No credit was used.");
    }
  }

  function onPredict() {
    setTouched(true);
    if (!canSubmit) return;
    if ((profile?.reading_credits ?? 0) <= 0) {
      openPayment({ onSuccess: submit, reason: "Unlock your reading to continue." });
      return;
    }
    void submit();
  }

  return (
    <div className="relative overflow-hidden">
      <Mandala className="pointer-events-none absolute left-1/2 top-[-180px] h-[520px] w-[520px] -translate-x-1/2 text-brass/[0.07]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pt-12 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <span className="chip">
            <ScanLine className="h-3.5 w-3.5 text-brass" /> Samudrika Shastra reading
          </span>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-maroon sm:text-5xl lg:text-[3.5rem] lg:leading-[1.15]">
            Let us read your palm
          </h1>
          <p className="mt-3 text-umber sm:text-lg">
            Share a few details and a clear photo of your palm. Your reading is ready in about 15 seconds.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Details */}
          <section className="card-float p-5 sm:p-8 lg:col-span-5" aria-labelledby="details-title">
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-blush p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-maroon font-semibold text-cream">1</span>
              <div>
                <h2 id="details-title" className="font-serif text-xl font-semibold text-maroon">
                  Your details
                </h2>
                <p className="text-sm text-umber">Used to personalise your reading</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="name" className="label">
                  Full name <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-umber/70" />
                  <input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    autoComplete="name"
                    placeholder="e.g. Priya Sharma"
                    className="input pl-10"
                    aria-invalid={touched && !!fieldErrors.name}
                  />
                </div>
                {touched && fieldErrors.name && <p className="mt-1 text-sm text-danger">{fieldErrors.name}</p>}
              </div>

              <div>
                <label htmlFor="dob" className="label">
                  Date of birth <span className="text-danger">*</span>
                </label>
                <input
                  id="dob"
                  type="date"
                  value={dob}
                  max={todayMinus(0)}
                  min="1900-01-01"
                  onChange={(e) => setDob(e.target.value)}
                  className="input"
                  aria-invalid={!!dob && !!fieldErrors.dob}
                />
                {(touched || (dob && age !== null && age < 18)) && fieldErrors.dob && (
                  <p className="mt-1 text-sm text-danger">{fieldErrors.dob}</p>
                )}
              </div>

              <fieldset>
                <legend className="label">
                  Gender <span className="text-danger">*</span>
                </legend>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-blush p-1 sm:grid-cols-4">
                  {GENDERS.map((g) => (
                    <label
                      key={g.value}
                      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-2 text-center text-sm font-semibold leading-tight transition ${
                        gender === g.value ? "bg-maroon text-cream shadow-sm" : "text-umber hover:bg-cream"
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={g.value}
                        checked={gender === g.value}
                        onChange={() => setGender(g.value)}
                        className="sr-only"
                      />
                      {g.label}
                    </label>
                  ))}
                </div>
                {touched && fieldErrors.gender && <p className="mt-1 text-sm text-danger">{fieldErrors.gender}</p>}
              </fieldset>

              <fieldset>
                <legend className="label">Which hand are you showing?</legend>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { value: "right", title: "Right hand", sub: "Your actions and present path" },
                      { value: "left", title: "Left hand", sub: "Inborn gifts and nature" },
                    ] as const
                  ).map((h) => (
                    <label
                      key={h.value}
                      className={`cursor-pointer rounded-xl border p-3.5 transition ${
                        hand === h.value ? "border-maroon bg-blush ring-1 ring-maroon" : "border-line hover:bg-blush/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="hand"
                        value={h.value}
                        checked={hand === h.value}
                        onChange={() => setHand(h.value)}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-2 font-semibold text-maroon">
                        <Hand className={`h-5 w-5 text-brass ${h.value === "left" ? "-scale-x-100" : ""}`} />
                        {h.title}
                      </span>
                      <span className="mt-1 block text-sm leading-snug text-umber">{h.sub}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <p className="flex gap-2 rounded-xl bg-blush p-3.5 text-sm text-umber">
                <ShieldCheck className="h-5 w-5 shrink-0 text-brass" />
                Your palm photo is stored privately and only used for your reading. You can delete it anytime from
                My Readings.
              </p>
            </div>
          </section>

          {/* Photo */}
          <section className="card-float p-5 sm:p-8 lg:col-span-7" aria-labelledby="photo-title">
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-blush p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-maroon font-semibold text-cream">2</span>
              <div>
                <h2 id="photo-title" className="font-serif text-xl font-semibold text-maroon">
                  Your palm photo
                </h2>
                <p className="text-sm text-umber">JPG, PNG or HEIC · max 10 MB</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2" ref={uploadRef}>
              <div>
                {preview ? (
                  <div className="flex flex-col items-center">
                    <div className="arch relative aspect-[4/5] w-full max-w-[300px] overflow-hidden border-4 border-cream shadow-[0_0_0_1px_#b8893b,0_12px_32px_-4px_rgba(74,52,40,0.18)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Your palm photo preview" className="h-full w-full object-cover" />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => cameraRef.current?.click()} className="chip min-h-10 px-4">
                        <RotateCcw className="h-4 w-4" /> Retake
                      </button>
                      <button type="button" onClick={removePhoto} className="chip min-h-10 px-4">
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => galleryRef.current?.click()}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && galleryRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      void handleFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`arch flex aspect-[4/5] w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 text-center transition ${
                      dragging ? "border-maroon bg-blush-2" : "border-brass/70 bg-blush hover:bg-blush-2"
                    }`}
                    aria-label="Upload a palm photo"
                  >
                    {processing ? (
                      <Loader2 className="h-10 w-10 animate-spin text-maroon" />
                    ) : (
                      <>
                        <PalmOutline className="h-28 w-24 text-brass" />
                        <p className="mt-4 font-semibold text-maroon">Tap to take a photo or upload</p>
                        <p className="mt-1 text-sm text-umber">or drag and drop it here</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-xl bg-blush p-4">
                  <p className="eyebrow text-terracotta-dark">Add your photo</p>
                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                      disabled={processing}
                      className="btn-secondary w-full justify-start"
                    >
                      <Camera className="h-5 w-5" /> Take photo with camera
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryRef.current?.click()}
                      disabled={processing}
                      className="btn-secondary w-full justify-start"
                    >
                      <ImagePlus className="h-5 w-5" /> Upload from gallery
                    </button>
                  </div>
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      void handleFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={galleryRef}
                    type="file"
                    accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
                    className="hidden"
                    onChange={(e) => {
                      void handleFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>

                {photoError && (
                  <div role="alert" className="flex gap-3 rounded-xl border border-danger/30 bg-danger-bg p-4">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
                    <div className="text-sm">
                      <p className="font-semibold text-[#93000a]">{photoError.title}</p>
                      {photoError.detail && <p className="mt-0.5 text-[#93000a]/90">{photoError.detail}</p>}
                      <p className="mt-1 text-[#93000a]/90">No credit was used.</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-t-[40px] rounded-b-lg">
                    <Image src="/sample-palm.jpg" alt="Example of a good palm photo" fill sizes="80px" className="object-cover" />
                  </span>
                  <p className="text-sm text-umber">
                    <span className="block font-semibold text-ink">Like this</span>
                    Palm facing the camera, fingers relaxed, the whole hand in the frame.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <p className="eyebrow mb-3 text-center text-umber">Tips for an accurate reading</p>
              <ul className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { icon: Hand, title: "Open palm", sub: "Fingers spread naturally" },
                  { icon: Sun, title: "Good light", sub: "Daylight, no harsh flash" },
                  { icon: ScanLine, title: "Whole hand", sub: "Wrist to fingertips in frame" },
                ].map(({ icon: Icon, title, sub }) => (
                  <li key={title} className="rounded-xl bg-blush p-3 text-center">
                    <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-cream text-terracotta">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="block text-sm font-semibold text-ink">{title}</span>
                    <span className="hidden text-xs text-umber sm:block">{sub}</span>
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <p role="alert" className="mt-6 rounded-xl bg-danger-bg px-4 py-3 text-sm text-[#93000a]">
                {error}
              </p>
            )}

            <div className="mt-8">
              <button
                type="button"
                onClick={onPredict}
                aria-disabled={!canSubmit}
                className={`btn-primary min-h-14 w-full font-serif text-xl ${canSubmit ? "" : "opacity-60"}`}
              >
                <Diya className="h-7 w-7" /> Predict my future <ArrowRight className="h-5 w-5" />
              </button>
              <p className="mt-2 text-center text-sm text-umber">
                {!photo
                  ? "Add your details and a palm photo to continue"
                  : (profile?.reading_credits ?? 0) > 0
                    ? profile && !profile.free_credit_used
                      ? "Uses your free reading · includes 1 question"
                      : "Uses 1 reading credit · includes 10 questions"
                    : "₹99 unlocks this reading with 10 questions"}
              </p>
            </div>
          </section>
        </div>
      </div>

      {submitting && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-sand/95 px-6 text-center backdrop-blur"
          role="status"
          aria-live="polite"
        >
          <div className="relative flex h-64 w-64 items-center justify-center">
            <Mandala className="absolute inset-0 h-full w-full animate-spin-slow text-brass/60" />
            <Mandala className="absolute inset-8 animate-spin-rev text-maroon/30" petals={12} />
            <Diya className="relative h-20 w-20" />
          </div>
          <p key={msgIndex} className="mt-8 animate-fade-up font-serif text-2xl text-maroon">
            {LOADING_MESSAGES[msgIndex]}
          </p>
          <p className="mt-2 text-umber">This usually takes 10–20 seconds. Please keep this page open.</p>
        </div>
      )}
    </div>
  );
}
