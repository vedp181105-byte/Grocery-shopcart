/* ================================================================
   INDIAN GROCERY STORE — Frontend (API-backed)
   Matches exact IDs in index.html
================================================================ */

// ── State ─────────────────────────────────────────────────────────
const CATS = {1:'Fruits',2:'Vegetables',3:'Dairy & Eggs',4:'Bakery',5:'Meat & Fish',6:'Beverages',7:'Snacks',8:'Frozen Foods',11:'Organic'};
let ALL_PRODUCTS = [];
let cartCount    = 0;
let wishlistIds  = [];
let currentUser  = null;
let activeCat    = 0;
let lastOrder    = null;

// ── API Helper ────────────────────────────────────────────────────
async function api(method, url, body) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    return res.json();
  } catch(e) {
    return { success: false, message: 'Network error' };
  }
}

// ── Boot ──────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  // Hide loader
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) { loader.style.opacity='0'; setTimeout(()=>loader.style.display='none',400); }
  }, 1200);

  // Fetch all initial data in parallel
  const [prodRes, cartRes, wishRes, authRes] = await Promise.all([
    api('GET', '/api/products'),
    api('GET', '/api/cart'),
    api('GET', '/api/wishlist'),
    api('GET', '/api/auth/me'),
  ]);

  ALL_PRODUCTS = prodRes.products || [];
  cartCount    = cartRes.count    || 0;
  wishlistIds  = wishRes.wishlist || [];
  currentUser  = authRes.user     || null;

  updateCartBadge();
  updateAuthUI();
  renderHomeSections();
  buildSidebarCats();
});

// ── Stars HTML ────────────────────────────────────────────────────
function starsHtml(r) {
  let s = '';
  for (let i = 1; i <= 5; i++)
    s += `<i class="fas fa-star${i <= Math.round(r) ? '' : ' e'}"></i>`;
  return s;
}

