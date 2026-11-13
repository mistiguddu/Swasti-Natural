/**
 * Demo data seeder: 20 categories (8 main + 12 subcategories) and 50 products with images,
 * for checking the storefront and admin dashboard UI.
 *
 *   npm run seed:demo          add demo data (skips if it already exists)
 *   npm run seed:demo -- --fresh   remove existing demo data, then add it again
 *   npm run seed:demo:remove   remove demo data only
 *
 * Every demo record is marked (category code / product SKU starting with "DEMO-", tag "demo"),
 * so real categories, products, orders and users are never touched.
 * Texts are plain product facts only (no health or medical claims).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { UPLOAD_ROOT } from '../config/upload.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { slugify } from '../utils/slugify.js';

const DEMO = 'DEMO-';
const args = new Set(process.argv.slice(2));

/* ───────────────────────── Data ───────────────────────── */

// [name, code, colour theme, short description, children]
const CATEGORIES = [
  ['Herbal Oils', 'OILS', 'green', 'Plant-based oils for hair and body.', [
    ['Hair Oils', 'HAIROIL', 'green', 'Oils for hair and scalp care.'],
    ['Massage Oils', 'MASSAGE', 'amber', 'Oils for body massage.'],
  ]],
  ['Hair Care', 'HAIR', 'teal', 'Shampoos and powders made with herbs.', [
    ['Herbal Shampoos', 'SHAMPOO', 'teal', 'Mild shampoos with herbal extracts.'],
    ['Hair Powders', 'HAIRPOWDER', 'brown', 'Henna and herbal hair powders.'],
  ]],
  ['Skin Care', 'SKIN', 'rose', 'Soaps, face care and balms.', [
    ['Face Care', 'FACE', 'rose', 'Face packs, scrubs and toners.'],
    ['Natural Soaps', 'SOAP', 'lime', 'Handmade bar soaps.'],
    ['Lip & Body Balms', 'BALM', 'amber', 'Balms made with natural butters and waxes.'],
  ]],
  ['Herbal Teas', 'TEA', 'lime', 'Green teas and herbal infusions.', [
    ['Green Teas', 'GREENTEA', 'lime', 'Green tea leaves and blends.'],
    ['Herbal Infusions', 'INFUSION', 'rose', 'Caffeine-free herbal blends.'],
  ]],
  ['Honey & Sweeteners', 'HONEY', 'amber', 'Honey, gur and molasses.', [
    ['Raw Honey', 'RAWHONEY', 'amber', 'Honey from different flower sources.'],
    ['Gur & Molasses', 'GUR', 'brown', 'Traditional date and sugarcane gur.'],
  ]],
  ['Spices & Masala', 'SPICE', 'red', 'Whole and ground spices.', [
    ['Ground Spices', 'GROUND', 'red', 'Freshly ground spice powders.'],
  ]],
  ['Seeds & Nuts', 'SEEDS', 'brown', 'Seeds, nuts and dry fruits.', []],
  ['Ghee & Cooking Oils', 'GHEE', 'gold', 'Ghee and cold-pressed cooking oils.', []],
];

