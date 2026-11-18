/**
 * Privacy Policy — a server-rendered page (outside the client-only storefront shell) so the full
 * text is in the HTML. Crawlers that don't run JavaScript (Facebook/Meta app review, Google Play
 * review, search engines) see the complete policy. Store name, contact details, logo and theme
 * come from the API; if the API is unreachable, sensible defaults are used.
 *
 * Useful links for store/app listings:
 *   Privacy policy URL ............ /privacy-policy
 *   Account / data deletion URL ... /privacy-policy#delete-account
 */

const API = (process.env.API_PROXY_TARGET || 'http://127.0.0.1:4000').replace(/\/$/, '');
const LAST_UPDATED = '18 November 2026';

export const revalidate = 600; // refresh store details every 10 minutes

async function load(path) {
  try {
    const response = await fetch(`${API}/api/v1${path}`, { next: { revalidate }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    return (await response.json())?.data ?? null;
  } catch {
    return null;
  }
}

async function storeDetails() {
  const [info, branding] = await Promise.all([load('/store/info'), load('/settings/public')]);
  return {
    name: branding?.storeName || info?.storeName || 'Swasti Natural',
    logo: branding?.logoMark || '/logo-mark.png',
    theme: branding?.storeTheme || 'forest',
    email: info?.contact?.email || '',
    phone: info?.contact?.phone || '',
    address: info?.contact?.address || '',
    website: info?.contact?.website || '',
  };
}

export async function generateMetadata() {
  const { name } = await storeDetails();
  return {
    title: `Privacy Policy | ${name}`,
    description: `How ${name} collects, uses, shares and protects your personal information, and how to delete your account and data.`,
    alternates: { canonical: '/privacy-policy' },
    robots: { index: true, follow: true },
  };
}

const SECTIONS = [
  ['summary', 'Summary'],
  ['who-we-are', 'Who we are'],
  ['information-we-collect', 'Information we collect'],
  ['how-we-use', 'How we use your information'],
  ['legal-bases', 'Legal bases'],
  ['sharing', 'How we share information'],
  ['cookies', 'Cookies and local storage'],
  ['retention', 'How long we keep data'],
  ['security', 'How we protect your data'],
  ['your-rights', 'Your rights and choices'],
  ['delete-account', 'Delete your account and data'],
  ['children', 'Children’s privacy'],
  ['international', 'International transfers'],
  ['third-party', 'Third-party links'],
  ['changes', 'Changes to this policy'],
  ['contact', 'Contact us'],
];

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-stone-200/80 pt-8 first:border-0 first:pt-0">
      <h2 className="font-serif text-2xl font-semibold text-emerald-950">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-stone-700 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-stone-900 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">{children}</div>
    </section>
  );
}