// ── Product Card ──────────────────────────────────────────────────
function prodCard(p) {
  const liked = wishlistIds.includes(p.id);
  return `
  <div class="pw">
    <div class="pc" onmousemove="tilt3d(this,event)" onmouseleave="resetTilt(this)">
      ${p.disc > 0 ? `<div class="p-disc">−${p.disc}%</div>` : ''}
      ${p.badge    ? `<div class="p-badge">${p.badge}</div>` : ''}
      <div class="pib">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        <div class="pqa">
          <button class="qa" onclick="addCart(event,${p.id})" title="Add to Cart"><i class="fas fa-basket-shopping"></i></button>
          <button class="qa" onclick="buyNow(event,${p.id})" title="Buy Now"><i class="fas fa-bolt"></i></button>
          <button class="qa ${liked?'qa-liked':''}" id="wb-${p.id}" onclick="toggleWish(event,${p.id})" title="Wishlist">
            <i class="fa${liked?'s':'r'} fa-heart"></i>
          </button>
        </div>
      </div>
      <div class="pb">
        <div class="pcat">${CATS[p.cat]||'General'}</div>
        <div class="pname">${p.name}</div>
        <div class="pdesc">${p.desc||''}</div>
        <div class="pstars">${starsHtml(p.rating)} <span>(${p.rev})</span></div>
        <div class="pfoot">
          <div>
            <span class="pp">₹${p.price}</span>
            ${p.orig?`<span class="pw-" style="text-decoration:line-through;margin-left:4px;font-size:12px">₹${p.orig}</span>`:''}
            <span class="punit" style="font-size:11px;margin-left:4px;color:var(--muted)">${p.unit}</span>
          </div>
          <button class="addb" id="ab-${p.id}" onclick="addCart(event,${p.id})" title="Add to Cart">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Home Sections ─────────────────────────────────────────────────
function renderHomeSections() {
  // Featured
  const feat = ALL_PRODUCTS.filter(p => p.feat);
  const featEl = document.getElementById('homeFeat');
  if (featEl) featEl.innerHTML = feat.map(prodCard).join('');

  // Hot deals (top discount)
  const deals = [...ALL_PRODUCTS].sort((a,b) => b.disc - a.disc).slice(0, 8);
  const dealsEl = document.getElementById('homeDeals');
  if (dealsEl) dealsEl.innerHTML = deals.map(prodCard).join('');

  // New arrivals (last 8 by id desc)
  const newArr = [...ALL_PRODUCTS].sort((a,b) => b.id - a.id).slice(0, 8);
  const newEl = document.getElementById('homeNew');
  if (newEl) newEl.innerHTML = newArr.map(prodCard).join('');
}

// ── Shop Page ─────────────────────────────────────────────────────
async function renderShop() {
  const catVal  = parseInt(document.getElementById('fCat')?.value || '0') || activeCat || 0;
  const sortVal = document.getElementById('fSort')?.value || '';
  const minP    = parseFloat(document.getElementById('fMin')?.value || '0') || 0;
  const maxP    = parseFloat(document.getElementById('fMax')?.value || '0') || 0;
  const q       = document.getElementById('searchInput')?.value.trim() || '';

  // Map sort values to API values
  const sortMap = { price_asc:'price-asc', price_desc:'price-desc', rating:'rating', discount:'disc', '':'' };
  const apiSort = sortMap[sortVal] || '';

  let url = `/api/products?cat=${catVal}&sort=${apiSort}`;
  if (q) url += `&q=${encodeURIComponent(q)}`;

  const data = await api('GET', url);
  let prods = data.products || [];

  // Client-side price filter
  if (minP > 0) prods = prods.filter(p => p.price >= minP);
  if (maxP > 0) prods = prods.filter(p => p.price <= maxP);

  const cntEl = document.getElementById('shopCnt');
  if (cntEl) cntEl.textContent = `${prods.length} product${prods.length !== 1 ? 's' : ''} found`;

  const grid = document.getElementById('shopGrid');
  if (!grid) return;

  if (!prods.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:72px 20px">
      <div style="font-size:64px">🔍</div>
      <h3 style="margin:14px 0 8px">No products found</h3>
      <p style="color:var(--muted)">Try a different search or category</p>
      <button onclick="clearF()" style="margin-top:16px;padding:10px 22px;background:var(--forest);color:#000;border:none;border-radius:50px;cursor:pointer;font-weight:700">Clear Filters</button>
    </div>`;
  } else {
    grid.innerHTML = prods.map(prodCard).join('');
  }

  // Sync sidebar highlight
  buildSidebarCats(catVal);
}

function clearF() {
  activeCat = 0;
  const fCat = document.getElementById('fCat'); if (fCat) fCat.value = '0';
  const fSort = document.getElementById('fSort'); if (fSort) fSort.value = '';
  const fMin = document.getElementById('fMin'); if (fMin) fMin.value = '';
  const fMax = document.getElementById('fMax'); if (fMax) fMax.value = '';
  const si = document.getElementById('searchInput'); if (si) si.value = '';
  renderShop();
}

function buildSidebarCats(activeCatId = 0) {
  const el = document.getElementById('sidebarCats');
  if (!el) return;
  const entries = Object.entries(CATS);
  el.innerHTML = entries.map(([id, name]) => `
    <div class="sidebar-cat-link ${parseInt(id) === activeCatId ? 'active-cat' : ''}"
      data-cat="${id}"
      onclick="goShopCat(${id})"
      style="padding:7px 10px;cursor:pointer;border-radius:8px;font-size:13px;margin-bottom:3px;transition:all .2s;color:var(--text)">
      ${name}
    </div>`).join('');
}

// ── Navigation ────────────────────────────────────────────────────
function goPage(p) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const pg = document.getElementById('page-' + p);
  if (pg) pg.classList.add('active');

  // Update catnav active
  document.querySelectorAll('.catnav a').forEach(a => a.classList.remove('active'));
  if (p === 'home') document.getElementById('cn-home')?.classList.add('active');

  window.scrollTo(0, 0);

  if (p === 'shop')     renderShop();
  if (p === 'cart')     renderCart();
  if (p === 'checkout') renderCheckout();
  if (p === 'orders')   renderOrders();
}