// [name, category code, shape, regular price, sale price, size, ingredients, how to use, flags, stock]
// flags: F = featured, N = new arrival, B = best selling, D = draft, I = inactive
const PRODUCTS = [
  ['Coconut Hair Oil', 'HAIROIL', 'bottle', 380, 320, '200 ml', 'Cold-pressed coconut oil.', 'Massage a small amount into the scalp and hair. Wash off after an hour or leave overnight.', 'FB', 120],
  ['Amla Hair Oil', 'HAIROIL', 'bottle', 450, 0, '200 ml', 'Coconut oil, amla (Indian gooseberry) extract.', 'Apply to the scalp and hair, leave for at least an hour, then wash.', 'B', 85],
  ['Neem & Tulsi Hair Oil', 'HAIROIL', 'bottle', 520, 460, '150 ml', 'Sesame oil, neem leaf extract, tulsi leaf extract.', 'Warm slightly and massage into the scalp. Wash off with a mild shampoo.', 'N', 40],
  ['Onion Seed Hair Oil', 'HAIROIL', 'bottle', 590, 0, '100 ml', 'Coconut oil, black seed (kalonji) oil, onion extract.', 'Apply to the scalp twice a week and wash off after two hours.', '', 4],
  ['Bhringraj Hair Oil', 'HAIROIL', 'bottle', 650, 560, '100 ml', 'Sesame oil, bhringraj leaf extract.', 'Massage into the scalp before bed and wash in the morning.', 'F', 60],
  ['Almond Massage Oil', 'MASSAGE', 'bottle', 720, 0, '200 ml', 'Sweet almond oil.', 'Warm a little oil in your palms and massage gently onto the skin.', '', 55],
  ['Mustard Massage Oil', 'MASSAGE', 'bottle', 280, 240, '250 ml', 'Cold-pressed mustard oil.', 'Massage onto the body before bathing.', 'B', 140],
  ['Sesame Body Oil', 'MASSAGE', 'bottle', 480, 0, '200 ml', 'Cold-pressed sesame oil.', 'Apply on damp skin after a bath.', 'N', 0],
  ['Reetha Shikakai Shampoo', 'SHAMPOO', 'tube', 420, 380, '200 ml', 'Reetha (soapnut) extract, shikakai extract, mild cleansing base.', 'Apply to wet hair, lather gently and rinse well.', 'F', 70],
  ['Aloe Vera Shampoo', 'SHAMPOO', 'tube', 390, 0, '200 ml', 'Aloe vera juice, mild cleansing base.', 'Massage into wet hair and rinse. Follow with conditioner if needed.', '', 45],
  ['Hibiscus Shampoo', 'SHAMPOO', 'tube', 450, 0, '250 ml', 'Hibiscus flower extract, mild cleansing base.', 'Apply to wet hair, lather and rinse.', 'N', 3],
  ['Henna Powder', 'HAIRPOWDER', 'pouch', 250, 220, '200 g', '100% henna leaf powder.', 'Mix with water to a smooth paste, rest for a few hours, apply to hair and wash off after 1–2 hours.', 'B', 160],
  ['Amla Powder', 'HAIRPOWDER', 'pouch', 220, 0, '150 g', 'Dried amla powder.', 'Mix with water or yoghurt and apply as a hair pack. Rinse after 30 minutes.', '', 90],
  ['Shikakai Powder', 'HAIRPOWDER', 'pouch', 230, 0, '150 g', 'Dried shikakai pod powder.', 'Mix with warm water to a paste and use as a hair wash.', '', 0],
  ['Multani Mitti Face Pack', 'FACE', 'jar', 260, 210, '100 g', 'Multani mitti (fuller’s earth).', 'Mix with rose water, apply to the face and wash off once dry.', 'FB', 110],
  ['Rose Water Toner', 'FACE', 'bottle', 320, 0, '120 ml', 'Steam-distilled rose water.', 'Spray onto the face or apply with cotton after cleansing.', 'N', 75],
  ['Turmeric Face Scrub', 'FACE', 'jar', 380, 340, '100 g', 'Gram flour, turmeric, rice powder.', 'Mix with water, massage gently onto damp skin and rinse.', '', 5],
  ['Sandalwood Face Pack', 'FACE', 'jar', 490, 0, '80 g', 'Sandalwood powder, kaolin clay.', 'Mix with rose water, apply for 10 minutes and rinse.', 'D', 30],
  ['Neem Soap', 'SOAP', 'box', 120, 99, '100 g', 'Saponified coconut and palm oil, neem leaf powder.', 'Lather with water and rinse. Keep dry between uses.', 'B', 200],
  ['Charcoal Soap', 'SOAP', 'box', 150, 0, '100 g', 'Saponified oils, activated charcoal.', 'Lather with water on the face or body and rinse.', 'N', 95],
  ['Goat Milk Soap', 'SOAP', 'box', 180, 160, '100 g', 'Saponified oils, goat milk.', 'Lather with water and rinse.', 'F', 65],
  ['Lavender Soap', 'SOAP', 'box', 170, 0, '100 g', 'Saponified oils, lavender essential oil.', 'Lather with water and rinse.', '', 2],
  ['Beeswax Lip Balm', 'BALM', 'jar', 150, 0, '10 g', 'Beeswax, coconut oil, shea butter.', 'Apply to lips as needed.', 'N', 130],
  ['Shea Body Butter', 'BALM', 'jar', 550, 490, '100 g', 'Shea butter, cocoa butter, coconut oil.', 'Massage onto dry skin after a bath.', '', 40],
  ['Kokum Foot Balm', 'BALM', 'jar', 320, 0, '50 g', 'Kokum butter, beeswax, sesame oil.', 'Rub onto the feet before bed.', 'I', 25],
  ['Sylhet Green Tea', 'GREENTEA', 'box', 350, 300, '100 g', 'Green tea leaves from Sylhet.', 'Steep 1 teaspoon in hot (not boiling) water for 2–3 minutes.', 'FB', 150],
  ['Jasmine Green Tea', 'GREENTEA', 'box', 420, 0, '100 g', 'Green tea leaves, jasmine flowers.', 'Steep 1 teaspoon in hot water for 2–3 minutes.', 'N', 80],
  ['Lemon Ginger Green Tea', 'GREENTEA', 'box', 390, 350, '25 tea bags', 'Green tea, dried ginger, lemon peel.', 'Steep one tea bag in hot water for 3 minutes.', '', 60],
  ['Tulsi Tea', 'INFUSION', 'box', 300, 0, '25 tea bags', 'Dried tulsi (holy basil) leaves.', 'Steep one tea bag in boiling water for 4–5 minutes.', 'B', 90],
  ['Chamomile Tea', 'INFUSION', 'box', 480, 420, '20 tea bags', 'Dried chamomile flowers.', 'Steep one tea bag in boiling water for 5 minutes.', 'F', 35],
  ['Hibiscus Tea', 'INFUSION', 'pouch', 360, 0, '75 g', 'Dried hibiscus petals.', 'Steep 1 teaspoon in boiling water for 5 minutes. Serve hot or cold.', 'N', 0],
  ['Sundarban Mustard Flower Honey', 'RAWHONEY', 'jar', 650, 590, '500 g', '100% honey from mustard flowers.', 'Use as a spread or sweetener. Honey may crystallise; warm gently to liquefy.', 'FB', 75],
  ['Litchi Flower Honey', 'RAWHONEY', 'jar', 700, 0, '500 g', '100% honey from litchi flowers.', 'Use as a spread or sweetener.', '', 50],
  ['Black Seed Honey', 'RAWHONEY', 'jar', 850, 780, '500 g', 'Honey from black seed (kalonji) flowers.', 'Use as a spread or sweetener.', 'N', 4],
  ['Sundarban Wild Honey', 'RAWHONEY', 'jar', 1200, 0, '500 g', 'Wild honey collected in the Sundarbans.', 'Use as a spread or sweetener.', 'B', 25],
  ['Date Palm Gur (Patali)', 'GUR', 'box', 480, 430, '500 g', 'Date palm sap, boiled and set.', 'Use in pitha, payesh, tea or as a sweet.', 'F', 60],
  ['Liquid Date Gur (Jhola)', 'GUR', 'jar', 420, 0, '500 g', 'Date palm sap, boiled to syrup.', 'Pour over pitha or use as a sweetener.', 'N', 30],
  ['Sugarcane Molasses', 'GUR', 'jar', 260, 0, '500 g', 'Sugarcane juice, boiled and reduced.', 'Use as a sweetener in cooking and baking.', '', 70],
  ['Turmeric Powder', 'GROUND', 'pouch', 180, 160, '200 g', '100% ground turmeric.', 'Use in curries, rice and marinades.', 'B', 180],
  ['Red Chilli Powder', 'GROUND', 'pouch', 200, 0, '200 g', '100% ground dried red chillies.', 'Use in curries and marinades to taste.', '', 150],
  ['Cumin Powder', 'GROUND', 'pouch', 260, 0, '100 g', '100% ground cumin seeds.', 'Add to curries, lentils and chutneys.', 'N', 90],
  ['Garam Masala', 'GROUND', 'pouch', 290, 250, '100 g', 'Cinnamon, cardamom, clove, black pepper, bay leaf.', 'Add a pinch towards the end of cooking.', '', 3],
  ['Whole Black Pepper', 'SPICE', 'pouch', 380, 0, '100 g', 'Whole black peppercorns.', 'Grind fresh over food or add whole to curries.', '', 60],
  ['Green Cardamom', 'SPICE', 'pouch', 650, 590, '50 g', 'Whole green cardamom pods.', 'Add whole to rice, tea and desserts.', 'F', 45],
  ['Chia Seeds', 'SEEDS', 'pouch', 450, 0, '250 g', '100% chia seeds.', 'Soak in water or milk for 15 minutes, or sprinkle on yoghurt and salads.', 'N', 100],
  ['Flax Seeds', 'SEEDS', 'pouch', 280, 240, '250 g', '100% flax seeds.', 'Grind and add to porridge, smoothies or baking.', '', 85],
  ['Mixed Dry Fruits', 'SEEDS', 'jar', 950, 860, '400 g', 'Almonds, cashews, raisins, walnuts.', 'Eat as a snack or add to desserts.', 'FB', 40],
  ['Cow Ghee', 'GHEE', 'jar', 1100, 990, '500 g', 'Clarified butter from cow milk.', 'Use for cooking, frying or with rice.', 'FB', 55],
  ['Cold-Pressed Mustard Oil', 'GHEE', 'bottle', 340, 0, '1 litre', 'Cold-pressed mustard oil.', 'Use for cooking, frying and bhorta.', 'B', 120],
  ['Cold-Pressed Coconut Oil', 'GHEE', 'bottle', 780, 690, '500 ml', 'Cold-pressed coconut oil.', 'Use for cooking or baking.', 'N', 0],
];

