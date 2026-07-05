/* Inline SVG icons for categories. Stroke-based, inherit currentColor.
 * categoryIcon(name) picks the best match by keyword.
 */

const I = {
  drinkware: '<path d="M6 3h12l-1.2 15.4A2 2 0 0 1 14.8 21H9.2a2 2 0 0 1-2-1.6L6 3Z"/><path d="M17.5 7h1.8a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3H17"/>',
  writing: '<path d="m12 19 7-7a2.1 2.1 0 0 0-3-3l-7 7-1 4 4-1Z"/><path d="m18 13-3-3"/>',
  notebooks: '<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2V5Z"/><path d="M8 3v18"/><path d="M12 7h4M12 11h4"/>',
  bags: '<path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  apparel: '<path d="m8 3 4 3 4-3 5 4-3 3v10H6V10L3 7l5-4Z"/>',
  accessories: '<circle cx="12" cy="8" r="5"/><path d="M12 13v8M9 21h6"/>',
  tech: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  umbrella: '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z"/><path d="M12 12v7a2.5 2.5 0 0 1-5 0"/>',
  tools: '<path d="M14 7a3.5 3.5 0 0 1-4.6 4.6L4 17v3h3l5.4-5.4A3.5 3.5 0 0 1 17 10l4-4-3-3-4 4Z"/>',
  health: '<path d="M20 8.5a5.5 5.5 0 0 0-9.5-3.8L12 6l1.5-1.3A5.5 5.5 0 0 0 4 8.5c0 5 8 11 8 11s8-6 8-11Z"/>',
  events: '<path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z"/><path d="M4 8 12 3l8 5"/><path d="M9 13h6"/>',
  services: '<rect x="4" y="7" width="16" height="12" rx="2"/><circle cx="12" cy="13" r="3"/><path d="M9 7 10.5 4h3L15 7"/>',
  gift: '<rect x="3" y="8" width="18" height="4"/><path d="M5 12v9h14v-9"/><path d="M12 8v13"/><path d="M12 8S9 3 7 5s5 3 5 3ZM12 8s3-5 5-3-5 3-5 3Z"/>',
};

function key(name) {
  const n = String(name).toLowerCase();
  if (/drink|tumbler|mug|bottle|flask|jar|glass|cup/.test(n)) return "drinkware";
  if (/writ|pen|pencil|stylus/.test(n)) return "writing";
  if (/note|paper|book|journal|planner|memo/.test(n)) return "notebooks";
  if (/bag|pouch|tote|wallet|case/.test(n)) return "bags";
  if (/apparel|shirt|cap|hat|jacket|jersey|polo/.test(n)) return "apparel";
  if (/access|key|lanyard|\bid\b|lace|pin|magnet/.test(n)) return "accessories";
  if (/tech|usb|power|cable|clock|mouse|gadget/.test(n)) return "tech";
  if (/home|lifestyle|lamp|mirror|fan|coaster|pillow/.test(n)) return "home";
  if (/umbrella/.test(n)) return "umbrella";
  if (/tool|knife|flashlight|opener|multi/.test(n)) return "tools";
  if (/health|safety|dispenser|thermo|mask|towel/.test(n)) return "health";
  if (/kit|event|corporate|bundle/.test(n)) return "events";
  if (/service|photo|print|embroider|patch/.test(n)) return "services";
  if (/gift|giveaway|promo/.test(n)) return "gift";
  return "gift";
}

export function categoryIcon(name, size = 30) {
  const body = I[key(name)] || I.gift;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

const UI = {
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5m6 6-6-6 6-6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  addList: '<path d="M8 6h12M8 12h8M8 18h5"/><path d="M3 5h.01M3 11h.01M3 17h.01"/><path d="M18 15v6m-3-3h6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a2 2 0 0 1 0-4h3a6 6 0 0 0 0-12h-3Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="6.5" r="1"/><circle cx="15" cy="7" r="1"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  truck: '<path d="M3 6h11v11H3Z"/><path d="M14 10h4l3 3v4h-7Z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
  support: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M18 19c0 1-1 2-2 2h-3"/><rect x="3" y="13" width="4" height="6" rx="2"/><rect x="17" y="13" width="4" height="6" rx="2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
  package: '<path d="m21 8-9 5-9-5 9-5 9 5Z"/><path d="m3 8 9 5 9-5v9l-9 5-9-5Z"/><path d="M12 13v9"/>',
  camera: '<path d="M14.5 5 13 3h-2L9.5 5H5a2 2 0 0 0-2 2v12h18V7a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="4"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3 5.2 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L9 10.8a16 16 0 0 0 4.2 4.2l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  facebook: '<path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v6h4v-6h3l1-4h-4V9c0-.7.3-1 1-1Z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>',
  youtube: '<path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.6 12 5.6 12 5.6s-5 0-6.9.5A3 3 0 0 0 3 8.2 31 31 0 0 0 2.6 12a31 31 0 0 0 .5 3.8 3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-3.8 31 31 0 0 0-.6-3.8Z"/><path d="m10 15 5-3-5-3v6Z"/>',
  linkedin: '<rect x="4" y="9" width="4" height="11"/><path d="M6 4v.01"/><path d="M12 20v-6a4 4 0 0 1 8 0v6M12 9v11"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  handshake: '<path d="m11 17 2 2a2 2 0 0 0 3-3l-3-3"/><path d="m8 14 3 3a2 2 0 0 1-3 3l-6-6 5-5 3 1 4-4 8 8-3 3"/><path d="m2 14-1-1 6-6 1 1M22 14l1-1-6-6-1 1"/>',
};

export function uiIcon(name, size = 18) {
  const body = UI[name] || UI.grid;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/* A branded placeholder image (data-URI) for products/services with no image.
 * Warm gradient + the matching category icon + "ALON-PH". Usable as <img src>.
 */
export function placeholderImage(name = "", label = "ALON-PH") {
  const body = I[key(name)] || I.gift;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff6ec"/><stop offset="1" stop-color="#ffe1c4"/>
    </linearGradient></defs>
    <rect width="600" height="450" fill="url(#g)"/>
    <g transform="translate(258 150) scale(3.5)" fill="none" stroke="#ed5209" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">${body}</g>
    <text x="300" y="360" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="800" fill="#ed5209" text-anchor="middle" letter-spacing="1">${label}</text>
    <text x="300" y="388" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="700" fill="#b0764a" text-anchor="middle" letter-spacing="2">IMAGE COMING SOON</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