function goShop(mode) {
  activeCat = 0;
  if (mode === 'discount') {
    const fSort = document.getElementById('fSort');
    if (fSort) fSort.value = 'discount';
  }
  goPage('shop');
}

function goShopCat(cat) {
  activeCat = cat;
  const fCat = document.getElementById('fCat');
  if (fCat) fCat.value = String(cat);
  goPage('shop');
}

function liveSearch() {
  if (document.getElementById('page-shop')?.classList.contains('active')) renderShop();
}

function runSearch() {
  const q = document.getElementById('searchInput')?.value.trim();
  if (q) { activeCat = 0; goPage('shop'); }
}

// ── 3D Tilt ───────────────────────────────────────────────────────
function tilt3d(el, e) {
  const r = el.getBoundingClientRect();
  const x = ((e.clientY - r.top)  / r.height - 0.5) * 14;
  const y = ((e.clientX - r.left) / r.width  - 0.5) * -14;
  el.style.transform = `perspective(700px) rotateX(${x}deg) rotateY(${y}deg) scale(1.04)`;
}
function resetTilt(el) { el.style.transform = ''; }

// ── Cart Operations ───────────────────────────────────────────────
async function addCart(e, id) {
  e.stopPropagation();
  const data = await api('POST', '/api/cart', { id, qty: 1 });
  if (data.success) {
    cartCount = data.count;
    updateCartBadge();
    showToast('🛒 Added to cart!');

    // Button feedback
    const btn = document.getElementById('ab-' + id);
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i>';
      btn.style.background = '#2e7d32';
      setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; }, 900);
    }
  } else {
    showToast('❌ ' + (data.message || 'Error'));
  }
}

async function buyNow(e, id) {
  e.stopPropagation();
  const data = await api('POST', '/api/cart', { id, qty: 1 });
  if (data.success) {
    cartCount = data.count;
    updateCartBadge();
    goPage('checkout');
  }
}

async function removeCartItem(id) {
  const data = await api('DELETE', `/api/cart/${id}`);
  if (data.success) { cartCount = data.count; updateCartBadge(); renderCart(); }
}

async function updateQty(id, val) {
  if (val < 1) { await removeCartItem(id); return; }
  await api('PUT', `/api/cart/${id}`, { qty: val });
  renderCart();
}

async function clearCartAll() {
  if (!confirm('Clear entire cart?')) return;
  await api('DELETE', '/api/cart');
  cartCount = 0;
  updateCartBadge();
  renderCart();
}

