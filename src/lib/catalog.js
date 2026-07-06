/* Catalog data layer. Runs at BUILD time (server-side) in Astro.
 * Fetches Categories / Products / Variants from Google Sheets and joins them.
 * If SHEET_API_KEY is missing, falls back to sample data so `npm run dev`
 * works out of the box.
 */

const clean = (v) => (v == null ? v : String(v).trim().replace(/^["']|["']$/g, ""));
// Trim whitespace/quotes so a slightly messy GitHub secret (trailing space,
// newline, or pasted with quotes) still works.
const SHEET_ID = clean(process.env.SHEET_ID);
const SHEET_API_KEY = clean(process.env.SHEET_API_KEY);

// Tab names: use the env value ONLY if it's non-empty, else the default.
// (CI can pass an empty string from an unset secret. `= default` in
//  destructuring only applies to `undefined`, not "", so guard explicitly.)
const tab = (v, fallback) => (clean(v) || fallback);
const TAB_CATEGORIES = tab(process.env.TAB_CATEGORIES, "Categories");
const TAB_PRODUCTS = tab(process.env.TAB_PRODUCTS, "Products");
const TAB_VARIANTS = tab(process.env.TAB_VARIANTS, "Variants");
const TAB_SERVICES = tab(process.env.TAB_SERVICES, "Services");
const TAB_HOME = tab(process.env.TAB_HOME, "Home");

// A URL-safe slug for detail pages.
function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------- helpers ----------

function rowsToObjects(values) {
  if (!values || !values.length) return [];
  const headers = values[0].map((h) => String(h).trim());
  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] != null ? String(row[i]).trim() : "";
    });
    return obj;
  });
}

const truthy = (v) => String(v).trim().toUpperCase() === "TRUE";
// Active unless explicitly FALSE (Sheets API drops trailing empty cells).
const isActive = (v) => String(v).trim().toUpperCase() !== "FALSE";

function parseAttributes(s) {
  const out = {};
  if (!s) return out;
  s.split(";").forEach((pair) => {
    const [k, ...rest] = pair.split("=");
    if (k && rest.length) out[k.trim()] = rest.join("=").trim();
  });
  return out;
}

// Accepts a bare Google Drive file ID (preferred), a full Drive share link,
// an lh3.googleusercontent.com link, or any direct image URL — and returns a
// displayable image URL. Empty input returns "" (caller shows a placeholder).
export function driveImage(input) {
  const v = String(input || "").trim();
  if (!v) return "";

  // Pull an ID out of a known Drive/Google URL shape…
  const m =
    v.match(/\/file\/d\/([A-Za-z0-9_-]+)/) ||   // .../file/d/<ID>/view
    v.match(/[?&]id=([A-Za-z0-9_-]+)/) ||        // ...?id=<ID>
    v.match(/googleusercontent\.com\/d\/([A-Za-z0-9_-]+)/); // lh3.../d/<ID>
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;

  // …otherwise, if it's a bare ID (no scheme, no slashes/spaces, Drive-ID chars).
  if (!/[/\s]/.test(v) && !/^https?:/i.test(v) && /^[A-Za-z0-9_-]{20,}$/.test(v)) {
    return `https://lh3.googleusercontent.com/d/${v}`;
  }

  // Already a usable URL (e.g. an external image link).
  return /^https?:/i.test(v) ? v : "";
}

// Parse a comma-separated list of Drive links into an array of view URLs.
function parseGallery(s) {
  if (!s) return [];
  return s
    .split(",")
    .map((u) => driveImage(u.trim()))
    .filter(Boolean);
}

const num = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 9999;
};

