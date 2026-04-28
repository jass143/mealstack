import sharp from "sharp";
import fs from "fs";
import path from "path";

const OUT = path.resolve("public/images");
const orange = "#d4873a";
const darkBg = "#0a0e1a";
const amber = "#f59e0b";

function plateIcon(cx, cy, scale, color) {
  const s = scale;
  return `
    <line x1="${cx}" y1="${cy - 42*s}" x2="${cx}" y2="${cy - 28*s}" stroke="${color}" stroke-width="${1.3*s}" stroke-linecap="round"/>
    <line x1="${cx - 5*s}" y1="${cy - 42*s}" x2="${cx - 5*s}" y2="${cy - 30*s}" stroke="${color}" stroke-width="${1.1*s}" stroke-linecap="round"/>
    <line x1="${cx + 5*s}" y1="${cy - 42*s}" x2="${cx + 5*s}" y2="${cy - 30*s}" stroke="${color}" stroke-width="${1.1*s}" stroke-linecap="round"/>
    <path d="M${cx - 5*s} ${cy - 30*s} Q${cx} ${cy - 26*s} ${cx + 5*s} ${cy - 30*s}" fill="none" stroke="${color}" stroke-width="${1.1*s}" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy - 27*s}" x2="${cx}" y2="${cy - 14*s}" stroke="${color}" stroke-width="${1.5*s}" stroke-linecap="round"/>
    <path d="M${cx - 40*s} ${cy} Q${cx} ${cy - 38*s} ${cx + 40*s} ${cy}" fill="none" stroke="${color}" stroke-width="${1.6*s}" stroke-linecap="round"/>
    <path d="M${cx - 48*s} ${cy + 4*s} Q${cx} ${cy + 16*s} ${cx + 48*s} ${cy + 4*s}" fill="none" stroke="${color}" stroke-width="${1.6*s}" stroke-linecap="round"/>
    <path d="M${cx - 36*s} ${cy + 10*s} Q${cx} ${cy + 20*s} ${cx + 36*s} ${cy + 10*s}" fill="none" stroke="${color}" stroke-width="${1.3*s}" stroke-linecap="round"/>
    <line x1="${cx - 50*s}" y1="${cy + 16*s}" x2="${cx + 50*s}" y2="${cy + 16*s}" stroke="${color}" stroke-width="${0.8*s}" opacity="0.25"/>
    <path d="M${cx - 12*s} ${cy - 4*s} Q${cx - 14*s} ${cy - 12*s} ${cx - 11*s} ${cy - 20*s}" fill="none" stroke="${color}" stroke-width="${0.8*s}" stroke-linecap="round" opacity="0.35"/>
    <path d="M${cx + 12*s} ${cy - 4*s} Q${cx + 14*s} ${cy - 12*s} ${cx + 11*s} ${cy - 20*s}" fill="none" stroke="${color}" stroke-width="${0.8*s}" stroke-linecap="round" opacity="0.35"/>
    <circle cx="${cx - 22*s}" cy="${cy + 2*s}" r="${1.2*s}" fill="${color}" opacity="0.3"/>
    <circle cx="${cx + 22*s}" cy="${cy + 2*s}" r="${1.2*s}" fill="${color}" opacity="0.3"/>
  `;
}

// FULL: wider, bigger font
function makeFullLogo({ accentColor, bg = "none", w = 500, h = 120 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 500 120">
  ${bg !== "none" ? `<rect width="500" height="120" fill="${bg}"/>` : ""}

  <!-- Circled M -->
  <circle cx="52" cy="56" r="40" fill="none" stroke="${accentColor}" stroke-width="2"/>
  <text x="52" y="71" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="44" fill="${accentColor}">M</text>

  <!-- Divider -->
  <line x1="112" y1="16" x2="112" y2="100" stroke="${accentColor}" stroke-width="0.8" opacity="0.25"/>

  <!-- Plate+fork icon -->
  ${plateIcon(240, 50, 1.0, accentColor)}

  <!-- "Meal Stack" text — bigger font -->
  <text x="240" y="106" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="22" fill="${accentColor}" letter-spacing="4">Meal Stack</text>
</svg>`;
}

// COMPACT: sidebar version
function makeCompactLogo({ accentColor, bg = "none", w = 300, h = 90 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 300 90">
  ${bg !== "none" ? `<rect width="300" height="90" fill="${bg}"/>` : ""}

  <!-- Circle M — fully visible, centered -->
  <circle cx="32" cy="38" r="26" fill="none" stroke="${accentColor}" stroke-width="1.5"/>
  <text x="32" y="47" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="28" fill="${accentColor}">M</text>

  <!-- Divider -->
  <line x1="72" y1="10" x2="72" y2="72" stroke="${accentColor}" stroke-width="0.7" opacity="0.25"/>

  <!-- Plate+fork icon -->
  ${plateIcon(152, 34, 0.6, accentColor)}

  <!-- Text -->
  <text x="152" y="78" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="15" fill="${accentColor}" letter-spacing="2.5">Meal Stack</text>
</svg>`;
}

function makeIconSvg({ accentColor, bg = "none", size = 120, padding = 14 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg !== "none" ? `<rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${bg}"/>` : ""}
  ${plateIcon(size/2, size/2, (size - padding*2) / 100, accentColor)}
</svg>`;
}

const logos = [
  { name: "logo-full-dark", svg: makeFullLogo({ accentColor: orange, bg: darkBg }), w: 1000, h: 240 },
  { name: "logo-full-dark-nobg", svg: makeFullLogo({ accentColor: orange }), w: 1000, h: 240 },
  { name: "logo-full-light", svg: makeFullLogo({ accentColor: orange }), w: 1000, h: 240 },
  { name: "logo-full-white", svg: makeFullLogo({ accentColor: "#ffffff" }), w: 1000, h: 240 },

  { name: "logo-compact-dark", svg: makeCompactLogo({ accentColor: orange }), w: 560, h: 140 },
  { name: "logo-compact-white", svg: makeCompactLogo({ accentColor: "#ffffff" }), w: 560, h: 140 },

  { name: "logo-icon-orange", svg: makeIconSvg({ accentColor: orange }), w: 256, h: 256 },
  { name: "logo-icon-dark-bg", svg: makeIconSvg({ accentColor: orange, bg: darkBg }), w: 256, h: 256 },
  { name: "logo-icon-gradient", svg: makeIconSvg({ accentColor: "#fff", bg: "url(#g)" }).replace("<rect", `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${orange}"/><stop offset="100%" stop-color="${amber}"/></linearGradient></defs><rect`), w: 256, h: 256 },
];

async function generate() {
  const existing = fs.readdirSync(OUT).filter(f => f.startsWith("logo-"));
  for (const f of existing) fs.unlinkSync(path.join(OUT, f));

  for (const logo of logos) {
    fs.writeFileSync(path.join(OUT, `${logo.name}.svg`), logo.svg);
    try {
      await sharp(Buffer.from(logo.svg)).resize(logo.w, logo.h).png().toFile(path.join(OUT, `${logo.name}.png`));
      console.log(`OK ${logo.name}.png (${logo.w}x${logo.h})`);
    } catch (err) {
      console.error(`FAIL ${logo.name}: ${err.message}`);
    }
  }

  const favSvg = makeIconSvg({ accentColor: orange, bg: darkBg, size: 48, padding: 6 });
  await sharp(Buffer.from(favSvg)).resize(48, 48).png().toFile(path.join("public", "favicon.png"));
  console.log("OK favicon.png");
  console.log(`\nDone!`);
}

generate();