async function renderCart() {
  const box = document.getElementById('cartBox');
  const sum = document.getElementById('cartSum');
  if (!box) return;

  const data = await api('GET', '/api/cart');
  cartCount = data.count || 0;
  updateCartBadge();

  if (!data.cart || !data.cart.length) {
    box.innerHTML = `
      <div class="empty-wrap">
        <div style="font-size:72px;margin-bottom:16px">🛒</div>
        <h2 style="margin-bottom:8px">Your cart is empty</h2>
        <p style="color:var(--muted);margin-bottom:24px">Add fresh groceries to your cart!</p>
        <button onclick="goShop()" style="padding:13px 28px;background:linear-gradient(135deg,var(--forest),var(--mid));color:#000;border:none;border-radius:50px;cursor:pointer;font-weight:700;font-size:15px">
          <i class="fas fa-shopping-bag"></i> Shop Now
        </button>
      </div>`;
    if (sum) sum.innerHTML = '';
    return;
  }

  const { cart, sub, del, tax, tot } = data;

  box.innerHTML = `
    <div class="cart-th" style="padding:14px 20px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:700;font-size:15px">Cart Items (${cart.length})</span>
      <button onclick="clearCartAll()" style="background:rgba(255,255,255,.15);border:none;color:#000;padding:5px 12px;border-radius:50px;cursor:pointer;font-size:12px">🗑 Clear All</button>
    </div>
    ${cart.map(c => {
      const p = c.product;
      return `<div class="cart-row" style="display:flex;align-items:center;gap:14px;padding:14px 20px">
        <div class="cpimg"><img src="${p.img}" alt="${p.name}"></div>
        <div style="flex:1;min-width:0">
          <div class="cpname">${p.name}</div>
          <div class="cpunit">${CATS[p.cat]||''} · ${p.unit}</div>
          <div class="cprice" style="margin-top:4px">₹${p.price} <span style="text-decoration:line-through;color:var(--muted);font-size:12px">₹${p.orig}</span></div>
        </div>
        <div class="qty-ctrl">
          <button class="qb" onclick="updateQty(${p.id}, ${c.qty - 1})">−</button>
          <input class="qi" type="number" value="${c.qty}" min="1" onchange="updateQty(${p.id}, parseInt(this.value)||1)" style="width:38px">
          <button class="qb" onclick="updateQty(${p.id}, ${c.qty + 1})">+</button>
        </div>
        <div class="clt" style="min-width:72px;text-align:right">₹${c.lineTotal}</div>
        <button class="crm" onclick="removeCartItem(${p.id})"><i class="fas fa-trash-alt"></i></button>
      </div>`;
    }).join('')}
    <div class="cart-ftr">
      <button onclick="goShop()" style="padding:9px 18px;border:1.5px solid var(--border);border-radius:50px;background:#fff;cursor:pointer;font-size:13px;font-weight:600">
        <i class="fas fa-arrow-left"></i> Continue Shopping
      </button>
    </div>`;

  if (sum) {
    sum.innerHTML = `
      <h3>Order Summary</h3>
      ${sub >= 500 ? '' : `<div class="free-note">🎉 Add ₹${(500-sub).toFixed(0)} more for FREE delivery!</div>`}
      <div class="srow"><span>Subtotal (${cart.reduce((s,c)=>s+c.qty,0)} items)</span><span>₹${sub.toFixed(2)}</span></div>
      <div class="srow"><span>GST (5%)</span><span>₹${tax.toFixed(2)}</span></div>
      <div class="srow"><span>Delivery</span><span style="color:${del===0?'#2e7d32':'inherit'}">${del===0?'🎉 FREE':'₹'+del}</span></div>
      <div class="sdiv"></div>
      <div class="stot"><span>Grand Total</span><span style="color:var(--forest)">₹${tot.toFixed(2)}</span></div>
      <button class="co-btn" onclick="goPage('checkout')">
        <i class="fas fa-lock"></i> Proceed to Checkout
      </button>
      <p class="sec-note" style="margin-top:10px"><i class="fas fa-shield-alt"></i> 100% secure & encrypted</p>`;
  }
}

// ── Wishlist ──────────────────────────────────────────────────────
async function toggleWish(e, id) {
  e.stopPropagation();
  const data = await api('POST', `/api/wishlist/${id}`);
  if (!data.success) return;

  if (data.action === 'added') { wishlistIds.push(id); showToast('❤️ Added to wishlist!'); }
  else { wishlistIds = wishlistIds.filter(x => x !== id); showToast('Removed from wishlist'); }

  // Update all heart buttons for this product id
  document.querySelectorAll(`#wb-${id}`).forEach(btn => {
    btn.className = `qa ${data.liked ? 'qa-liked' : ''}`;
    btn.innerHTML = `<i class="fa${data.liked ? 's' : 'r'} fa-heart"></i>`;
  });
}

// ── Checkout ──────────────────────────────────────────────────────
async function renderCheckout() {
  const sumEl = document.getElementById('coSum');
  if (!sumEl) return;

  const data = await api('GET', '/api/cart');
  if (!data.cart || !data.cart.length) {
    sumEl.innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px">Your cart is empty.<br><button onclick="goShop()" style="margin-top:10px;padding:10px 20px;background:var(--forest);color:#000;border:none;border-radius:50px;cursor:pointer">Shop Now</button></p>`;
    return;
  }

  const { cart, sub, del, tax, tot } = data;
  sumEl.innerHTML = `
    <h3>Order Summary</h3>
    <div style="max-height:260px;overflow-y:auto;margin-bottom:14px">
      ${cart.map(c => `
        <div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
          <img src="${c.product.img}" alt="${c.product.name}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.product.name}</div>
            <div style="font-size:12px;color:var(--muted)">Qty: ${c.qty} × ₹${c.product.price}</div>
          </div>
          <div style="font-weight:700;font-size:13px">₹${c.lineTotal}</div>
        </div>`).join('')}
    </div>
    <div class="srow"><span>Subtotal</span><span>₹${sub.toFixed(2)}</span></div>
    <div class="srow"><span>GST (5%)</span><span>₹${tax.toFixed(2)}</span></div>
    <div class="srow"><span>Delivery</span><span style="color:${del===0?'#2e7d32':'inherit'}">${del===0?'🎉 FREE':'₹'+del}</span></div>
    <div class="sdiv"></div>
    <div class="stot"><strong>Total</strong><strong style="color:var(--forest)">₹${tot.toFixed(2)}</strong></div>`;
}