/* ───────────────────────── Images (generated PNGs) ───────────────────────── */

const THEMES = {
  green: { bg: [233, 245, 236], bg2: [205, 232, 214], body: [22, 101, 52], cap: [20, 60, 35], label: [250, 248, 240] },
  teal: { bg: [229, 246, 243], bg2: [196, 232, 226], body: [15, 118, 110], cap: [17, 70, 66], label: [250, 250, 245] },
  amber: { bg: [253, 246, 228], bg2: [250, 230, 186], body: [180, 110, 20], cap: [120, 70, 15], label: [255, 252, 240] },
  rose: { bg: [252, 238, 240], bg2: [246, 214, 220], body: [190, 70, 100], cap: [120, 40, 60], label: [255, 250, 250] },
  lime: { bg: [241, 248, 228], bg2: [222, 238, 196], body: [77, 124, 15], cap: [50, 80, 15], label: [252, 252, 242] },
  brown: { bg: [246, 239, 230], bg2: [232, 216, 196], body: [120, 75, 40], cap: [70, 45, 25], label: [252, 248, 240] },
  red: { bg: [252, 236, 230], bg2: [245, 208, 196], body: [185, 60, 35], cap: [110, 35, 20], label: [255, 250, 245] },
  gold: { bg: [253, 249, 232], bg2: [246, 234, 190], body: [190, 140, 30], cap: [110, 80, 20], label: [255, 252, 240] },
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// Signed distance to a rounded rectangle centred at (cx, cy).
function roundRect(px, py, cx, cy, w, h, r) {
  const qx = Math.abs(px - cx) - w / 2 + r;
  const qy = Math.abs(py - cy) - h / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
const cover = (d) => clamp01(0.5 - d); // anti-aliased coverage

/** Shapes in a 0–1000 coordinate space: list of [sdf(x, y), colourKey]. */
function productShapes(shape) {
  const s = [];
  if (shape === 'bottle') {
    s.push([(x, y) => roundRect(x, y, 500, 600, 260, 460, 60), 'body']);
    s.push([(x, y) => roundRect(x, y, 500, 345, 110, 90, 16), 'body']);
    s.push([(x, y) => roundRect(x, y, 500, 285, 140, 70, 18), 'cap']);
    s.push([(x, y) => roundRect(x, y, 500, 620, 210, 170, 18), 'label']);
  } else if (shape === 'jar') {
    s.push([(x, y) => roundRect(x, y, 500, 620, 360, 380, 70), 'body']);
    s.push([(x, y) => roundRect(x, y, 500, 415, 380, 90, 22), 'cap']);
    s.push([(x, y) => roundRect(x, y, 500, 640, 280, 150, 18), 'label']);
  } else if (shape === 'tube') {
    s.push([(x, y) => roundRect(x, y, 500, 540, 220, 500, 70), 'body']);
    s.push([(x, y) => roundRect(x, y, 500, 805, 170, 70, 14), 'cap']);
    s.push([(x, y) => roundRect(x, y, 500, 500, 170, 190, 16), 'label']);
  } else if (shape === 'pouch') {
    s.push([(x, y) => roundRect(x, y, 500, 580, 380, 480, 40), 'body']);
    s.push([(x, y) => roundRect(x, y, 500, 365, 380, 50, 12), 'cap']);
    s.push([(x, y) => roundRect(x, y, 500, 600, 280, 180, 20), 'label']);
  } else {
    s.push([(x, y) => roundRect(x, y, 500, 590, 420, 400, 26), 'body']);
    s.push([(x, y) => roundRect(x, y, 500, 420, 420, 64, 14), 'cap']);
    s.push([(x, y) => roundRect(x, y, 500, 620, 300, 170, 16), 'label']);
  }
  return s;
}

function render(width, height, theme, shapes, { shadow = true } = {}) {
  const pixels = Buffer.alloc((width * 3 + 1) * height);
  const scale = 1000 / Math.min(width, height);
  const offsetX = (width * scale - 1000) / 2;
  const offsetY = (height * scale - 1000) / 2;
  for (let py = 0; py < height; py += 1) {
    const row = py * (width * 3 + 1);
    pixels[row] = 0; // PNG filter: none
    for (let px = 0; px < width; px += 1) {
      const x = px * scale - offsetX;
      const y = py * scale - offsetY;
      let colour = mix(theme.bg, theme.bg2, clamp01(py / height));
      // Soft halo behind the product
      colour = mix(colour, [255, 255, 255], 0.55 * clamp01(1 - Math.hypot(x - 500, y - 520) / 420));
      if (shadow) {
        const d = Math.hypot((x - 500) / 230, (y - 860) / 34);
        colour = mix(colour, theme.cap, 0.18 * clamp01(1 - d));
      }
      for (const [sdf, key] of shapes) {
        const a = cover(sdf(x, y) / scale);
        if (a > 0) colour = mix(colour, theme[key], a);
      }
      const i = row + 1 + px * 3;
      pixels[i] = colour[0]; pixels[i + 1] = colour[1]; pixels[i + 2] = colour[2];
    }
  }
  return encodePng(width, height, pixels);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function encodePng(width, height, raw) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Category artwork: three small products of different shapes. */
function categoryShapes(index) {
  const order = ['bottle', 'jar', 'pouch', 'box', 'tube'];
  const shapes = [];
  [[-260, 0.62], [0, 0.78], [260, 0.62]].forEach(([dx, size], n) => {
    for (const [sdf, key] of productShapes(order[(index + n) % order.length])) {
      shapes.push([(x, y) => sdf(500 + (x - 500 - dx) / size, 560 + (y - 560) / size) * size, key]);
    }
  });
  return shapes;
}

async function saveImage(folder, name, png) {
  const dir = path.join(UPLOAD_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), png);
  return `/uploads/${folder}/${name}`;
}

/* ───────────────────────── Seeder ───────────────────────── */

async function removeDemo() {
  const demoCategories = await Category.find({ code: /^DEMO-/ }).select('_id name image thumbnail').lean();
  const demoProducts = await Product.find({ sku: /^DEMO-/ }).select('_id image thumbnail gallery').lean();
  const ids = demoCategories.map((category) => category._id);
  // Keep a demo category if a real (non-demo) product was added to it later.
  const inUse = new Set((await Product.find({ sku: { $not: /^DEMO-/ }, $or: [{ category: { $in: ids } }, { subcategory: { $in: ids } }] })
    .select('category subcategory').lean()).flatMap((p) => [String(p.category), String(p.subcategory)]));
  const removable = demoCategories.filter((category) => !inUse.has(String(category._id)));

  await Product.deleteMany({ _id: { $in: demoProducts.map((p) => p._id) } });
  await Category.deleteMany({ _id: { $in: removable.map((c) => c._id) } });

  const files = [...demoProducts.flatMap((p) => [p.image, p.thumbnail, ...(p.gallery ?? [])]), ...removable.flatMap((c) => [c.image, c.thumbnail])]
    .filter((file) => typeof file === 'string' && /^\/uploads\/(products|categories)\/demo-[a-z0-9-]+\.png$/.test(file));
  await Promise.all([...new Set(files)].map((file) => fs.rm(path.join(UPLOAD_ROOT, file.replace('/uploads/', '')), { force: true })));

  console.log(`Removed ${demoProducts.length} demo products and ${removable.length} demo categories.`);
  if (removable.length < demoCategories.length) {
    console.log(`Kept ${demoCategories.length - removable.length} demo categories because your own products use them.`);
  }
}

async function seed() {
  const existing = await Category.countDocuments({ code: /^DEMO-/ }) + await Product.countDocuments({ sku: /^DEMO-/ });
  if (existing) {
    console.log('Demo data already exists. Run "npm run seed:demo -- --fresh" to recreate it, or "npm run seed:demo:remove" to delete it.');
    return;
  }

  // Slugs/codes must not collide with the store's own categories and products.
  const takenCategorySlugs = new Set((await Category.find().select('slug').lean()).map((c) => c.slug));
  const takenProductSlugs = new Set((await Product.find().select('slug').lean()).map((p) => p.slug));
  const freeSlug = (taken, name) => {
    const base = slugify(name);
    let slug = base;
    for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
    taken.add(slug);
    return slug;
  };

  const byCode = new Map();
  let order = 0;
  for (const [index, [name, code, theme, shortDescription, children]] of CATEGORIES.entries()) {
    const slug = freeSlug(takenCategorySlugs, name);
    const image = await saveImage('categories', `demo-${slug}.png`, render(800, 600, THEMES[theme], categoryShapes(index), { shadow: false }));
    const parent = await Category.create({
      name, slug, code: `${DEMO}${code}`, shortDescription, description: shortDescription,
      image, thumbnail: image, displayOrder: order += 1, isFeatured: index < 6, status: 'active',
    });
    byCode.set(code, { category: parent, theme });
    for (const [childIndex, [childName, childCode, childTheme, childDescription]] of children.entries()) {
      const childSlug = freeSlug(takenCategorySlugs, childName);
      const childImage = await saveImage('categories', `demo-${childSlug}.png`, render(800, 600, THEMES[childTheme], categoryShapes(index + childIndex + 1), { shadow: false }));
      const child = await Category.create({
        name: childName, slug: childSlug, code: `${DEMO}${childCode}`, shortDescription: childDescription, description: childDescription,
        image: childImage, thumbnail: childImage, parent: parent._id, displayOrder: order += 1, status: 'active',
      });
      byCode.set(childCode, { category: child, parent, theme: childTheme });
    }
  }

  const now = Date.now();
  for (const [index, [name, categoryCode, shape, regularPrice, salePrice, size, ingredients, howToUse, flags, stock]] of PRODUCTS.entries()) {
    const target = byCode.get(categoryCode);
    const slug = freeSlug(takenProductSlugs, `${name} ${size}`);
    const sku = `${DEMO}${String(index + 1).padStart(3, '0')}`;
    const image = await saveImage('products', `demo-${slug}.png`, render(800, 800, THEMES[target.theme], productShapes(shape)));
    const product = await Product.create({
      name: `${name} ${size}`,
      slug,
      sku,
      brand: 'Swasti Natural',
      category: (target.parent ?? target.category)._id,
      subcategory: target.parent ? target.category._id : null,
      shortDescription: `${name}, ${size}.`,
      description: `${name} in a ${size} pack.\n\nIngredients: ${ingredients}\n\nThis is demo product information for testing the store.`,
      ingredients,
      howToUse,
      regularPrice,
      salePrice,
      costPrice: Math.round((salePrice || regularPrice) * 0.6),
      stockQuantity: stock,
      lowStockThreshold: 5,
      image,
      thumbnail: image,
      sizes: [size],
      tags: ['demo', ...slugify(name).split('-').filter((word) => word.length > 3)],
      isFeatured: flags.includes('F'),
      isNewArrival: flags.includes('N'),
      isBestSelling: flags.includes('B'),
      status: flags.includes('D') ? 'draft' : flags.includes('I') ? 'inactive' : 'active',
      soldCount: flags.includes('B') ? 40 + ((index * 37) % 160) : (index * 13) % 30,
    });
    // Spread creation dates over the last 60 days (new arrivals newest), so sorting and charts vary.
    const daysAgo = flags.includes('N') ? index % 10 : 10 + ((index * 7) % 50);
    await Product.collection.updateOne({ _id: product._id }, { $set: { createdAt: new Date(now - daysAgo * 86_400_000) } });
  }

  const counts = {
    categories: await Category.countDocuments({ code: /^DEMO-/ }),
    products: await Product.countDocuments({ sku: /^DEMO-/ }),
  };
  console.log(`Added ${counts.categories} demo categories and ${counts.products} demo products (with images).`);
}

try {
  await connectDatabase(env.mongodbUri, env.mongodbDatabase);
  if (args.has('--remove')) await removeDemo();
  else {
    if (args.has('--fresh')) await removeDemo();
    await seed();
  }
} catch (error) {
  console.error('Demo seeder failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