function Table({ rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-stone-200">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-stone-50 text-xs font-semibold tracking-wide text-stone-500 uppercase">
          <tr><th className="px-4 py-3">Information</th><th className="px-4 py-3">Examples</th><th className="px-4 py-3">Why we need it</th></tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map(([what, examples, why]) => (
            <tr key={what} className="align-top"><td className="px-4 py-3 font-semibold text-stone-900">{what}</td><td className="px-4 py-3 text-stone-700">{examples}</td><td className="px-4 py-3 text-stone-700">{why}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PrivacyPolicyPage() {
  const store = await storeDetails();
  const contactLine = [store.email && `email ${store.email}`, store.phone && `call ${store.phone}`].filter(Boolean).join(' or ');
  const reach = contactLine ? `${contactLine}, or use our contact form` : 'use our contact form';

  return (
    <div data-store-theme={store.theme} className="min-h-screen bg-stone-50 font-body text-stone-800 selection:bg-emerald-200">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <a href="/" className="flex min-w-0 items-center gap-2.5" aria-label={`${store.name} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={store.logo} alt="" className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-emerald-900/10" />
            <span className="truncate font-serif text-lg font-semibold text-emerald-950">{store.name}</span>
          </a>
          <a href="/" className="ml-auto inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-900/15 transition hover:bg-emerald-50">← Back to shop</a>
        </div>
      </header>

      {/* Title */}
      <div className="border-b border-emerald-900/5 bg-gradient-to-br from-emerald-50 via-white to-amber-50/40">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-xs font-bold tracking-widest text-emerald-700 uppercase">Legal</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-emerald-950 sm:text-5xl">Privacy Policy</h1>
          <p className="mt-3 max-w-2xl text-stone-600">How {store.name} collects, uses, shares and protects your personal information when you use our website and mobile app.</p>
          <p className="mt-4 inline-flex rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-600 ring-1 ring-stone-200">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:py-14">
        {/* Contents */}
        <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
          <details className="group rounded-2xl bg-white ring-1 ring-stone-200" open>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-emerald-950 lg:cursor-default">
              On this page <span className="text-stone-400 transition group-open:rotate-180 lg:hidden">▾</span>
            </summary>
            <ol className="space-y-0.5 px-2 pb-3 text-sm">
              {SECTIONS.map(([id, label], index) => (
                <li key={id}><a href={`#${id}`} className="flex gap-2 rounded-lg px-2 py-1.5 text-stone-600 transition hover:bg-emerald-50 hover:text-emerald-900"><span className="w-5 shrink-0 text-right text-stone-400 tabular-nums">{index ? `${index}.` : '•'}</span>{label}</a></li>
              ))}
            </ol>
          </details>
        </nav>

        <article className="min-w-0 space-y-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200/70 sm:p-10">
          <Section id="summary" title="Summary">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['We never sell your data', 'Your personal information is not sold or rented to anyone.'],
                ['Only what we need', 'We collect what is needed to deliver your orders and run your account.'],
                ['No card details', 'We offer cash on delivery, so we never collect or store bank or card details.'],
                ['You are in control', 'You can view, correct or delete your data, or delete your account at any time.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl bg-emerald-50/70 p-4 ring-1 ring-emerald-900/5">
                  <p className="font-semibold text-emerald-950">✓ {title}</p>
                  <p className="mt-1 text-sm text-stone-600">{text}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="who-we-are" title="1. Who we are">
            <p>This Privacy Policy explains how <strong>{store.name}</strong> (“{store.name}”, “we”, “us” or “our”) handles personal information when you visit our website, use our mobile app, create an account, place an order, write a review or contact us (together, the “Services”).</p>
            <p>{store.name} is responsible for (the “controller” of) the personal information described in this policy.{store.address && <> Our address is <strong>{store.address}</strong>.</>} By using the Services you acknowledge this policy. If you do not agree, please do not use the Services.</p>
          </Section>

          <Section id="information-we-collect" title="2. Information we collect">
            <p><strong>Information you give us</strong></p>
            <Table rows={[
              ['Account details', 'Name, email address, phone number, password (stored only as a secure, one-way hash)', 'To create and secure your account and let you sign in'],
              ['Delivery details', 'Recipient name, phone number, delivery address (division, district, area, street), delivery instructions', 'To deliver your orders and contact you about delivery'],
              ['Orders', 'Products, quantities, prices, coupon codes, order status and history', 'To process, deliver and support your orders, returns and refunds'],
              ['Reviews', 'Star rating, review text, optional photos, your first name and last initial', 'To show product reviews to other shoppers'],
              ['Messages', 'Live chat messages, contact form messages and any details you include', 'To answer your questions and provide customer support'],
              ['Newsletter', 'Email address', 'To send offers and news, only if you subscribe'],
              ['Wishlist', 'Products you save', 'To remember products you like'],
            ]} />
            <p><strong>Information collected automatically</strong></p>
            <ul>
              <li><strong>Device and log data:</strong> IP address, browser or app version, device type, operating system, pages visited and the date and time of requests. We use this to keep the Services secure (for example, to limit repeated sign-in attempts) and to fix problems.</li>
              <li><strong>Data stored on your device:</strong> your cart, chosen theme and language, and a sign-in token, kept in your browser’s local storage (see <a href="#cookies" className="font-semibold text-emerald-800 underline">Cookies and local storage</a>).</li>
            </ul>
            <p><strong>Payment information:</strong> we currently accept cash on delivery only. We do not collect, process or store debit card, credit card, bank or mobile-wallet details.</p>
            <p><strong>Location:</strong> we do not collect your precise (GPS) location. We only use the address you type in for delivery.</p>
          </Section>

          <Section id="how-we-use" title="3. How we use your information">
            <ul>
              <li>Create and manage your account, and keep it secure.</li>
              <li>Process, confirm, pack, deliver and track your orders, and handle returns, refunds and complaints.</li>
              <li>Contact you about your orders and account by phone, SMS or email (service messages).</li>
              <li>Reply to chat and contact messages and provide customer support.</li>
              <li>Publish the product reviews you choose to write.</li>
              <li>Send newsletters and offers, only if you subscribed. You can unsubscribe at any time.</li>
              <li>Prevent fraud, abuse and spam, and protect our customers, staff and systems.</li>
              <li>Improve our products, website and app, and fix errors.</li>
              <li>Meet legal, tax and accounting obligations.</li>
            </ul>
            <p>We do not use your personal information for automated decisions that have legal or similarly significant effects on you, and we do not show third-party advertising based on your data.</p>
          </Section>

          <Section id="legal-bases" title="4. Legal bases">
            <p>Where the law requires a legal basis, we rely on: <strong>performance of a contract</strong> (to provide your account and orders); <strong>legitimate interests</strong> (to keep the Services secure, prevent fraud and improve them); <strong>consent</strong> (for newsletters and optional review photos, which you can withdraw at any time); and <strong>legal obligation</strong> (for tax, accounting and lawful requests).</p>
          </Section>

          <Section id="sharing" title="5. How we share information">
            <p>We share personal information only when needed, and only with:</p>
            <ul>
              <li><strong>Delivery and courier partners:</strong> recipient name, phone number, delivery address and order contents, so they can deliver your order.</li>
              <li><strong>Service providers</strong> who operate the Services for us, such as hosting, database, email delivery and customer-support tools. They may use the data only to provide their service to us and must protect it.</li>
              <li><strong>Authorities</strong> when required by law, court order or to protect rights, safety and property.</li>
              <li><strong>A buyer or successor</strong> if our business is merged, sold or restructured, under this policy.</li>
            </ul>
            <p>Your published reviews (first name, last initial, rating, text and photos) are visible to everyone who visits the product page. We <strong>do not sell</strong> or rent your personal information, and we do not share it with third parties for their own marketing.</p>
          </Section>

          <Section id="cookies" title="6. Cookies and local storage">
            <p>We use your browser’s local storage and similar technologies that are <strong>necessary</strong> for the Services to work: keeping you signed in, remembering your cart and wishlist, and remembering your theme and language choices. We do not use advertising or cross-site tracking cookies.</p>
            <p>Our pages load fonts from Google Fonts, which receives your IP address to deliver the font files. You can clear local storage at any time in your browser settings; you will then be signed out and your cart will be emptied.</p>
          </Section>

          <Section id="retention" title="7. How long we keep data">
            <ul>
              <li><strong>Account data:</strong> for as long as your account is active. When you delete your account, it is deleted within 30 days.</li>
              <li><strong>Orders and invoices:</strong> kept for up to 6 years after the order, as required for tax, accounting and warranty purposes, even if you delete your account.</li>
              <li><strong>Reviews:</strong> until you delete them or your account, or until we remove them under our review rules.</li>
              <li><strong>Chat and contact messages:</strong> up to 2 years, to help with follow-up questions.</li>
              <li><strong>Security logs:</strong> up to 90 days.</li>
              <li><strong>Newsletter:</strong> until you unsubscribe.</li>
            </ul>
          </Section>

          <Section id="security" title="8. How we protect your data">
            <p>We use administrative, technical and physical safeguards, including encrypted connections (HTTPS) in production, passwords stored only as strong one-way hashes, role-based staff access with the least privileges needed, and limits on repeated sign-in attempts. No method of transmission or storage is 100% secure, but we work hard to protect your information and will notify you and the authorities of a breach where the law requires.</p>
          </Section>

          <Section id="your-rights" title="9. Your rights and choices">
            <p>Depending on where you live, you may have the right to:</p>
            <ul>
              <li><strong>Access</strong> the personal information we hold about you, and get a copy.</li>
              <li><strong>Correct</strong> inaccurate information. You can update your name, phone, addresses and password yourself in <a href="/account" className="font-semibold text-emerald-800 underline">My account</a>.</li>
              <li><strong>Delete</strong> your account and personal information (see below).</li>
              <li><strong>Object to or restrict</strong> some processing, and <strong>withdraw consent</strong>, for example by unsubscribing from the newsletter.</li>
              <li><strong>Data portability:</strong> receive your data in a commonly used format.</li>
              <li><strong>Complain</strong> to your local data protection authority.</li>
            </ul>
            <p>To use any of these rights, {reach}. We will reply within 30 days. We may ask you to confirm your identity first.</p>
          </Section>

          <Section id="delete-account" title="10. Delete your account and data">
            <span id="data-deletion" className="block scroll-mt-24" aria-hidden="true" />
            <p>You can ask us to delete your {store.name} account and the personal information linked to it at any time, whether you use our website or our app.</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li><strong>Send a deletion request</strong> from the email address or phone number on your account: {contactLine ? <>{contactLine}</> : 'use our contact form'}{contactLine && <>, or use our <a href="/contact" className="font-semibold text-emerald-800 underline">contact form</a></>}. Please write “Delete my account” and include the email address or phone number you signed up with.</li>
              <li><strong>We confirm it is you</strong>, usually by replying to that email or calling that phone number, so nobody else can delete your account.</li>
              <li><strong>We delete your data within 30 days</strong> and confirm by email or SMS once it is done.</li>
            </ol>
            <div className="rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
              <p className="text-sm"><strong>What is deleted:</strong> your account and profile (name, email, phone, password), saved addresses, wishlist, reviews and review photos, chat history, and newsletter subscription.</p>
              <p className="mt-2 text-sm"><strong>What we keep, and for how long:</strong> order and invoice records (products, amounts, dates and delivery address) for up to 6 years, because tax and accounting law requires it. These records are no longer linked to an active account and are deleted when the period ends. Security logs are kept for up to 90 days.</p>
            </div>
            <p>If you only want some data removed (for example a review or a saved address), you can delete it yourself in your account, or ask us and we will remove just that data.</p>
          </Section>

          <Section id="children" title="11. Children’s privacy">
            <p>The Services are not directed to children under 13, and we do not knowingly collect personal information from children under 13. To place an order you must be old enough to enter a contract where you live. If you believe a child has given us personal information, please contact us and we will delete it.</p>
          </Section>

          <Section id="international" title="12. International transfers">
            <p>Our service providers may store or process data in countries other than your own. When this happens we take steps so your information receives a similar level of protection, as required by applicable law.</p>
          </Section>

          <Section id="third-party" title="13. Third-party links">
            <p>The Services may link to other websites and apps, such as our social media pages or WhatsApp. Their own privacy policies apply, and we are not responsible for how they handle your information.</p>
          </Section>

          <Section id="changes" title="14. Changes to this policy">
            <p>We may update this policy from time to time. We will change the “Last updated” date above, and if the changes are significant we will tell you on the website, in the app or by email before they take effect.</p>
          </Section>

          <Section id="contact" title="15. Contact us">
            <p>If you have questions about this policy or your personal information, contact us:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-emerald-50/70 p-4 ring-1 ring-emerald-900/5"><p className="text-xs font-bold tracking-wide text-emerald-700 uppercase">Company</p><p className="mt-1 font-semibold text-stone-900">{store.name}</p>{store.address && <p className="mt-0.5 text-sm text-stone-600">{store.address}</p>}</div>
              {store.email && <div className="rounded-2xl bg-emerald-50/70 p-4 ring-1 ring-emerald-900/5"><p className="text-xs font-bold tracking-wide text-emerald-700 uppercase">Email</p><a href={`mailto:${store.email}`} className="mt-1 block font-semibold break-all text-emerald-900 underline">{store.email}</a></div>}
              {store.phone && <div className="rounded-2xl bg-emerald-50/70 p-4 ring-1 ring-emerald-900/5"><p className="text-xs font-bold tracking-wide text-emerald-700 uppercase">Phone</p><a href={`tel:${store.phone}`} className="mt-1 block font-semibold text-emerald-900 underline">{store.phone}</a></div>}
              <div className="rounded-2xl bg-emerald-50/70 p-4 ring-1 ring-emerald-900/5"><p className="text-xs font-bold tracking-wide text-emerald-700 uppercase">Online</p><a href="/contact" className="mt-1 block font-semibold text-emerald-900 underline">Contact form</a></div>
            </div>
          </Section>
        </article>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-stone-500 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            <a href="/" className="hover:text-emerald-800">Shop</a>
            <a href="/about" className="hover:text-emerald-800">About</a>
            <a href="/contact" className="hover:text-emerald-800">Contact</a>
            <a href="/privacy-policy" className="font-semibold text-emerald-800">Privacy policy</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
