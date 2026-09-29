"use client";

import type { Reading } from "@/lib/reading-schema";
import { DISCLAIMER } from "@/lib/constants";

export type ReadingMeta = { name: string; dob: string; hand: string; createdAt: string };

const MAROON: [number, number, number] = [122, 31, 43];
const BRASS: [number, number, number] = [184, 137, 59];
const INK: [number, number, number] = [43, 35, 32];
const UMBER: [number, number, number] = [110, 94, 87];

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** jsPDF's built-in fonts are Latin-1 only; replace characters it can't render. */
function latin(s: string) {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/₹/g, "Rs.")
    .replace(/[^\x00-\xFF]/g, "");
}

export async function downloadReadingPdf(r: Reading, meta: ReadingMeta, imageUrl: string | null) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const ensure = (h: number) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const heading = (t: string) => {
    ensure(40);
    y += 10;
    doc.setFont("times", "bold").setFontSize(16).setTextColor(...MAROON).text(latin(t), M, y);
    y += 6;
    doc.setDrawColor(...BRASS).setLineWidth(0.6).line(M, y, W - M, y);
    y += 18;
  };
  const para = (label: string | null, body: string) => {
    const lines = doc.setFont("helvetica", "normal").setFontSize(10.5).splitTextToSize(latin(body), W - 2 * M);
    ensure((label ? 16 : 0) + lines.length * 14 + 6);
    if (label) {
      doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK).text(latin(label), M, y);
      y += 15;
    }
    doc.setFont("helvetica", "normal").setFontSize(10.5).setTextColor(...INK).text(lines, M, y);
    y += lines.length * 14 + 8;
  };

  // Title block
  doc.setFillColor(251, 246, 238).rect(0, 0, W, 120, "F");
  doc.setFont("times", "bold").setFontSize(24).setTextColor(...MAROON).text("Hastrekha AI", M, 58);
  doc.setFont("times", "italic").setFontSize(12).setTextColor(...UMBER).text("Your palm, your path", M, 78);
  doc
    .setFont("helvetica", "normal")
    .setFontSize(10)
    .text(
      latin(
        `${meta.name} · Born ${dateFmt.format(new Date(meta.dob + "T00:00:00"))} · ${r.zodiac_sign} · ${
          meta.hand === "right" ? "Right" : "Left"
        } hand`,
      ),
      M,
      100,
    );
  y = 150;

  if (imageUrl) {
    const data = await toDataUrl(imageUrl);
    if (data) {
      try {
        const props = doc.getImageProperties(data);
        const w = 150;
        const h = (props.height / props.width) * w;
        doc.addImage(data, "JPEG", W - M - w, 140, w, Math.min(h, 200));
        const summaryLines = doc.setFontSize(11).splitTextToSize(latin(r.summary), W - 3 * M - w + 20);
        doc.setFont("times", "bold").setFontSize(16).setTextColor(...MAROON).text("Overview", M, y);
        y += 20;
        doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(...INK).text(summaryLines, M, y);
        y = Math.max(y + summaryLines.length * 15, 140 + Math.min(h, 200)) + 10;
      } catch {
        para(null, r.summary);
      }
    } else {
      para(null, r.summary);
    }
  } else {
    para(null, r.summary);
  }

  heading("Palm lines");
  para("Heart line", r.lines.heart);
  para("Head line", r.lines.head);
  para("Life line", r.lines.life);
  para("Fate line", r.lines.fate);

  heading("Life areas");
  para("Career", r.life_areas.career);
  para("Love & marriage", r.life_areas.love_marriage);
  para("Health", r.life_areas.health);
  para("Wealth", r.life_areas.wealth);

  heading("Mounts & traits");
  r.mounts.forEach((m) => para(`${m.name} (${m.strength})`, m.meaning));
  if (r.traits.length) para("Personality traits", r.traits.join(" · "));

  heading("Remedies & lucky items");
  para(
    null,
    `Lucky colour: ${r.remedies.lucky_colour}   Lucky number: ${r.remedies.lucky_number}   Lucky day: ${r.remedies.lucky_day}   Gemstone: ${r.remedies.gemstone}`,
  );
  r.remedies.simple_remedies.forEach((s, i) => para(null, `${i + 1}. ${s}`));

  ensure(40);
  y += 10;
  doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(...UMBER);
  doc.text(doc.splitTextToSize(latin(`${DISCLAIMER} Generated on ${dateFmt.format(new Date(meta.createdAt))}.`), W - 2 * M), M, y);

  const safe = meta.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "reading";
  doc.save(`hastrekha-${safe}.pdf`);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Renders a 1080x1350 share card as a PNG blob. */
