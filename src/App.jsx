import React, { useState } from 'react';
import {
  ShoppingCart, Search, Settings, CheckCircle2, TrendingDown, Store,
  ExternalLink, MapPin, AlertCircle, RefreshCw, Clock, Sparkles, WifiOff,
  Info, Truck, ChevronDown, ChevronUp, User, CreditCard,
} from 'lucide-react';

// ─── Env / Config ──────────────────────────────────────────────────────────
const KROGER_BASE     = '/api/kroger';
const CLIENT_ID     = import.meta.env.VITE_KROGER_CLIENT_ID     ?? '';
const CLIENT_SECRET = import.meta.env.VITE_KROGER_CLIENT_SECRET ?? '';
const DEMO_MODE     = !CLIENT_ID;

// ─── Stores ────────────────────────────────────────────────────────────────
// chain: Kroger banner name (null = not a Kroger store)
// geminiSearch: true = prices fetched via Gemini web search
const STORES = [
  { id: 'kroger',        name: 'Kroger',        chain: 'Kroger',        shopUrl: 'https://www.kroger.com',                           doordashUrl: 'https://www.doordash.com/search/store/Kroger',         color: 'bg-blue-600',   text: 'text-blue-600'   },
  { id: 'harris_teeter', name: 'Harris Teeter', chain: 'Harris Teeter', shopUrl: 'https://www.harristeeter.com',                     doordashUrl: 'https://www.doordash.com/search/store/Harris+Teeter',  color: 'bg-green-700',  text: 'text-green-700'  },
  { id: 'king_soopers',  name: 'King Soopers',  chain: 'King Soopers',  shopUrl: 'https://www.kingsoopers.com',                      doordashUrl: 'https://www.doordash.com/search/store/King+Soopers',   color: 'bg-red-700',    text: 'text-red-700'    },
  { id: 'ralphs',        name: 'Ralphs',        chain: 'Ralphs',        shopUrl: 'https://www.ralphs.com',                           doordashUrl: 'https://www.doordash.com/search/store/Ralphs',         color: 'bg-blue-900',   text: 'text-blue-900'   },
  { id: 'fred_meyer',    name: 'Fred Meyer',    chain: 'Fred Meyer',    shopUrl: 'https://www.fredmeyer.com',                        doordashUrl: 'https://www.doordash.com/search/store/Fred+Meyer',     color: 'bg-red-600',    text: 'text-red-600'    },
  { id: 'smiths',        name: "Smith's",       chain: 'Smith',         shopUrl: 'https://www.smithsfoodanddrug.com',                doordashUrl: 'https://www.doordash.com/search/store/Smiths',         color: 'bg-orange-600', text: 'text-orange-600' },
  { id: 'walmart',       name: 'Walmart',       chain: null,            shopUrl: 'https://www.walmart.com/browse/food',              doordashUrl: 'https://www.doordash.com/search/store/Walmart',        color: 'bg-yellow-500', text: 'text-yellow-600', geminiSearch: true },
  { id: 'target',        name: 'Target',        chain: null,            shopUrl: 'https://www.target.com/c/food-beverage/-/N-5xt1a', doordashUrl: 'https://www.doordash.com/search/store/Target',         color: 'bg-red-500',    text: 'text-red-500',   geminiSearch: true },
  { id: 'costco',        name: 'Costco',        chain: null,            shopUrl: 'https://www.costco.com/grocery.html',              doordashUrl: 'https://www.doordash.com/search/store/Costco',         color: 'bg-blue-800',   text: 'text-blue-800',  geminiSearch: true },
];

const DOORDASH_FEE = 3.99;

const GEMINI_SEARCH_STORES = STORES.filter(s => s.geminiSearch);

// Delivery thresholds per store (as of 2025). fee is numeric for cost calculations.
const DELIVERY = {
  kroger:        { threshold: 35, fee: 9.95, freeNote: 'Free on orders $35+, or with Boost membership (~$59/yr)' },
  harris_teeter: { threshold: 35, fee: 9.95, freeNote: 'Free on orders $35+, or with Boost membership' },
  king_soopers:  { threshold: 35, fee: 9.95, freeNote: 'Free on orders $35+, or with Boost membership' },
  ralphs:        { threshold: 35, fee: 9.95, freeNote: 'Free on orders $35+, or with Boost membership' },
  fred_meyer:    { threshold: 35, fee: 9.95, freeNote: 'Free on orders $35+, or with Boost membership' },
  smiths:        { threshold: 35, fee: 9.95, freeNote: 'Free on orders $35+, or with Boost membership' },
  walmart:       { threshold: 35, fee: 7.95, freeNote: 'Free on orders $35+, or with Walmart+ (~$98/yr)' },
  target:        { threshold: 35, fee: 9.99, freeNote: 'Free standard shipping $35+; same-day via Shipt $35+ ($9.99/order without membership)' },
  costco:        { threshold: 75, fee: 9.99, freeNote: 'Free delivery on orders $75+ for members; otherwise via Instacart fees apply (~$9.99)' },
};

const INITIAL_PAST_ORDERS = [
  {
    id: 'ord-1001',
    date: new Date(Date.now() - 86400000 * 3).toLocaleDateString(),
    total: 34.50, option: 'split',
    items: [
      { name: 'Almond Milk', quantity: 1 },
      { name: 'Bananas', quantity: 2 },
      { name: 'Ground Coffee', quantity: 1 },
      { name: 'Paper Towels', quantity: 1 },
    ],
  },
];