async function placeOrder() {
  const name  = document.getElementById('co_name')?.value.trim();
  const email = document.getElementById('co_email')?.value.trim();
  const phone = document.getElementById('co_phone')?.value.trim();
  const addr  = document.getElementById('co_addr')?.value.trim();
  const pay   = document.querySelector('input[name="pay"]:checked')?.value || 'Cash on Delivery';
  const notes = document.getElementById('co_notes')?.value.trim() || '';

  if (!name) { showToast('⚠️ Please enter your full name'); return; }
  if (!phone) { showToast('⚠️ Please enter your phone number'); return; }
  if (!addr)  { showToast('⚠️ Please enter your delivery address'); return; }

  const cartData = await api('GET', '/api/cart');
  if (!cartData.cart?.length) { showToast('⚠️ Your cart is empty'); return; }

  const items = cartData.cart.map(c => ({
    id: c.product.id, name: c.product.name, img: c.product.img,
    price: c.product.price, orig: c.product.orig, unit: c.product.unit,
    cat: c.product.cat, qty: c.qty, lineTotal: c.lineTotal,
  }));

  const data = await api('POST', '/api/orders', {
    name, email, phone, addr, pay, notes,
    items,
    sub: cartData.sub, del: cartData.del, tax: cartData.tax, tot: cartData.tot,
  });

  if (!data.success) { showToast('❌ ' + (data.message || 'Order failed')); return; }

  lastOrder  = data.order;
  cartCount  = 0;
  updateCartBadge();
  renderInvoice(data.order);
  goPage('invoice');
  showToast('✅ Order placed successfully!');
}

