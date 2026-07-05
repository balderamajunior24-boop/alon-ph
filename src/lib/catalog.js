/* Catalog data layer — runs at BUILD time (server-side) in Astro.
 * Fetches Categories / Products / Variants from Google Sheets and joins them.
 * If SHEET_API_KEY is missing, falls back to sample data so `npm run dev`
 * works out of the box.
 */

const {
  SHEET_ID,
  SHEET_API_KEY,
  TAB_CATEGORIES = "Categories",
  TAB_PRODUCTS = "Products",
  TAB_VARIANTS = "Variants",
  TAB_SERVICES = "Services",
  TAB_HOME = "Home",
} = process.env;

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

export function driveImage(url) {
  if (!url) return "";
  const m = url.match(/\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800`;
  return url;
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
      "[catalog] No SHEET_API_KEY set — using sample data. Add .env to load your sheet."
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
      // Services & Home tabs are optional — missing tab = empty, not an error.
      fetchTab(TAB_SERVICES).catch(optional(TAB_SERVICES)),
      fetchTab(TAB_HOME).catch(optional(TAB_HOME)),
    ]);
    cache = { ...assemble(cats, prods, vars, servs, homeRows), usingSample: false };
    return cache;
  } catch (err) {
    console.error("[catalog] Sheet fetch failed, using sample data:", err.message);
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
  hero_subtitle: "Thoughtful items. Seamless events. Memorable experiences—made easy.",
  hero_cta_primary: "Request Quote",
  hero_cta_secondary: "Browse Catalog",
  featured_title: "Featured Items",
  featured_subtitle: "Popular picks for your next event.",
  photobooth_title: "Photobooth Services",
  photobooth_subtitle: "Capture every smile and moment!",
  photobooth_features:
    "Premium Fun & Props, Fun Props, Unlimited Prints, Digital Copies, Custom Layouts",
  collab_kicker: "LET'S CREATE MORE SUCCESS TOGETHER",
  collab_title: "Open for Collaborations",
  collab_subtitle: "We work with event organizers, schools, companies, and agencies.",
  contact_email: "hello@alonph.com",
  contact_phone: "0977 123 4567",
  contact_location: "Daraga, Albay, Philippines",
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