export async function renderShareCard(r: Reading, meta: ReadingMeta): Promise<Blob> {
  await document.fonts.ready;
  const root = getComputedStyle(document.documentElement);
  const serif = root.getPropertyValue("--font-playfair").trim() || "Georgia, serif";
  const sans = root.getPropertyValue("--font-jakarta").trim() || "system-ui, sans-serif";

  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#FBF6EE";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#B8893B";
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.lineWidth = 1;
  ctx.strokeRect(50, 50, W - 100, H - 100);

  // faint mandala rings
  ctx.strokeStyle = "rgba(184,137,59,0.12)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(W / 2, 260, 120 + i * 60, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#9C431D";
  ctx.font = `600 28px ${sans}`;
  ctx.fillText("MY PALM READING", W / 2, 150);
  ctx.fillStyle = "#7A1F2B";
  ctx.font = `600 76px ${serif}`;
  ctx.fillText(meta.name.slice(0, 22), W / 2, 250);
  ctx.fillStyle = "#6E5E57";
  ctx.font = `italic 34px ${serif}`;
  ctx.fillText(`${r.zodiac_sign} · ${meta.hand === "right" ? "Right" : "Left"} hand`, W / 2, 310);

  ctx.fillStyle = "#2B2320";
  ctx.font = `400 38px ${sans}`;
  const lines = wrap(ctx, r.summary, W - 220).slice(0, 7);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 420 + i * 56));

  const top = 420 + lines.length * 56 + 60;
  const items = [
    ["Lucky colour", r.remedies.lucky_colour],
    ["Lucky number", String(r.remedies.lucky_number)],
    ["Lucky day", r.remedies.lucky_day],
    ["Gemstone", r.remedies.gemstone],
  ];
  const boxW = (W - 220 - 30) / 2;
  items.forEach(([k, v], i) => {
    const x = 110 + (i % 2) * (boxW + 30);
    const y = top + Math.floor(i / 2) * 150;
    ctx.fillStyle = "#FFF1EC";
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, 124, 20);
    ctx.fill();
    ctx.fillStyle = "#9C431D";
    ctx.font = `600 24px ${sans}`;
    ctx.fillText(k.toUpperCase(), x + boxW / 2, y + 46);
    ctx.fillStyle = "#7A1F2B";
    ctx.font = `600 40px ${serif}`;
    ctx.fillText((v || "-").slice(0, 20), x + boxW / 2, y + 96);
  });

  if (r.traits.length) {
    ctx.fillStyle = "#6E5E57";
    ctx.font = `500 30px ${sans}`;
    ctx.fillText(r.traits.slice(0, 4).join("  ·  "), W / 2, top + 350);
  }

  ctx.fillStyle = "#7A1F2B";
  ctx.font = `600 44px ${serif}`;
  ctx.fillText("Hastrekha AI", W / 2, H - 150);
  ctx.fillStyle = "#6E5E57";
  ctx.font = `400 24px ${sans}`;
  ctx.fillText("Your palm, your path · For entertainment only", W / 2, H - 104);

  return await new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/png"),
  );
}

export async function shareReading(r: Reading, meta: ReadingMeta): Promise<"shared" | "downloaded" | "cancelled"> {
  const text = `My palm reading from Hastrekha AI ✋✨\n\n${r.summary}\n\nGet yours: ${window.location.origin}`;
  const blob = await renderShareCard(r, meta);
  const file = new File([blob], "my-palm-reading.png", { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }

  // Fallback: download the image and open WhatsApp with the text.
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  return "downloaded";
}