// ─── Gemini Prompts ────────────────────────────────────────────────────────
const LIST_SYSTEM_PROMPT = `You are a grocery shopping assistant. When given a meal plan or shopping request, respond ONLY with a valid JSON array — no markdown, no explanation, no code fences. Each element must have: "name" (specific product name suitable for a grocery API search, generic, no brand names) and "quantity" (positive integer). Keep lists to 10 items maximum. Example: [{"name":"ground beef 80/20","quantity":2},{"name":"flour tortillas","quantity":1}]`;

const TRADEOFF_SYSTEM_PROMPT = `You are a grocery budget advisor. Given real-time price comparison data from multiple stores, write exactly 2–3 sentences recommending one option. Be specific about dollar amounts and tradeoffs. Be conversational and direct. Do not use bullet points, headers, or markdown formatting.`;

const PRICE_SEARCH_SYSTEM_PROMPT = `You are a grocery price lookup tool. Use Google Search to find current retail prices for grocery items. For each store return the price (number) and the specific product name you found including size/quantity (e.g. "Great Value Large White Eggs, 12 ct"). Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation. Use {"price": null, "description": null} for any store where a price cannot be found.`;

// ─── Gemini API ────────────────────────────────────────────────────────────
const GEMINI_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

async function callGemini(systemPrompt, userMessage, key, tools) {
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
  };
  if (tools) body.tools = tools;

  const res = await fetch(GEMINI_URL(key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Gemini API error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function generateShoppingList(userPrompt, key) {
  const text = await callGemini(LIST_SYSTEM_PROMPT, userPrompt, key);
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Gemini did not return a valid list. Try rephrasing your request.');
  return JSON.parse(match[0]);
}

async function getAiRecommendation(singleStoreName, singleItems, singleDelivery, splitItems, splitDelivery, itemCount, key) {
  const singleTotal   = singleItems + singleDelivery;
  const splitTotal    = splitItems  + splitDelivery;
  const singleDelNote = singleDelivery > 0 ? ` + $${singleDelivery.toFixed(2)} delivery fee` : ', free delivery';
  const splitDelNote  = splitDelivery  > 0 ? ` + $${splitDelivery.toFixed(2)} total delivery across stores` : ', free delivery on all stores';
  const msg = `Single store: everything from ${singleStoreName} — $${singleItems.toFixed(2)} in items${singleDelNote} = $${singleTotal.toFixed(2)} total (${itemCount} items, 1 order). Split cart: cheapest store per item — $${splitItems.toFixed(2)} in items${splitDelNote} = $${splitTotal.toFixed(2)} total (multiple stores). Delivery fees have been factored in.`;
  return callGemini(TRADEOFF_SYSTEM_PROMPT, msg, key);
}

// Searches Walmart, Target, Costco prices + product descriptions in one Gemini call.
// Returns { storeId: { price, description } }
async function geminiSearchStorePrices(query, qty, key) {
  if (!key) return {};
  try {
    const storeList = GEMINI_SEARCH_STORES.map(s => s.name).join(', ');
    const idList    = GEMINI_SEARCH_STORES.map(s => `"${s.id}": {"price": <number or null>, "description": "<product name and size or null>"}`).join(', ');
    const msg = `Find the current retail price of "${query}" at each of these grocery stores: ${storeList}. Return JSON: {${idList}}`;

    const text = await callGemini(PRICE_SEARCH_SYSTEM_PROMPT, msg, key, [{ google_search: {} }]);

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    const raw = JSON.parse(match[0]);
    const result = {};
    GEMINI_SEARCH_STORES.forEach(store => {
      const entry = raw[store.id];
      const p = entry?.price ?? entry; // handle both {price,description} and bare number
      if (p != null && !isNaN(Number(p))) {
        result[store.id] = {
          price: +(Number(p) * qty).toFixed(2),
          description: entry?.description ?? null,
        };
      }
    });
    return result;
  } catch (e) {
    console.error('Gemini price search error:', e);
    return {};
  }
}

// ─── Kroger API ────────────────────────────────────────────────────────────
let tokenCache = { value: null, expiresAt: 0 };

async function getToken() {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) return tokenCache.value;
  const creds = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const res = await fetch(`${KROGER_BASE}/v1/connect/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=product.compact',
  });
  if (!res.ok) throw new Error(`Kroger auth failed: ${res.status}`);
  const { access_token, expires_in } = await res.json();
  tokenCache = { value: access_token, expiresAt: Date.now() + (expires_in - 60) * 1000 };
  return access_token;
}

const locationCache = {};
async function getLocationId(token, zipCode, chain) {
  const key = `${zipCode}:${chain}`;
  if (key in locationCache) return locationCache[key];
  const url = new URL(`${window.location.origin}${KROGER_BASE}/v1/locations`);
  url.searchParams.set('filter.zipCode', zipCode);
  url.searchParams.set('filter.chain', chain);
  url.searchParams.set('filter.limit', '1');
  const res = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
  const locationId = res.ok ? ((await res.json()).data?.[0]?.locationId ?? null) : null;
  locationCache[key] = locationId;
  return locationId;
}

async function searchProduct(token, query, locationId) {
  const url = new URL(`${window.location.origin}${KROGER_BASE}/v1/products`);
  url.searchParams.set('filter.term', query);
  url.searchParams.set('filter.locationId', locationId);
  url.searchParams.set('filter.limit', '1');
  const res = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) return null;
  const product = (await res.json()).data?.[0];
  if (!product) return null;
  const price = product.items?.[0]?.price?.regular ?? product.items?.[0]?.price?.promo ?? null;
  return price !== null ? { price, description: product.description ?? null } : null;
}

// ─── Price Fetching ────────────────────────────────────────────────────────
async function fetchPrices(items, zipCode, geminiKey) {
  if (DEMO_MODE) {
    const enriched = items.map(item => {
      const prices = {}, qty = item.quantity || 1;
      const base = Math.random() * 10 + 3;
      STORES.forEach(s => { prices[s.id] = +((base * (1 + (Math.random() * 0.4 - 0.2))) * qty).toFixed(2); });
      return { ...item, prices, quantity: qty };
    });
    return buildOptimalCart(enriched);
  }

  const token = await getToken();
  const krogerStores = STORES.filter(s => s.chain);
  const locationIds = {};
  await Promise.all(krogerStores.map(async store => {
    locationIds[store.id] = await getLocationId(token, zipCode, store.chain);
  }));

  const enriched = await Promise.all(items.map(async item => {
    const prices = {}, descriptions = {}, qty = item.quantity || 1;
    await Promise.all([
      // Kroger-family stores via Kroger API
      ...krogerStores.map(async store => {
        const locId = locationIds[store.id];
        if (!locId) return;
        const result = await searchProduct(token, item.name, locId);
        if (result?.price != null) {
          prices[store.id] = +(result.price * qty).toFixed(2);
          if (result.description) descriptions[store.id] = result.description;
        }
      }),
      // Walmart, Target, Costco via Gemini web search (single call)
      (async () => {
        const webData = await geminiSearchStorePrices(item.name, qty, geminiKey);
        Object.entries(webData).forEach(([storeId, data]) => {
          prices[storeId] = data.price;
          if (data.description) descriptions[storeId] = data.description;
        });
      })(),
    ]);
    return { ...item, prices, descriptions, quantity: qty };
  }));
  return buildOptimalCart(enriched);
}

function buildOptimalCart(enriched) {
  let optimalTotal = 0;
  const optimalItems = enriched.map(item => {
    let bestId = null, bestPrice = Infinity;
    STORES.forEach(s => {
      const p = item.prices[s.id];
      if (p !== undefined && p < bestPrice) { bestPrice = p; bestId = s.id; }
    });
    if (bestId) optimalTotal += bestPrice;
    return {
      id: item.id, name: item.name,
      price: bestId ? bestPrice : null,
      quantity: item.quantity,
      unitPrice: bestId ? +(bestPrice / item.quantity).toFixed(2) : null,
      storeId: bestId,
      allPrices: item.prices,
      descriptions: item.descriptions || {},
    };
  });

  // Single-store totals — only stores that have prices for every item
  const singleStoreTotals = {};
  STORES.forEach(s => {
    const hasAllItems = enriched.every(i => i.prices[s.id] != null);
    if (!hasAllItems) return;
    const t = enriched.reduce((sum, i) => sum + i.prices[s.id], 0);
    singleStoreTotals[s.id] = +t.toFixed(2);
  });

  // Effective single-store totals include delivery fee when below threshold
  const effectiveSingleTotals = {};
  Object.entries(singleStoreTotals).forEach(([storeId, items]) => {
    const d = DELIVERY[storeId];
    const delivery = d && items < d.threshold ? d.fee : 0;
    effectiveSingleTotals[storeId] = { items, delivery, total: +(items + delivery).toFixed(2) };
  });

  // Split cart: group items by store, add delivery per store if below its threshold
  const splitByStore = {};
  optimalItems.forEach(item => {
    if (!item.storeId || item.price == null) return;
    splitByStore[item.storeId] = (splitByStore[item.storeId] ?? 0) + item.price;
  });
  const splitDelivery = {};
  let splitItemsTotal = 0, splitDeliveryTotal = 0;
  Object.entries(splitByStore).forEach(([storeId, subtotal]) => {
    const d = DELIVERY[storeId];
    const fee = d && subtotal < d.threshold ? d.fee : 0;
    splitDelivery[storeId] = { subtotal: +subtotal.toFixed(2), fee };
    splitItemsTotal    += subtotal;
    splitDeliveryTotal += fee;
  });
  const effectiveSplitTotal = +(splitItemsTotal + splitDeliveryTotal).toFixed(2);

  const covered = optimalItems.filter(i => i.price !== null).length;
  return {
    singleStoreTotals, effectiveSingleTotals,
    optimalCart: { total: +optimalTotal.toFixed(2), items: optimalItems },
    splitDelivery, splitItemsTotal: +splitItemsTotal.toFixed(2),
    splitDeliveryTotal: +splitDeliveryTotal.toFixed(2), effectiveSplitTotal,
    covered,
  };
}

// ─── App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab]             = useState('shop');
  const [stage, setStage]                     = useState('input');
  const [loadingStep, setLoadingStep]         = useState('');
  const [prompt, setPrompt]                   = useState('');
  const [zipCode, setZipCode]                 = useState('');
  const [shoppingList, setShoppingList]       = useState([]);
  const [results, setResults]                 = useState(null);
  const [aiRec, setAiRec]                     = useState('');
  const [bestSingleStore, setBestSingleStore] = useState(null);
  const [selectedOption, setSelectedOption]   = useState(null);
  const [apiError, setApiError]               = useState('');
  const [pastOrders, setPastOrders]           = useState(INITIAL_PAST_ORDERS);
  const [expandedOrders, setExpandedOrders]   = useState([]);
  const [geminiKey, setGeminiKey]             = useState(() => localStorage.getItem('af_gemini_key') || '');
  const [geminiKeySaved, setGeminiKeySaved]   = useState(false);
  const [showPrompts, setShowPrompts]         = useState(false);
  const [zipCity, setZipCity]                 = useState('');
  const [profile, setProfile]                 = useState(() => {
    try { return JSON.parse(localStorage.getItem('af_profile') || '{}'); } catch { return {}; }
  });
  const [profileSaved, setProfileSaved]       = useState(false);

  const saveGeminiKey = () => {
    localStorage.setItem('af_gemini_key', geminiKey);
    setGeminiKeySaved(true);
    setTimeout(() => setGeminiKeySaved(false), 2000);
  };

  const handleSearch = async () => {
    if (!prompt.trim() || zipCode.length !== 5) return;
    if (!geminiKey && !DEMO_MODE) {
      setApiError('Add your Gemini API key in Settings first.');
      return;
    }
    setStage('loading');
    setApiError('');
    setSelectedOption(null);

    try {
      let list;
      if (!geminiKey || DEMO_MODE) {
        list = prompt.split(',').map(s => ({ name: s.trim(), quantity: 1 })).filter(i => i.name);
      } else {
        setLoadingStep('Generating your shopping list with AI...');
        list = await generateShoppingList(prompt, geminiKey);
      }
      setShoppingList(list);

      setLoadingStep('Fetching live prices from Kroger, Walmart, Target, Costco & more...');
      const items = list.map((item, i) => ({ id: String(i), name: item.name, quantity: item.quantity || 1 }));
      const data = await fetchPrices(items, zipCode, geminiKey);
      setResults(data);

      // Pick best single store by effective cost (items + delivery fee)
      const entries = Object.entries(data.effectiveSingleTotals).sort((a, b) => a[1].total - b[1].total);
      const [bestStoreId] = entries[0] ?? [null];
      const bestStore = STORES.find(s => s.id === bestStoreId) ?? null;
      setBestSingleStore(bestStore);

      if (geminiKey && bestStore) {
        setLoadingStep('Analyzing your options with AI...');
        const best = data.effectiveSingleTotals[bestStoreId];
        try {
          const rec = await getAiRecommendation(
            bestStore.name,
            best.items, best.delivery,
            data.splitItemsTotal, data.splitDeliveryTotal,
            list.length, geminiKey
          );
          setAiRec(rec);
        } catch { setAiRec(''); }
      } else {
        setAiRec('');
      }

      setStage('review');
    } catch (err) {
      setApiError(err.message);
      setStage('input');
    }
  };

  const handleApprove = () => {
    if (!selectedOption || !results) return;
    setStage('approved');
    const total = selectedOption === 'single'
      ? (results.effectiveSingleTotals[bestSingleStore?.id]?.total ?? 0)
      : selectedOption === 'doordash'
      ? ((results.effectiveSingleTotals[bestSingleStore?.id]?.items ?? 0) + DOORDASH_FEE)
      : results.effectiveSplitTotal;
    setPastOrders(prev => [{
      id: `ord-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      total, option: selectedOption, items: shoppingList,
    }, ...prev]);
  };

  const startNewSearch = () => {
    setStage('input'); setPrompt(''); setResults(null);
    setShoppingList([]); setAiRec(''); setSelectedOption(null); setApiError('');
  };

  const fmt = n => `$${Number(n).toFixed(2)}`;

  const bestEffective = bestSingleStore ? (results?.effectiveSingleTotals[bestSingleStore.id] ?? null) : null;

  const approvedStores = results
    ? (selectedOption === 'single' || selectedOption === 'doordash') && bestSingleStore
      ? [bestSingleStore].filter(s => s?.shopUrl)
      : [...new Set(results.optimalCart.items.filter(i => i.storeId).map(i => i.storeId))]
          .map(id => STORES.find(s => s.id === id)).filter(s => s?.shopUrl)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><TrendingDown size={22} /></div>
            <h1 className="text-xl font-bold tracking-tight">Aisle Five</h1>
          </div>
          <div className="flex items-center gap-1">
            {[['shop', ShoppingCart, 'Shop'], ['history', Clock, 'History'], ['profile', User, 'Profile'], ['info', Info, 'Info'], ['settings', Settings, 'Settings']].map(([tab, Icon, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                <Icon size={16} /><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-6 space-y-6">

        {/* ── Shop Tab ── */}
        {activeTab === 'shop' && (
          <>
            {/* Input */}
            {stage === 'input' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                {DEMO_MODE && (
                  <div className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-3 rounded-xl text-sm font-semibold">
                    <WifiOff size={16} /> Demo mode — prices are simulated. Add API keys to .env for live data.
                  </div>
                )}
                {apiError && (
                  <div className="bg-red-50 text-red-700 px-5 py-4 rounded-xl text-sm font-semibold flex items-center gap-3 border border-red-100">
                    <AlertCircle size={18} className="shrink-0" /> {apiError}
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">What are you shopping for?</h2>
                    <p className="text-gray-500 text-sm">Describe a meal, occasion, or weekly shop — AI builds your list and finds the best prices across Kroger, Walmart, Target, Costco & more.</p>
                  </div>
                  <div className="relative">
                    <Sparkles size={18} className="absolute left-4 top-4 text-blue-400" />
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); }}}
                      placeholder="e.g. I want to make tacos for 6 people, or weekly groceries for a family of 4..."
                      rows={3}
                      className="w-full pl-11 pr-5 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-base resize-none" />
                  </div>
                  <div>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={zipCode}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                          setZipCode(val);
                          if (val.length === 5) {
                            fetch(`https://api.zippopotam.us/us/${val}`)
                              .then(r => r.ok ? r.json() : null)
                              .then(d => setZipCity(d?.places?.[0]?.['place name']
                                ? `${d.places[0]['place name']}, ${d.places[0]['state abbreviation']}`
                                : 'error'))
                              .catch(() => setZipCity('error'));
                          } else {
                            setZipCity('');
                          }
                        }}
                        placeholder="ZIP code (for local Kroger prices)"
                        className="w-full pl-11 pr-5 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono" maxLength={5} />
                    </div>
                    {zipCity && (
                      zipCity === 'error'
                        ? <p className="text-xs text-red-500 font-semibold mt-1.5 ml-1 flex items-center gap-1">
                            <AlertCircle size={11} /> ZIP code does not exist
                          </p>
                        : <p className="text-xs text-green-600 font-semibold mt-1.5 ml-1 flex items-center gap-1">
                            <MapPin size={11} /> {zipCity}
                          </p>
                    )}
                  </div>
                  <button onClick={handleSearch} disabled={!prompt.trim() || zipCode.length !== 5 || zipCity === 'error'}
                    className="w-full bg-blue-600 disabled:bg-blue-300 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:active:scale-100 shadow-lg shadow-blue-100">
                    <Sparkles size={20} /> Find Best Prices
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { Icon: Sparkles,     label: 'AI builds your list',     sub: 'From any description' },
                    { Icon: Store,        label: 'Live prices from 4 stores', sub: 'Kroger, Walmart, Target, Costco' },
                    { Icon: CheckCircle2, label: 'You approve',              sub: 'Before checkout' },
                  ].map(({ Icon, label, sub }) => (
                    <div key={label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                      <Icon size={22} className="mx-auto mb-2 text-blue-500" />
                      <p className="font-bold text-sm text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {stage === 'loading' && (
              <div className="min-h-[60vh] flex flex-col items-center justify-center animate-in fade-in space-y-6">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 border-8 border-blue-50 rounded-full" />
                  <div className="absolute inset-0 border-8 border-blue-600 rounded-full border-t-transparent animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto text-blue-600" size={30} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800 animate-pulse">{loadingStep}</p>
                  <p className="text-gray-400 text-sm mt-2">This takes about 20–30 seconds</p>
                </div>
              </div>
            )}

            {/* Review */}
            {stage === 'review' && results && (
              <div className="animate-in slide-in-from-bottom-6 duration-500 space-y-6">

                {/* AI list */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                    <Sparkles size={15} className="text-blue-500" />
                    <p className="text-sm font-bold text-blue-700">AI Shopping List — {shoppingList.length} items</p>
                  </div>
                  <div className="px-6 py-4 flex flex-wrap gap-2">
                    {shoppingList.map((item, i) => (
                      <span key={i} className="bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full">
                        {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI recommendation */}
                {aiRec && (
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={15} />
                      <p className="text-xs font-bold uppercase tracking-widest opacity-75">AI Recommendation</p>
                    </div>
                    <p className="text-base leading-relaxed">{aiRec}</p>
                  </div>
                )}

                {/* Cart options */}
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Choose your cart strategy</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {bestSingleStore && results.effectiveSingleTotals[bestSingleStore.id] && (
                    <button onClick={() => setSelectedOption('single')}
                      className={`text-left p-6 rounded-2xl border-2 transition-all ${selectedOption === 'single' ? 'border-blue-600 bg-blue-50 shadow-lg shadow-blue-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Store size={17} className={bestSingleStore.text} />
                          <span className="font-bold text-gray-600 text-sm">Single Store</span>
                        </div>
                        {selectedOption === 'single' && <CheckCircle2 size={18} className="text-blue-600" />}
                      </div>
                      {(() => {
                        const e = results.effectiveSingleTotals[bestSingleStore.id];
                        return <>
                          <p className={`text-3xl font-black mb-1 ${bestSingleStore.text}`}>{fmt(e.total)}</p>
                          <p className="text-sm font-semibold text-gray-500">Everything from {bestSingleStore.name}</p>
                          <div className="mt-3 space-y-1">
                            <p className="text-xs text-gray-400">Items: {fmt(e.items)}</p>
                            {e.delivery > 0
                              ? <p className="text-xs text-amber-600 font-semibold">+ {fmt(e.delivery)} delivery (below ${DELIVERY[bestSingleStore.id]?.threshold} threshold)</p>
                              : <p className="text-xs text-green-600 font-semibold">✓ Free delivery</p>
                            }
                            <p className="text-xs text-gray-400">1 order</p>
                          </div>
                        </>;
                      })()}
                    </button>
                  )}

                  <button onClick={() => setSelectedOption('split')}
                    className={`text-left p-6 rounded-2xl border-2 transition-all ${selectedOption === 'split' ? 'border-green-600 bg-green-50 shadow-lg shadow-green-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingDown size={17} className="text-green-600" />
                        <span className="font-bold text-gray-600 text-sm">Split Cart</span>
                      </div>
                      {selectedOption === 'split' && <CheckCircle2 size={18} className="text-green-600" />}
                    </div>
                    <p className="text-3xl font-black mb-1 text-green-600">{fmt(results.effectiveSplitTotal)}</p>
                    <p className="text-sm font-semibold text-gray-500">Best price per item across all stores</p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-gray-400">Items: {fmt(results.splitItemsTotal)}</p>
                      {results.splitDeliveryTotal > 0
                        ? <p className="text-xs text-amber-600 font-semibold">+ {fmt(results.splitDeliveryTotal)} delivery across stores</p>
                        : <p className="text-xs text-green-600 font-semibold">✓ Free delivery on all stores</p>
                      }
                      {results.effectiveSingleTotals[bestSingleStore?.id] &&
                        results.effectiveSingleTotals[bestSingleStore.id].total - results.effectiveSplitTotal > 0.01 && (
                        <p className="text-xs font-bold text-green-600">
                          Save {fmt(results.effectiveSingleTotals[bestSingleStore.id].total - results.effectiveSplitTotal)} vs. single store
                        </p>
                      )}
                    </div>
                  </button>
                {/* DoorDash option */}
                {bestSingleStore && bestEffective && (
                  <button onClick={() => setSelectedOption('doordash')}
                    className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${selectedOption === 'doordash' ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Truck size={17} className="text-orange-500" />
                        <span className="font-bold text-gray-600 text-sm">DoorDash Delivery</span>
                        <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">Cheaper delivery</span>
                      </div>
                      {selectedOption === 'doordash' && <CheckCircle2 size={18} className="text-orange-500" />}
                    </div>
                    <p className="text-3xl font-black mb-1 text-orange-500">{fmt(bestEffective.items + DOORDASH_FEE)}</p>
                    <p className="text-sm font-semibold text-gray-500">Everything from {bestSingleStore.name}, delivered via DoorDash</p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-gray-400">Items: {fmt(bestEffective.items)}</p>
                      <p className="text-xs text-orange-600 font-semibold">+ ${DOORDASH_FEE.toFixed(2)} DoorDash delivery (free with DashPass)</p>
                      {bestEffective.delivery > DOORDASH_FEE && (
                        <p className="text-xs font-bold text-orange-600">
                          Save {fmt(bestEffective.delivery - DOORDASH_FEE)} vs. native delivery
                        </p>
                      )}
                      <p className="text-xs text-gray-400">1 order · DashPass: free delivery on $15+</p>
                    </div>
                  </button>
                )}
                </div>

                {/* Full price grid */}
                {(() => {
                  const activeStores = STORES.filter(s =>
                    results.optimalCart.items.some(item => item.allPrices?.[s.id] != null)
                  );
                  const lowestTotal = Math.min(...Object.values(results.singleStoreTotals));
                  return (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100">
                        <p className="font-bold text-gray-800">Price Breakdown by Item & Store</p>
                        <p className="text-xs text-gray-400 mt-0.5">Green = cheapest for that item</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                              <th className="text-left px-4 py-3 font-bold text-gray-500 min-w-[150px]">Item</th>
                              {activeStores.map(store => (
                                <th key={store.id} className={`px-3 py-3 font-bold text-center min-w-[90px] ${store.text}`}>
                                  {store.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {results.optimalCart.items.map((item, i) => (
                              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-semibold text-gray-800">
                                  {item.name}
                                  {item.quantity > 1 && (
                                    <span className="text-xs text-gray-400 font-normal ml-1">×{item.quantity}</span>
                                  )}
                                </td>
                                {activeStores.map(store => {
                                  const price = item.allPrices?.[store.id];
                                  const isCheapest = price != null && price === item.price;
                                  return (
                                    <td key={store.id} className="px-3 py-3 text-center">
                                      {price != null ? (
                                        <span className={`font-bold ${isCheapest ? 'text-green-600' : 'text-gray-600'}`}>
                                          {fmt(price)}
                                          {isCheapest && <span className="ml-1 text-green-500">✓</span>}
                                        </span>
                                      ) : (
                                        store.chain
                                          ? <span className="text-gray-400 text-xs">Data N/A</span>
                                          : <span className="text-gray-300">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-200 bg-gray-50">
                              <td className="px-4 py-3 font-black text-gray-900">Total</td>
                              {activeStores.map(store => {
                                const total = results.singleStoreTotals[store.id];
                                const isLowest = total != null && total === lowestTotal;
                                return (
                                  <td key={store.id} className="px-3 py-3 text-center">
                                    {total != null ? (
                                      <span className={`font-black ${isLowest ? 'text-green-600' : 'text-gray-700'}`}>
                                        {fmt(total)}
                                        {isLowest && <span className="ml-1 text-green-500">✓</span>}
                                      </span>
                                    ) : (
                                      store.chain
                                        ? <span className="text-gray-400 text-xs">Data N/A</span>
                                        : <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Product details table */}
                {(() => {
                  const activeStores = STORES.filter(s =>
                    results.optimalCart.items.some(item => item.descriptions?.[s.id])
                  );
                  if (activeStores.length === 0) return null;
                  return (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100">
                        <p className="font-bold text-gray-800">What's Being Compared</p>
                        <p className="text-xs text-gray-400 mt-0.5">Specific products found at each store</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                              <th className="text-left px-4 py-3 font-bold text-gray-500 min-w-[120px]">Item</th>
                              {activeStores.map(store => (
                                <th key={store.id} className={`px-3 py-3 font-bold text-left min-w-[160px] ${store.text}`}>
                                  {store.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {results.optimalCart.items.map((item, i) => (
                              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors align-top">
                                <td className="px-4 py-3 font-semibold text-gray-700">{item.name}</td>
                                {activeStores.map(store => (
                                  <td key={store.id} className="px-3 py-3 text-gray-500 text-xs leading-snug">
                                    {item.descriptions?.[store.id] ?? (
                                      store.chain
                                        ? <span className="text-gray-400 text-xs">Data N/A</span>
                                        : <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Approve */}
                <div className="sticky bottom-6 space-y-3">
                  <button onClick={handleApprove} disabled={!selectedOption}
                    className="w-full bg-gray-900 disabled:bg-gray-300 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-[0.98] disabled:active:scale-100 shadow-2xl shadow-gray-900/20">
                    <CheckCircle2 size={22} />
                    {selectedOption
                      ? `Approve ${selectedOption === 'single' ? 'Single Store' : selectedOption === 'doordash' ? 'DoorDash Delivery' : 'Split Cart'} & Get Links`
                      : 'Select a cart option above'}
                  </button>
                  <button onClick={startNewSearch} className="w-full text-center text-gray-400 hover:text-gray-600 py-2 text-sm font-semibold transition-colors">
                    ← Start over
                  </button>
                </div>
              </div>
            )}

            {/* Approved */}
            {stage === 'approved' && results && (
              <div className="animate-in zoom-in duration-300 space-y-6">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white text-center">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-400" />
                  <h2 className="text-3xl font-black mb-2">Cart Approved!</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    {selectedOption === 'single'
                      ? `Shop everything at ${bestSingleStore?.name}`
                      : selectedOption === 'doordash'
                      ? `Order from ${bestSingleStore?.name} via DoorDash`
                      : 'Shop each item at its cheapest store below'}
                  </p>
                  <p className="text-5xl font-black tabular-nums">
                    {fmt(selectedOption === 'single'
                      ? (bestEffective?.total ?? 0)
                      : selectedOption === 'doordash'
                      ? ((bestEffective?.items ?? 0) + DOORDASH_FEE)
                      : (results?.effectiveSplitTotal ?? 0))}
                  </p>
                  <p className="text-green-400 text-sm font-semibold mt-4">
                    Cart approved — charging your payment information on file.
                  </p>
                </div>
                <div className="space-y-3">
                  {selectedOption === 'doordash'
                    ? approvedStores.map(store => (
                        <a key={store.id} href={store.doordashUrl || 'https://www.doordash.com/grocery/'} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between bg-orange-50 border border-orange-200 hover:border-orange-400 rounded-2xl px-6 py-5 font-bold text-lg transition-all hover:shadow-md group">
                          <div className="flex items-center gap-3">
                            <Truck size={18} className="text-orange-500" />
                            Order {store.name} on DoorDash
                          </div>
                          <ExternalLink size={18} className="text-orange-300 group-hover:text-orange-500 transition-colors" />
                        </a>
                      ))
                    : approvedStores.map(store => (
                        <a key={store.id} href={store.shopUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between bg-white border border-gray-200 hover:border-blue-300 rounded-2xl px-6 py-5 font-bold text-lg transition-all hover:shadow-md group">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${store.color}`} />
                            Shop {store.name}
                          </div>
                          <ExternalLink size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </a>
                      ))
                  }
                </div>
                <button onClick={startNewSearch}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  <Search size={20} /> New Search
                </button>
              </div>
            )}
          </>
        )}

        {/* ── History Tab ── */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <h2 className="text-2xl font-bold">History</h2>
            {pastOrders.length === 0
              ? <div className="text-center py-24 text-gray-300 bg-white rounded-2xl border border-gray-100">
                  <Clock size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-semibold">No orders yet</p>
                </div>
              : pastOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-black text-xl text-gray-900">{fmt(order.total)}</p>
                        <p className="text-sm text-gray-400">{order.date} · {order.option === 'split' ? 'Split cart' : 'Single store'}</p>
                      </div>
                      <button onClick={() => {
                        setPrompt(order.items.map(i => i.name).join(', '));
                        setActiveTab('shop'); setStage('input');
                      }} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 flex items-center gap-2 transition-all">
                        <RefreshCw size={14} /> Reorder
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(expandedOrders.includes(order.id) ? order.items : order.items.slice(0, 4)).map((item, i) => (
                        <span key={i} className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                          {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
                        </span>
                      ))}
                      {order.items.length > 4 && (
                        <button onClick={() => setExpandedOrders(prev =>
                          prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id]
                        )} className="text-blue-600 text-xs font-bold px-3 py-1 hover:bg-blue-50 rounded-full transition-colors">
                          {expandedOrders.includes(order.id) ? 'Less' : `+${order.items.length - 4} more`}
                        </button>
                      )}
                    </div>
                  </div>
                ))
            }
          </div>
        )}

        {/* ── Info Tab ── */}
        {activeTab === 'info' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <h2 className="text-2xl font-bold">About This Tool</h2>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              <span className="font-bold">Disclaimer:</span> included for the purposes of assignment submission and ease of review. Would be removed in the fully deployed version.
            </div>

            {/* Data accuracy */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500" />
                <p className="font-bold text-gray-800">Data Accuracy</p>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="px-6 py-5">
                  <p className="font-semibold text-gray-800 mb-1">Kroger family stores — test environment data</p>
                  <p className="text-sm text-gray-500 leading-relaxed">Kroger prices are fetched from Kroger's <span className="font-semibold">Certification (test) environment</span>, not the live production API. Prices and product availability reflect test catalogue data and may not match what you'd see in a real store. A production API key would be required for real pricing.</p>
                </div>
                <div className="px-6 py-5">
                  <p className="font-semibold text-gray-800 mb-1">Walmart, Target & Costco — Gemini web search</p>
                  <p className="text-sm text-gray-500 leading-relaxed">Prices for these stores are retrieved via <span className="font-semibold">Gemini's Google Search grounding</span>, which searches the live web in real time. This means prices are directionally accurate but may reflect cached web pages rather than the exact current shelf price. Availability and regional pricing variations are not guaranteed.</p>
                </div>
                <div className="px-6 py-5">
                  <p className="font-semibold text-gray-800 mb-1">Product descriptions — Gemini constraints</p>
                  <p className="text-sm text-gray-500 leading-relaxed">The "What's Being Compared" table shows the specific product Gemini found at each store. Because Gemini interprets web search results, the exact product size, brand, or pack count may vary between searches. Always verify the specific product before purchasing.</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <h2 className="text-2xl font-bold">Profile</h2>

            {/* Delivery Address */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <MapPin size={16} className="text-blue-500" />
                <p className="font-bold text-gray-800">Delivery Address</p>
              </div>
              <div className="px-6 py-5 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Full Name</label>
                  <input type="text" value={profile.name || ''} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Street Address</label>
                  <input type="text" value={profile.street || ''} onChange={e => setProfile(p => ({ ...p, street: e.target.value }))}
                    placeholder="123 Main St"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Apt / Suite (optional)</label>
                  <input type="text" value={profile.apt || ''} onChange={e => setProfile(p => ({ ...p, apt: e.target.value }))}
                    placeholder="Apt 4B"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">City</label>
                    <input type="text" value={profile.city || ''} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                      placeholder="Somerville"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">State</label>
                    <input type="text" value={profile.state || ''} onChange={e => setProfile(p => ({ ...p, state: e.target.value.slice(0, 2).toUpperCase() }))}
                      placeholder="MA" maxLength={2}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">ZIP</label>
                    <input type="text" value={profile.zip || ''} onChange={e => setProfile(p => ({ ...p, zip: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                      placeholder="02144" maxLength={5}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <CreditCard size={16} className="text-blue-500" />
                <p className="font-bold text-gray-800">Payment Information</p>
              </div>
              <div className="px-6 py-5 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Cardholder Name</label>
                  <input type="text" value={profile.cardName || ''} onChange={e => setProfile(p => ({ ...p, cardName: e.target.value }))}
                    placeholder="Full name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Card Number</label>
                  <input type="text" value={profile.cardNumber || ''} onChange={e => setProfile(p => ({ ...p, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
                    placeholder="•••• •••• •••• ••••"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono tracking-widest" />
                  {profile.cardNumber?.length === 16 && (
                    <p className="text-xs text-gray-400 mt-1">Ending in {profile.cardNumber.slice(-4)}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Expiry Date</label>
                    <input type="text" value={profile.expiry || ''} onChange={e => {
                      let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                      setProfile(p => ({ ...p, expiry: v }));
                    }}
                      placeholder="MM/YY" maxLength={5}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">CVV</label>
                    <input type="password" value={profile.cvv || ''} onChange={e => setProfile(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="•••"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => {
              localStorage.setItem('af_profile', JSON.stringify(profile));
              setProfileSaved(true);
              setTimeout(() => setProfileSaved(false), 2000);
            }}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              {profileSaved ? <><CheckCircle2 size={20} /> Saved!</> : <><User size={20} /> Save Profile</>}
            </button>

            <p className="text-xs text-center text-gray-400">Your information is stored locally in your browser and never sent to any server.</p>
          </div>
        )}

        {/* ── Settings Tab ── */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <h2 className="text-2xl font-bold">Settings</h2>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              <span className="font-bold">Disclaimer:</span> included for the purposes of assignment submission and ease of review. Would be removed in the fully deployed version.
            </div>


            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Gemini API Key</label>
                <p className="text-xs text-gray-400 mb-3">
                  Powers AI list generation, web price search (Walmart, Target, Costco), and cart recommendations. Get a free key at aistudio.google.com → Get API key.
                </p>
                <div className="flex gap-3">
                  <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)}
                    placeholder="AIza..."
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
                  <button onClick={saveGeminiKey}
                    className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all min-w-[80px]">
                    {geminiKeySaved ? '✓ Saved' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-sm font-bold text-gray-700 mb-3">API Status</p>
              {[
                { label: 'Kroger API',                      active: !!CLIENT_ID,       note: 'Live prices for 6 Kroger-family banners' },
                { label: 'Gemini AI',                       active: !!geminiKey,       note: 'List generation, Walmart/Target/Costco prices & recommendations' },
              ].map(({ label, active, note }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{note}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ml-4 ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {active ? 'Connected' : 'Not set'}
                  </span>
                </div>
              ))}
            </div>

            {/* System prompts */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button onClick={() => setShowPrompts(p => !p)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-500" />
                  <p className="font-bold text-gray-800">System Prompts</p>
                </div>
                {showPrompts ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              {showPrompts && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {[
                    { label: 'Shopping List Generation', desc: 'Used when you submit a prompt — tells Gemini to return a structured JSON grocery list.', prompt: LIST_SYSTEM_PROMPT },
                    { label: 'Web Price Search', desc: 'Used once per item — tells Gemini to search Walmart, Target & Costco and return prices + product descriptions.', prompt: PRICE_SEARCH_SYSTEM_PROMPT },
                    { label: 'Cart Recommendation', desc: 'Used after prices are fetched — tells Gemini to compare single-store vs split-cart in plain English.', prompt: TRADEOFF_SYSTEM_PROMPT },
                  ].map(({ label, desc, prompt }) => (
                    <div key={label} className="px-6 py-5">
                      <p className="font-semibold text-gray-800 text-sm mb-0.5">{label}</p>
                      <p className="text-xs text-gray-400 mb-3">{desc}</p>
                      <pre className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-mono">{prompt}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
