// Mini Marketplace - front-end only
// Users, products, and cart are stored in localStorage.
// Passwords are hashed using Web Crypto (still not production-grade without a backend).

const state = {
  currentUser: null,
  users: [],         // { id, name, email, passwordHash, role }
  products: [],      // { id, sellerId, title, desc, price, category, image, stock, createdAt }
  cart: []           // { productId, qty }
};

// ---------- Utilities ----------
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function uid(prefix='id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}
function fmtUSD(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}
async function sha256(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Storage ----------
function loadState() {
  try {
    const users = JSON.parse(localStorage.getItem('mm_users')) || [];
    const products = JSON.parse(localStorage.getItem('mm_products')) || sampleProducts();
    const cart = JSON.parse(localStorage.getItem('mm_cart')) || [];
    const currentUser = JSON.parse(localStorage.getItem('mm_currentUser')) || null;
    Object.assign(state, { users, products, cart, currentUser });
  } catch (e) {
    console.warn('Resetting storage due to parse error', e);
    localStorage.clear();
  }
}
function saveUsers() { localStorage.setItem('mm_users', JSON.stringify(state.users)); }
function saveProducts() { localStorage.setItem('mm_products', JSON.stringify(state.products)); }
function saveCart() { localStorage.setItem('mm_cart', JSON.stringify(state.cart)); }
function saveCurrentUser() { localStorage.setItem('mm_currentUser', JSON.stringify(state.currentUser)); }

// ---------- Sample data ----------
function sampleProducts() {
  const seller = { id: 'seller_demo', name: 'Demo Seller' };
  return [
    { id: uid('p'), sellerId: seller.id, title: 'Handmade Candle', desc: 'Lavender soy candle.', price: 14.99, category: 'Home', image: 'https://images.unsplash.com/photo-1512499617640-c2f999098c83?q=80&w=800&auto=format&fit=crop', stock: 20, createdAt: Date.now() },
    { id: uid('p'), sellerId: seller.id, title: 'Ceramic Mug', desc: 'Dishwasher-safe artisan mug.', price: 24.00, category: 'Kitchen', image: 'https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?q=80&w=800&auto=format&fit=crop', stock: 12, createdAt: Date.now() },
    { id: uid('p'), sellerId: seller.id, title: 'Notebook', desc: 'Dot-grid notebook for journaling.', price: 9.50, category: 'Stationery', image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=800&auto=format&fit=crop', stock: 40, createdAt: Date.now() },
  ];
}

// ---------- Auth ----------
async function signup({ name, email, password, role }) {
  email = email.trim().toLowerCase();
  if (state.users.find(u => u.email === email)) throw new Error('Email already in use.');
  const passwordHash = await sha256(password);
  const user = { id: uid('u'), name: name.trim(), email, passwordHash, role };
  state.users.push(user);
  saveUsers();
  state.currentUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  saveCurrentUser();
  renderAuthStatus();
}
async function login({ email, password }) {
  email = email.trim().toLowerCase();
  const user = state.users.find(u => u.email === email);
  if (!user) throw new Error('Invalid email or password.');
  const hash = await sha256(password);
  if (hash !== user.passwordHash) throw new Error('Invalid email or password.');
  state.currentUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  saveCurrentUser();
  renderAuthStatus();
}
function logout() {
  state.currentUser = null;
  saveCurrentUser();
  renderAuthStatus();
}

// ---------- Products ----------
function addProduct(prod) {
  prod.id = uid('p');
  prod.createdAt = Date.now();
  state.products.push(prod);
  saveProducts();
}
function sellerProducts(sellerId) {
  return state.products.filter(p => p.sellerId === sellerId);
}
function categories() {
  return Array.from(new Set(state.products.map(p => p.category))).sort();
}

// ---------- Cart ----------
function addToCart(productId) {
  const line = state.cart.find(l => l.productId === productId);
  if (line) line.qty += 1; else state.cart.push({ productId, qty: 1 });
  saveCart();
  renderCart();
}
function removeFromCart(productId) {
  state.cart = state.cart.filter(l => l.productId !== productId);
  saveCart();
  renderCart();
}
function cartTotal() {
  return state.cart.reduce((sum, l) => {
    const p = state.products.find(p => p.id === l.productId);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);
}
function checkoutDemo() {
  if (!state.cart.length) return alert('Cart is empty.');
  alert('Checkout complete (demo). No payment processed.');
  state.cart = [];
  saveCart();
  renderCart();
}

// ---------- UI Rendering ----------
function showView(id) {
  $$('.view').forEach(v => v.classList.add('hidden'));
  $(`#${id}`).classList.remove('hidden');
}
function renderAuthStatus() {
  const status = $('#authStatus'), loginBtn = $('#navLogin'), logoutBtn = $('#navLogout');
  if (state.currentUser) {
    status.textContent = `Logged in as ${state.currentUser.name} (${state.currentUser.role})`;
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
  } else {
    status.textContent = 'Not logged in';
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }
}
function renderCatalog() {
  const grid = $('#productGrid');
  const term = $('#searchInput').value.trim().toLowerCase();
  const cat = $('#categoryFilter').value;
  const items = state.products.filter(p => {
    const matchesTerm = !term || `${p.title} ${p.desc} ${p.category}`.toLowerCase().includes(term);
    const matchesCat = !cat || p.category === cat;
    return matchesTerm && matchesCat;
  });
  grid.innerHTML = items.map(p => `
    <div class="card">
      <img src="${p.image || ''}" alt="${p.title}">
      <div class="card-body">
        <div class="card-title">${p.title}</div>
        <div class="card-price">${fmtUSD(p.price)}</div>
        <div class="card-meta">Category: ${p.category} • Stock: ${p.stock}</div>
        <p class="muted">${p.desc}</p>
        <button class="btn" data-add="${p.id}">Add to cart</button>
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', e => addToCart(e.target.dataset.add)));
  // Category options
  const cats = categories();
  const filter = $('#categoryFilter');
  const current = filter.value;
  filter.innerHTML = `<option value="">All categories</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  filter.value = current || '';
}
function renderCart() {
  const wrap = $('#cartItems');
  if (!state.cart.length) {
    wrap.innerHTML = `<p class="muted">Your cart is empty.</p>`;
    $('#cartTotal').textContent = fmtUSD(0);
    return;
  }
  wrap.innerHTML = state.cart.map(l => {
    const p = state.products.find(p => p.id === l.productId);
    if (!p) return '';
    return `
      <div class="cart-line">
        <div>
          <div>${p.title}</div>
          <div class="muted">${fmtUSD(p.price)} × ${l.qty}</div>
        </div>
        <div>
          <button class="nav" data-rem="${p.id}">Remove</button>
        </div>
      </div>
    `;
  }).join('');
  wrap.querySelectorAll('[data-rem]').forEach(btn => btn.addEventListener('click', e => removeFromCart(e.target.dataset.rem)));
  $('#cartTotal').textContent = fmtUSD(cartTotal());
}
function renderSellerDashboard() {
  const list = $('#sellerProducts');
  const u = state.currentUser;
  if (!u || u.role !== 'seller') {
    list.innerHTML = `<p class="muted">Login as a seller to manage products.</p>`;
    return;
  }
  const items = sellerProducts(u.id);
  list.innerHTML = items.map(p => `
    <div class="card">
      <img src="${p.image || ''}" alt="${p.title}">
      <div class="card-body">
        <div class="card-title">${p.title}</div>
        <div class="card-price">${fmtUSD(p.price)}</div>
        <div class="card-meta">Stock: ${p.stock} • ${p.category}</div>
        <p class="muted">${p.desc}</p>
        <button class="nav" data-del="${p.id}">Delete</button>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', e => {
    const id = e.target.dataset.del;
    state.products = state.products.filter(p => p.id !== id);
    saveProducts();
    renderSellerDashboard();
    renderCatalog();
  }));
}

// ---------- Event bindings ----------
function bindEvents() {
  // Navigation
  $('#navCatalog').addEventListener('click', () => { showView('catalogView'); renderCatalog(); });
  $('#navCart').addEventListener('click', () => { showView('cartView'); renderCart(); });
  $('#navDashboard').addEventListener('click', () => { showView('dashboardView'); renderSellerDashboard(); });
  $('#navLogin').addEventListener('click', () => showView('authView'));
  $('#navLogout').addEventListener('click', () => { logout(); showView('authView'); });

  // Auth
  $('#signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#signupName').value;
    const email = $('#signupEmail').value;
    const password = $('#signupPassword').value;
    const role = $('#signupRole').value;
    try {
      await signup({ name, email, password, role });
      alert('Account created and logged in.');
      showView('catalogView'); renderCatalog();
    } catch (err) { alert(err.message); }
  });

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value;
    const password = $('#loginPassword').value;
    try {
      await login({ email, password });
      alert('Logged in.');
      showView('catalogView'); renderCatalog();
    } catch (err) { alert(err.message); }
  });

  // Catalog filters
  $('#searchInput').addEventListener('input', renderCatalog);
  $('#categoryFilter').addEventListener('change', renderCatalog);

  // Cart
  $('#checkoutBtn').addEventListener('click', checkoutDemo);

  // Seller product form
  $('#productForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.currentUser || state.currentUser.role !== 'seller') {
      return alert('You must be logged in as a seller.');
    }
    const prod = {
      sellerId: state.currentUser.id,
      title: $('#prodTitle').value.trim(),
      desc: $('#prodDesc').value.trim(),
      price: Number($('#prodPrice').value),
      category: $('#prodCategory').value.trim(),
      image: $('#prodImage').value.trim(),
      stock: parseInt($('#prodStock').value, 10)
    };
    addProduct(prod);
    alert('Product published.');
    e.target.reset();
    renderSellerDashboard();
    renderCatalog();
  });
}

// ---------- Init ----------
function init() {
  loadState();
  bindEvents();
  renderAuthStatus();
  showView(state.currentUser ? 'catalogView' : 'authView');
  renderCatalog();
}
document.addEventListener('DOMContentLoaded', init);
