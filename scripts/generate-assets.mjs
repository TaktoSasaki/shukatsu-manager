import sharp from 'sharp';
import { writeFileSync } from 'fs';

const BG = '#4F46E5';
const WHITE = '#FFFFFF';

// ---- SVG definitions ----

// icon.png / adaptive-icon.png: スーツ＆ネクタイ (1024×1024)
function suitSVG(size) {
  const s = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">
  <!-- 背景 -->
  <rect width="100" height="100" fill="${BG}" rx="20"/>

  <!-- シャツ (白) -->
  <polygon points="35,38 50,48 65,38 72,100 28,100" fill="${WHITE}" opacity="0.95"/>

  <!-- 左ラペル -->
  <polygon points="35,38 50,48 45,28 38,28 28,45" fill="#FFFFFF" opacity="0.85"/>
  <!-- 右ラペル -->
  <polygon points="65,38 50,48 55,28 62,28 72,45" fill="#FFFFFF" opacity="0.85"/>

  <!-- 左スーツ上着 -->
  <polygon points="18,42 35,38 38,28 28,24 16,55" fill="#312E81"/>
  <!-- 右スーツ上着 -->
  <polygon points="82,42 65,38 62,28 72,24 84,55" fill="#312E81"/>

  <!-- 左スーツ下 -->
  <polygon points="16,55 35,38 35,100 18,100" fill="#312E81"/>
  <!-- 右スーツ下 -->
  <polygon points="84,55 65,38 65,100 82,100" fill="#312E81"/>

  <!-- ネクタイ (上部) -->
  <polygon points="45,38 55,38 52,55 48,55" fill="#EF4444"/>
  <!-- ネクタイ (下部ノット) -->
  <polygon points="48,55 52,55 56,80 50,88 44,80" fill="#DC2626"/>
  <!-- ネクタイ ハイライト -->
  <line x1="50" y1="40" x2="50" y2="85" stroke="#FCA5A5" stroke-width="1.2" opacity="0.5"/>

  <!-- 頭部 -->
  <ellipse cx="50" cy="20" rx="11" ry="12" fill="#FBBF24"/>

  <!-- 髪 -->
  <ellipse cx="50" cy="10" rx="11" ry="6" fill="#1E1B4B"/>
  <rect x="39" y="10" width="22" height="6" fill="#1E1B4B"/>
</svg>`;
}

// splash-icon.png: より横長向け、シンプルなロゴ風 (200×200)
function splashSVG(size) {
  const s = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">
  <!-- シャツ (白) -->
  <polygon points="35,38 50,48 65,38 72,100 28,100" fill="${WHITE}" opacity="0.95"/>

  <!-- 左ラペル -->
  <polygon points="35,38 50,48 45,28 38,28 28,45" fill="${WHITE}" opacity="0.85"/>
  <!-- 右ラペル -->
  <polygon points="65,38 50,48 55,28 62,28 72,45" fill="${WHITE}" opacity="0.85"/>

  <!-- 左スーツ上着 -->
  <polygon points="18,42 35,38 38,28 28,24 16,55" fill="#312E81"/>
  <!-- 右スーツ上着 -->
  <polygon points="82,42 65,38 62,28 72,24 84,55" fill="#312E81"/>

  <!-- 左スーツ下 -->
  <polygon points="16,55 35,38 35,100 18,100" fill="#312E81"/>
  <!-- 右スーツ下 -->
  <polygon points="84,55 65,38 65,100 82,100" fill="#312E81"/>

  <!-- ネクタイ (上部) -->
  <polygon points="45,38 55,38 52,55 48,55" fill="#EF4444"/>
  <!-- ネクタイ (下部ノット) -->
  <polygon points="48,55 52,55 56,80 50,88 44,80" fill="#DC2626"/>

  <!-- 頭部 -->
  <ellipse cx="50" cy="20" rx="11" ry="12" fill="#FBBF24"/>
  <ellipse cx="50" cy="10" rx="11" ry="6" fill="#1E1B4B"/>
  <rect x="39" y="10" width="22" height="6" fill="#1E1B4B"/>
</svg>`;
}

// favicon.png: シンプルなネクタイのみ (64×64)
function faviconSVG(size) {
  const s = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${BG}" rx="16"/>
  <!-- ネクタイ上部 -->
  <polygon points="38,20 62,20 56,48 44,48" fill="${WHITE}"/>
  <!-- ネクタイ下部 -->
  <polygon points="44,48 56,48 62,85 50,95 38,85" fill="#E0E7FF"/>
  <!-- ネクタイ中央線 -->
  <line x1="50" y1="22" x2="50" y2="90" stroke="${BG}" stroke-width="2.5" opacity="0.3"/>
</svg>`;
}

async function svgToPng(svgString, outputPath, width, height) {
  const buf = Buffer.from(svgString);
  await sharp(buf)
    .resize(width, height)
    .png()
    .toFile(outputPath);
  console.log(`Generated: ${outputPath}`);
}

async function main() {
  // icon.png: 1024×1024
  await svgToPng(suitSVG(1024), 'assets/icon.png', 1024, 1024);

  // adaptive-icon.png: 1024×1024 (前景のみ、背景はapp.jsonで指定)
  // アダプティブアイコンは余白を多めに取る
  const adaptiveSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${BG}"/>
    <!-- 少し小さくして余白確保 (safe zone対応) -->
    <!-- シャツ -->
    <polygon points="35,38 50,48 65,38 72,100 28,100" fill="${WHITE}" opacity="0.95"/>
    <polygon points="35,38 50,48 45,28 38,28 28,45" fill="${WHITE}" opacity="0.85"/>
    <polygon points="65,38 50,48 55,28 62,28 72,45" fill="${WHITE}" opacity="0.85"/>
    <polygon points="18,42 35,38 38,28 28,24 16,55" fill="#312E81"/>
    <polygon points="82,42 65,38 62,28 72,24 84,55" fill="#312E81"/>
    <polygon points="16,55 35,38 35,100 18,100" fill="#312E81"/>
    <polygon points="84,55 65,38 65,100 82,100" fill="#312E81"/>
    <polygon points="45,38 55,38 52,55 48,55" fill="#EF4444"/>
    <polygon points="48,55 52,55 56,80 50,88 44,80" fill="#DC2626"/>
    <ellipse cx="50" cy="20" rx="11" ry="12" fill="#FBBF24"/>
    <ellipse cx="50" cy="10" rx="11" ry="6" fill="#1E1B4B"/>
    <rect x="39" y="10" width="22" height="6" fill="#1E1B4B"/>
  </svg>`;
  await svgToPng(adaptiveSVG, 'assets/adaptive-icon.png', 1024, 1024);

  // splash-icon.png: 200×200
  await svgToPng(splashSVG(200), 'assets/splash-icon.png', 200, 200);

  // favicon.png: 64×64
  await svgToPng(faviconSVG(64), 'assets/favicon.png', 64, 64);
}

main().catch(console.error);