// ---------- fetch ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch a tab, retrying on transient errors (429/500/502/503/504) so a brief
// Google Sheets API hiccup doesn't fall back to sample data on a real build.
async function fetchTab(tab, { retries = 4 } = {}) {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}` +
    `/values/${encodeURIComponent(tab)}?key=${SHEET_API_KEY}`;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res;
    try {
      res = await fetch(url);
    } catch (e) {
      lastErr = e;
      await sleep(400 * 2 ** attempt);
      continue;
    }
    if (res.ok) {
      const json = await res.json();
      return rowsToObjects(json.values || []);
    }
    const body = await res.text().catch(() => "");
    lastErr = new Error(`Sheet "${tab}" (${res.status}): ${body.slice(0, 160)}`);
    // Only retry transient statuses; 4xx (bad key / missing tab) fail fast.
    if (![429, 500, 502, 503, 504].includes(res.status)) throw lastErr;
    if (attempt < retries) {
      console.warn(`[catalog] "${tab}" ${res.status}, retrying (${attempt + 1}/${retries})…`);
      await sleep(500 * 2 ** attempt);
    }
  }
  throw lastErr;
}

// ---------- assemble ----------

// The Home tab is key/value rows: columns `key`, `value`.
// Returns a plain object { hero_title: "...", ... } with defaults filled in.
function assembleHome(rows) {
  const home = { ...HOME_DEFAULTS };
  rows.forEach((r) => {
    const key = (r.key || "").trim();
    if (key) home[key] = r.value != null ? String(r.value).trim() : "";
  });
  return home;
}

function assemble(cats, prods, vars, servs = [], homeRows = []) {
  const categories = cats
    .filter((c) => isActive(c.active))
    .sort((a, b) => num(a.sort_order) - num(b.sort_order))
    .map((c) => ({
      id: c.category_id,
      name: c.name,
      slug: c.slug || c.category_id,
      description: c.description || "",
    }));

  const variantsByProduct = {};
  vars
    .filter((v) => isActive(v.active))
    .forEach((v) => {
      (variantsByProduct[v.product_id] ||= []).push({
        id: v.variant_id,
        productId: v.product_id,
        name: v.name,
        attributes: parseAttributes(v.attributes),
        image: driveImage(v.variant_image),
        notes: v.notes || "",
        sort: num(v.sort_order),
      });
    });
  Object.values(variantsByProduct).forEach((list) =>
    list.sort((a, b) => a.sort - b.sort)
  );

  const products = prods
    .filter((p) => isActive(p.active))
    .map((p) => ({
      id: p.product_id,
      slug: p.slug || slugify(p.product_id || p.name),
      categoryId: p.category_id,
      name: p.name,
      desc: p.short_description || "",
      image: driveImage(p.main_image),
      gallery: parseGallery(p.gallery),
      tags: (p.tags || "").toLowerCase(),
      featured: truthy(p.featured),
      sort: num(p.sort_order),
      variants: variantsByProduct[p.product_id] || [],
    }))
    .sort((a, b) => a.sort - b.sort);

  const services = servs
    .filter((s) => isActive(s.active))
    .map((s) => ({
      id: s.service_id,
      slug: s.slug || slugify(s.service_id || s.name),
      name: s.name,
      desc: s.description || s.short_description || "",
      image: driveImage(s.main_image),
      gallery: parseGallery(s.gallery),
      tags: (s.tags || "").toLowerCase(),
      featured: truthy(s.featured),
      sort: num(s.sort_order),
    }))
    .sort((a, b) => a.sort - b.sort);

  const home = assembleHome(homeRows);

  return { categories, products, services, home };
}

// ---------- public API ----------

let cache = null;

export async function getCatalog() {
  if (cache) return cache;

  if (!SHEET_API_KEY || SHEET_API_KEY === "PUT_YOUR_API_KEY_HERE") {
    console.warn(
      "[catalog] No SHEET_API_KEY set. Using sample data. Add .env to load your sheet."
    );
    cache = { ...normalizeSample(SAMPLE), usingSample: true };
    return cache;
  }

  try {
    const optional = (tab) => (e) => {
      console.warn(`[catalog] "${tab}" tab not loaded (${e.message}). Add a "${tab}" tab to enable it.`);
      return [];
    };
    const [cats, prods, vars, servs, homeRows] = await Promise.all([
      fetchTab(TAB_CATEGORIES),
      fetchTab(TAB_PRODUCTS),
      fetchTab(TAB_VARIANTS),
      // Services and Home tabs are optional. A missing tab is empty, not an error.
      fetchTab(TAB_SERVICES).catch(optional(TAB_SERVICES)),
      fetchTab(TAB_HOME).catch(optional(TAB_HOME)),
    ]);
    cache = { ...assemble(cats, prods, vars, servs, homeRows), usingSample: false };
    return cache;
  } catch (err) {
    // A key WAS provided, so we were meant to use the real sheet. During a
    // production build, fail loudly instead of silently shipping sample data
    // (that's how a bad/whitespace-y secret slips through unnoticed).
    if (process.env.NODE_ENV === "production" || process.env.CI) {
      console.error("[catalog] Sheet fetch FAILED with a key present. Refusing to build sample data.");
      console.error("[catalog]", err.message);
      throw new Error(
        `Sheet fetch failed during build: ${err.message}\n` +
        `Check the SHEET_ID and SHEET_API_KEY secrets on GitHub (no quotes/spaces), ` +
        `and that the sheet is shared as "Anyone with the link" with Viewer access.`
      );
    }
    console.error("[catalog] Sheet fetch failed, using sample data (dev):", err.message);
    cache = { ...normalizeSample(SAMPLE), usingSample: true, error: err.message };
    return cache;
  }
}

// Ensure sample objects have the same fields as sheet-derived ones (slug, gallery).
function normalizeSample(s) {
  return {
    ...s,
    products: s.products.map((p) => ({
      slug: slugify(p.id || p.name),
      gallery: [],
      ...p,
    })),
    services: (s.services || []).map((sv) => ({
      slug: slugify(sv.id || sv.name),
      ...sv,
    })),
  };
}

// ---------- Home content defaults (overridden by the Home tab) ----------

const HOME_DEFAULTS = {
  hero_title_line1: "Customized Event Kits,",
  hero_title_line2: "Branded Merchandise,",
  hero_title_line3: "Giveaways &",
  hero_title_highlight: "Event Support Services",
  hero_subtitle: "Custom pieces and reliable event support, all in one place.",
  hero_cta_primary: "Request Quote",
  hero_cta_secondary: "Browse Catalog",
  featured_title: "Featured Items",
  featured_subtitle: "Customer favorites for celebrations, company events, and giveaways.",
  photobooth_title: "Photobooth Services",
  photobooth_subtitle: "Give your guests a fun keepsake from the day.",
  photobooth_features:
    "Premium Fun & Props, Fun Props, Unlimited Prints, Digital Copies, Custom Layouts",
  collab_kicker: "LET'S WORK TOGETHER",
  collab_title: "Open for Collaborations",
  collab_subtitle: "We partner with event organizers, schools, companies, agencies, and resellers.",
  // Default email comes from the INQUIRY_EMAIL secret so the whole site (contact
  // links, footer, inquiry send) uses one address. A Home-tab `contact_email`
  // row still overrides this if set.
  contact_email: clean(process.env.INQUIRY_EMAIL) || "alokcreationsofficial@gmail.com",
  contact_phone: "0991 725 0311",
  contact_location: "Daraga, Albay, Philippines",
  tagline: "Bright creation for chosen moments",
  facebook_url: "https://www.facebook.com/profile.php?id=61583953806189",
  instagram_url: "",
  youtube_url: "",
};

// ---------- sample fallback (mirrors your real catalog shape) ----------

const SAMPLE = {
  home: HOME_DEFAULTS,
  categories: [
    { id: "drinkware", name: "Drinkware", slug: "drinkware", description: "Tumblers, mugs, bottles" },
    { id: "writing", name: "Writing Instruments", slug: "writing", description: "Ballpens & pens" },
    { id: "bags", name: "Bags & Pouches", slug: "bags", description: "Eco bags & pouches" },
    { id: "services", name: "Services", slug: "services", description: "Photobooth & printing" },
  ],
  products: [
    {
      id: "tumbler-printed", categoryId: "drinkware", name: "Printed Tumbler",
      desc: "Insulated tumbler, price includes one-color print", image: "",
      tags: "tumbler,drinkware,giveaway", featured: true, sort: 1,
      variants: [
        { id: "tp-p01", productId: "tumbler-printed", name: "Tumbler P01", attributes: { moq: "100", price: "105" }, image: "", notes: "", sort: 1 },
        { id: "tp-p04", productId: "tumbler-printed", name: "Tumbler P04", attributes: { moq: "100", price: "135" }, image: "", notes: "", sort: 2 },
        { id: "tp-m05", productId: "tumbler-printed", name: "Tumbler M05", attributes: { moq: "100", price: "205" }, image: "", notes: "", sort: 3 },
      ],
    },
    {
      id: "ballpen-metal", categoryId: "writing", name: "Metal Ballpen",
      desc: "Premium metal-body ballpens", image: "",
      tags: "ballpen,pen,metal", featured: false, sort: 2,
      variants: [
        { id: "bm-m01", productId: "ballpen-metal", name: "Ballpen M01", attributes: { moq: "100", price: "12" }, image: "", notes: "", sort: 1 },
        { id: "bm-m02", productId: "ballpen-metal", name: "Ballpen M02", attributes: { moq: "100", price: "12" }, image: "", notes: "", sort: 2 },
      ],
    },
    {
      id: "eco-bag", categoryId: "bags", name: "Eco Bag",
      desc: "Reusable eco / non-woven bag", image: "",
      tags: "bag,eco", featured: true, sort: 3,
      variants: [
        { id: "eb-1", productId: "eco-bag", name: "Eco Bag", attributes: { moq: "100", price: "45" }, image: "", notes: "", sort: 1 },
        { id: "eb-2", productId: "eco-bag", name: "Non-Woven Bag", attributes: { price: "50" }, image: "", notes: "", sort: 2 },
      ],
    },
    {
      id: "photobooth", categoryId: "services", name: "Photobooth Rental",
      desc: "Event photobooth with props and prints", image: "",
      tags: "photobooth,event,service", featured: true, sort: 4,
      variants: [
        { id: "pb-std", productId: "photobooth", name: "Standard Package", attributes: {}, image: "", notes: "Add-ons quoted separately", sort: 1 },
      ],
    },
  ],
  services: [
    {
      id: "photobooth",
      name: "Photobooth Rental",
      desc: "Event photobooth with props, backdrop, and unlimited prints. Packages by hours; add-ons available.",
      image: "",
      gallery: [],
      tags: "photobooth,event,prints,props",
      featured: true,
      sort: 1,
    },
  ],
};