// ── Invoice ───────────────────────────────────────────────────────
function renderInvoice(o) {
  const card = document.getElementById('invCard');
  const acts = document.getElementById('invActs');
  if (!card || !o) return;

  const date = new Date(o.createdAt || Date.now()).toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'});
  const time = new Date(o.createdAt || Date.now()).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'});

  card.innerHTML = `
    <div class="inv-hd">
      <div>
        <div class="inv-brand-name">🌿 Indian Grocery Store</div>
        <div class="inv-brand-sub">Surat, Gujarat, India — 395001</div>
      </div>
      <div class="inv-meta">
        <h3>INVOICE</h3>
        <div class="inv-num"># ${o.inv}</div>
        <div class="inv-date">${date} at ${time}</div>
        <span class="inv-pill">✅ CONFIRMED</span>
      </div>
    </div>
    <div class="inv-parties">
      <div class="ip"><h4>Billed To</h4><div class="pn">${o.name}</div><p>${o.email||''}<br>${o.phone}<br>${o.addr}</p></div>
      <div class="ip"><h4>From</h4><div class="pn">Indian Grocery Store</div><p>indiangrocerystore@gmail.com<br>+91 9054607126<br>Surat, Gujarat 395001</p></div>
      <div class="ip"><h4>Payment</h4><div class="pn">${o.pay}</div><p>Status: <strong style="color:var(--forest)">Confirmed</strong>${o.notes?'<br>Note: '+o.notes:''}</p></div>
    </div>
    <div class="inv-tbl-wrap">
      <table class="inv-tbl">
        <thead><tr><th style="width:45%"># &nbsp;Product</th><th>Price</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody>
          ${o.items.map((it,i) => `<tr>
            <td><span style="color:var(--muted);font-size:11px;margin-right:6px">${i+1}</span>
                <span class="ithumb"><img src="${it.img}" alt="${it.name}"></span>${it.name}</td>
            <td>₹${it.price.toFixed(2)}</td>
            <td>${it.qty}</td>
            <td><strong>₹${it.lineTotal.toFixed(2)}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="inv-tots">
      <div class="tots-box">
        <div class="tr2"><span>Subtotal</span><span>₹${o.sub.toFixed(2)}</span></div>
        <div class="tr2"><span>GST (5%)</span><span>₹${o.tax.toFixed(2)}</span></div>
        <div class="tr2"><span>Delivery</span><span>${o.del>0?'₹'+o.del.toFixed(2):'🎉 FREE'}</span></div>
        <div class="tr2 grand"><strong>GRAND TOTAL</strong><strong>₹${o.tot.toFixed(2)}</strong></div>
      </div>
    </div>
    <div class="inv-ft">
      <p>🌿 Thank you for choosing Indian Grocery Store! Your order will arrive within 2 hours.</p>
      <p style="margin-top:5px">Questions? indiangrocerystore@gmail.com · +91 9054607126</p>
    </div>`;

  if (acts) {
    acts.innerHTML = `
      <button class="ib ib-g" onclick="window.print()"><i class="fas fa-print"></i> Print Invoice</button>
      <button class="ib ib-o" onclick="showToast('💡 Use Print → Save as PDF')"><i class="fas fa-download"></i> Download PDF</button>
      <button class="ib ib-n" onclick="goPage('orders')"><i class="fas fa-box"></i> My Orders</button>
      <button class="ib ib-n" onclick="goShop()"><i class="fas fa-shopping-bag"></i> Continue Shopping</button>`;
  }
}

// ── My Orders ─────────────────────────────────────────────────────
async function renderOrders() {
  const wrap = document.getElementById('ordersWrap');
  if (!wrap) return;

  const email = currentUser?.email || '';
  const data  = await api('GET', `/api/orders${email ? '?email=' + encodeURIComponent(email) : ''}`);
  const dbOrders = data.orders || [];

  if (!dbOrders.length) {
    wrap.innerHTML = `<div style="text-align:center;padding:72px 20px;background:#fff;border-radius:var(--r);border:1.5px solid var(--border)">
      <div style="font-size:72px;margin-bottom:16px">📦</div>
      <h2 style="margin-bottom:8px">No orders yet</h2>
      <p style="color:var(--muted);margin-bottom:22px">Start shopping to see your orders here!</p>
      <button onclick="goShop()" style="padding:13px 28px;background:linear-gradient(135deg,var(--forest),var(--mid));color:#000;border:none;border-radius:50px;cursor:pointer;font-weight:700;font-size:15px">
        <i class="fas fa-shopping-bag"></i> Start Shopping
      </button>
    </div>`;
    return;
  }

  wrap.innerHTML = `<div style="display:flex;flex-direction:column;gap:16px">
    ${dbOrders.map(o => {
      const date = new Date(o.createdAt||Date.now()).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
      const time = new Date(o.createdAt||Date.now()).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
      return `<div style="background:#fff;border-radius:var(--r);border:1.5px solid var(--border);padding:22px;box-shadow:var(--shadow-sm)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div>
            <div style="font-weight:700;font-size:16px;color:var(--forest)">📦 ${o.inv}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">${date} at ${time}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span style="background:${o.status==='cancelled'?'#fff1f1':'rgba(232,120,74,.12)'};color:${o.status==='cancelled'?'#c0392b':'var(--forest)'};border:1px solid ${o.status==='cancelled'?'#f5b7b1':'var(--border)'};padding:4px 14px;border-radius:50px;font-size:12px;font-weight:700;text-transform:uppercase">
              ${o.status}
            </span>
            ${o.status==='confirmed'||o.status==='processing'
              ?`<button onclick="cancelOrder('${o.inv}')" style="font-size:12px;color:#c0392b;background:none;border:1px solid #f5b7b1;padding:4px 12px;border-radius:50px;cursor:pointer">Cancel</button>`
              :''}
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          ${o.items.map(it=>`<div style="display:flex;align-items:center;gap:7px;background:var(--off);border-radius:8px;padding:6px 10px;font-size:12.5px;border:1px solid var(--border)">
            <img src="${it.img}" alt="${it.name}" style="width:28px;height:28px;object-fit:cover;border-radius:5px">
            ${it.name} × ${it.qty}
          </div>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--border)">
          <div style="font-size:13px;color:var(--muted)">${o.pay} · ${o.items.reduce((s,i)=>s+i.qty,0)} items</div>
          <div style="font-size:18px;font-weight:800;color:var(--forest)">₹${o.tot.toFixed(2)}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

async function cancelOrder(inv) {
  if (!confirm('Are you sure you want to cancel this order?')) return;
  const data = await api('PATCH', `/api/orders/${inv}/cancel`, {});
  if (data.success) { showToast('Order cancelled'); renderOrders(); }
  else showToast('❌ ' + (data.message || 'Cannot cancel'));
}

// ── Auth Modal ────────────────────────────────────────────────────
function openAuth() {
  const modal = document.getElementById('authModal');
  if (modal) { modal.style.display = 'flex'; showLoginForm(); }
}
function closeAuth() {
  const modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'none';
}

function showLoginForm() {
  const c = document.getElementById('authContent');
  if (!c) return;
  c.innerHTML = `
    <h2 style="margin-bottom:6px">Welcome Back 👋</h2>
    <p class="auth-sub" style="margin-bottom:20px">Sign in to track orders and save your wishlist</p>
    <div class="fg2"><label>Email Address</label><input id="ai_email" type="email" placeholder="you@email.com"></div>
    <div class="fg2"><label>Password</label><input id="ai_pass" type="password" placeholder="Your password"></div>
    <button class="auth-btn" onclick="doLogin()" style="width:100%;padding:13px;border:none;cursor:pointer;margin-top:8px;font-size:15px">
      <i class="fas fa-sign-in-alt"></i> Sign In
    </button>
    <p class="auth-sw" style="text-align:center;margin-top:16px;font-size:13px">
      Don't have an account? <a href="#" onclick="showRegisterForm()" style="color:var(--forest);font-weight:700">Create one →</a>
    </p>`;
}

function showRegisterForm() {
  const c = document.getElementById('authContent');
  if (!c) return;
  c.innerHTML = `
    <h2 style="margin-bottom:6px">Create Account 🌿</h2>
    <p class="auth-sub" style="margin-bottom:20px">Join thousands of happy customers</p>
    <div class="fg2"><label>Full Name *</label><input id="ar_name" placeholder="Your full name"></div>
    <div class="fg2"><label>Email Address *</label><input id="ar_email" type="email" placeholder="you@email.com"></div>
    <div class="fg2"><label>Phone</label><input id="ar_phone" placeholder="+91 XXXXX XXXXX"></div>
    <div class="fg2"><label>Password *</label><input id="ar_pass" type="password" placeholder="Min 6 characters"></div>
    <button class="auth-btn" onclick="doRegister()" style="width:100%;padding:13px;border:none;cursor:pointer;margin-top:8px;font-size:15px">
      <i class="fas fa-user-plus"></i> Create Account
    </button>
    <p class="auth-sw" style="text-align:center;margin-top:16px;font-size:13px">
      Already have an account? <a href="#" onclick="showLoginForm()" style="color:var(--forest);font-weight:700">Sign in →</a>
    </p>`;
}

async function doLogin() {
  const email = document.getElementById('ai_email')?.value.trim();
  const pass  = document.getElementById('ai_pass')?.value;
  if (!email || !pass) { showToast('⚠️ Enter email and password'); return; }
  const data = await api('POST', '/api/auth/login', { email, pass });
  if (data.success) {
    currentUser = data.user;
    updateAuthUI();
    closeAuth();
    showToast(`✅ Welcome back, ${data.user.name}!`);
  } else {
    showToast('❌ ' + data.message);
  }
}

async function doRegister() {
  const name  = document.getElementById('ar_name')?.value.trim();
  const email = document.getElementById('ar_email')?.value.trim();
  const phone = document.getElementById('ar_phone')?.value.trim();
  const pass  = document.getElementById('ar_pass')?.value;
  if (!name || !email || !pass) { showToast('⚠️ Fill all required fields'); return; }
  const data = await api('POST', '/api/auth/register', { name, email, phone, pass });
  if (data.success) {
    currentUser = data.user;
    updateAuthUI();
    closeAuth();
    showToast(`✅ Welcome, ${data.user.name}!`);
  } else {
    showToast('❌ ' + data.message);
  }
}

async function doLogout() {
  await api('POST', '/api/auth/logout', {});
  currentUser = null;
  updateAuthUI();
  showToast('👋 Logged out successfully');
}

function updateAuthUI() {
  const btn = document.getElementById('authBtn');
  if (!btn) return;
  if (currentUser) {
    btn.innerHTML = `<i class="fas fa-user-circle"></i> ${currentUser.name.split(' ')[0]}`;
    btn.onclick = () => {
      if (confirm(`Logged in as ${currentUser.name}.\n\nClick OK to logout.`)) doLogout();
    };
  } else {
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login / Register';
    btn.onclick = openAuth;
  }
}

// ── Contact ───────────────────────────────────────────────────────
async function sendContact() {
  const name    = document.getElementById('ct_name')?.value.trim();
  const email   = document.getElementById('ct_email')?.value.trim();
  const subject = document.getElementById('ct_subj')?.value.trim();
  const message = document.getElementById('ct_msg')?.value.trim();

  if (!name || !email || !message) { showToast('⚠️ Please fill all required fields'); return; }

  const data = await api('POST', '/api/contact', { name, email, subject, message });
  if (data.success) {
    showToast("✅ Message sent! We'll reply within 24 hours.");
    const el = document.getElementById('contactSuccess');
    if (el) { el.style.display = 'block'; setTimeout(() => el.style.display='none', 4000); }
    document.getElementById('ct_name').value  = '';
    document.getElementById('ct_email').value = '';
    document.getElementById('ct_msg').value   = '';
    if (document.getElementById('ct_subj')) document.getElementById('ct_subj').value = '';
  } else {
    showToast('❌ ' + (data.message || 'Failed'));
  }
}

// ── Newsletter ────────────────────────────────────────────────────
function nlSub(e) {
  e.preventDefault();
  showToast('🎉 Subscribed! Check your email for 10% off code.');
  e.target.reset();
}

// ── Voice Search ──────────────────────────────────────────────────
function startVoiceSearch() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    showToast('⚠️ Voice search not supported in this browser');
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = 'en-IN';
  const vbtn = document.getElementById('voiceBtn');
  if (vbtn) vbtn.classList.add('listening');
  showToast('🎤 Listening… speak now!');

  rec.onresult = (evt) => {
    const q = evt.results[0][0].transcript;
    const si = document.getElementById('searchInput');
    if (si) si.value = q;
    if (vbtn) vbtn.classList.remove('listening');
    goPage('shop');
  };
  rec.onerror = () => {
    if (vbtn) vbtn.classList.remove('listening');
    showToast('❌ Could not hear. Try again.');
  };
  rec.onend = () => { if (vbtn) vbtn.classList.remove('listening'); };
  rec.start();
}

// ── Share Website ─────────────────────────────────────────────────
function shareWebsite() {
  if (navigator.share) {
    navigator.share({ title: 'Indian Grocery Store', text: 'Fresh groceries delivered fast!', url: window.location.href });
  } else {
    navigator.clipboard?.writeText(window.location.href).then(() => showToast('🔗 Link copied to clipboard!'));
  }
}

// ── Utilities ─────────────────────────────────────────────────────
function updateCartBadge() {
  const dot = document.getElementById('cartDot');
  if (dot) dot.textContent = cartCount;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Scroll ────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
});

// Close auth modal on backdrop click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('authModal');
  if (modal && e.target === modal) closeAuth();
});
