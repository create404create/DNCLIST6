const API_BASE = "https://api.uspeoplesearch.site/v1/?x=";
const PROXY = "https://api.allorigins.win/raw?url=";

const phoneInput = document.getElementById('phoneInput');
const searchBtn = document.getElementById('searchBtn');
const clearInput = document.getElementById('clearInput');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const resultDiv = document.getElementById('result');
const themeToggle = document.getElementById('themeToggle');

const personName = document.getElementById('personName');
const personStatus = document.getElementById('personStatus');
const phoneEl = document.getElementById('phone');
const searchTimeEl = document.getElementById('searchTime');
const dobAge = document.getElementById('dobAge');
const addressesDiv = document.getElementById('addresses');
const relativesDiv = document.getElementById('relatives');
const favoriteBtn = document.getElementById('favoriteBtn');

const copyBtn = document.getElementById('copyBtn');
const exportBtn = document.getElementById('exportBtn');
const shareBtn = document.getElementById('shareBtn');
const newSearch = document.getElementById('newSearch');
const historyList = document.getElementById('historyList');
const favoritesList = document.getElementById('favoritesList');
const clearHistory = document.getElementById('clearHistory');
const toast = document.getElementById('toast');

// Theme
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.remove('light-theme');
  document.body.classList.add('dark-theme');
  themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light-theme');
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

// Input format & clear
phoneInput.addEventListener('input', (e) => {
  let val = e.target.value.replace(/\D/g, '');
  if (val.length > 10) val = val.slice(0,10);
  if (val.length > 6) val = val.slice(0,3) + '-' + val.slice(3,6) + '-' + val.slice(6);
  else if (val.length > 3) val = val.slice(0,3) + '-' + val.slice(3);
  e.target.value = val;
  clearInput.classList.toggle('hidden', !val);
});
clearInput.addEventListener('click', () => { phoneInput.value = ''; clearInput.classList.add('hidden'); phoneInput.focus(); });

searchBtn.addEventListener('click', searchPhone);
phoneInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchPhone(); });

async function searchPhone() {
  let phone = phoneInput.value.replace(/\D/g, '');
  if (phone.length !== 10) return showError("Enter valid 10-digit number");

  loading.classList.remove('hidden');
  errorDiv.classList.add('hidden');
  resultDiv.classList.add('hidden');
  searchBtn.disabled = true;

  try {
    const data = await fetchData(phone);
    if (data.status !== "ok" || !data.person?.length) return showError("No information found.");

    const person = data.person[0];
    const now = new Date().toLocaleString();

    personName.textContent = person.name || "Unknown";
    personStatus.textContent = person.status ? `Status: ${person.status}` : "";
    phoneEl.textContent = data.phone;
    searchTimeEl.textContent = now;
    dobAge.textContent = person.dob || person.age ? `${person.dob || ''} ${person.age ? `(Age ${person.age})` : ''}`.trim() || "N/A" : "N/A";

    addressesDiv.innerHTML = person.addresses?.length
      ? person.addresses.map(a => `<div class="address-item"><strong>${a.home}</strong><br>${a.city}, ${a.state} ${a.zip}<br>Deliverable: ${a.isDeliverable === 'D' ? 'Yes' : 'No'}</div>`).join('')
      : "<p>No addresses found.</p>";

    relativesDiv.innerHTML = person.relatives?.length && person.relatives[0] !== "Not Found"
      ? person.relatives.map(r => `<div class="relative-item">${r}</div>`).join('')
      : "<p>No relatives info.</p>";

    // Favorite check
    const isFav = isFavorite(phone);
    favoriteBtn.classList.toggle('active', isFav);
    favoriteBtn.innerHTML = isFav ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';

    resultDiv.classList.remove('hidden');

    // Save to history
    saveToHistory({ phone: data.phone, name: person.name || "Unknown", time: now });

  } catch (err) {
    showError("Error: " + err.message);
  } finally {
    loading.classList.add('hidden');
    searchBtn.disabled = false;
  }
}

async function fetchData(phone) {
  const url = API_BASE + phone;
  const proxy = PROXY + encodeURIComponent(url);
  const res = await fetch(proxy);
  if (!res.ok) throw new Error("Network error");
  return await res.json();
}

function showError(msg) {
  errorDiv.textContent = msg;
  errorDiv.classList.remove('hidden');
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

// Copy
copyBtn.addEventListener('click', async () => {
  const text = `
Name: ${personName.textContent}
Phone: ${phoneEl.textContent}
Searched: ${searchTimeEl.textContent}
DOB/Age: ${dobAge.textContent}

Addresses:
${Array.from(addressesDiv.querySelectorAll('.address-item')).map(el => el.textContent.trim()).join('\n\n')}

Relatives:
${Array.from(relativesDiv.querySelectorAll('.relative-item')).map(el => el.textContent).join('\n')}
  `.trim();

  await navigator.clipboard.writeText(text);
  showToast("Copied to clipboard!");
});

// Export TXT
exportBtn.addEventListener('click', () => {
  const text = copyBtn.previousElementSibling.textContent || ''; // fallback
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `search_${phoneEl.textContent}.txt`; a.click();
  URL.revokeObjectURL(url);
  showToast("Downloaded!");
});

// Share (Web Share API)
shareBtn.addEventListener('click', async () => {
  const text = `Found info for ${phoneEl.textContent}: ${personName.textContent} - via US People Search Pro`;
  if (navigator.share) {
    await navigator.share({ title: "Phone Lookup Result", text });
  } else {
    showToast("Share not supported – use copy instead");
  }
});

// New search
newSearch.addEventListener('click', () => {
  resultDiv.classList.add('hidden');
  phoneInput.value = '';
  clearInput.classList.add('hidden');
  phoneInput.focus();
});

// History & Favorites (localStorage)
function saveToHistory(item) {
  let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  history = history.filter(h => h.phone !== item.phone); // unique
  history.unshift(item);
  if (history.length > 20) history.pop();
  localStorage.setItem('searchHistory', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  historyList.innerHTML = history.map(item => `
    <li onclick="loadFromHistory('${item.phone}')">
      <span>${item.phone} - ${item.name}</span>
      <small>${item.time}</small>
    </li>
  `).join('') || '<li>No recent searches</li>';
}

function loadFromHistory(phone) {
  phoneInput.value = phone.replace(/\D/g, '').match(/(\d{3})(\d{3})(\d{4})/)?.slice(1).join('-') || phone;
  searchPhone();
}

function isFavorite(phone) {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  return favs.some(f => f.phone === phone);
}

function toggleFavorite() {
  let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  const phone = phoneEl.textContent;
  const name = personName.textContent;
  const index = favs.findIndex(f => f.phone === phone);

  if (index > -1) {
    favs.splice(index, 1);
    favoriteBtn.classList.remove('active');
    favoriteBtn.innerHTML = '<i class="far fa-star"></i>';
  } else {
    favs.push({ phone, name });
    favoriteBtn.classList.add('active');
    favoriteBtn.innerHTML = '<i class="fas fa-star"></i>';
  }
  localStorage.setItem('favorites', JSON.stringify(favs));
  renderFavorites();
}

favoriteBtn.addEventListener('click', toggleFavorite);

function renderFavorites() {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  favoritesList.innerHTML = favs.map(f => `
    <li onclick="loadFromHistory('${f.phone}')">
      <span>${f.phone} - ${f.name}</span>
      <button onclick="event.stopPropagation(); removeFavorite('${f.phone}')"><i class="fas fa-trash"></i></button>
    </li>
  `).join('') || '<li>No favorites yet</li>';
}

function removeFavorite(phone) {
  let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  favs = favs.filter(f => f.phone !== phone);
  localStorage.setItem('favorites', JSON.stringify(favs));
  renderFavorites();
  if (phoneEl.textContent === phone) {
    favoriteBtn.classList.remove('active');
    favoriteBtn.innerHTML = '<i class="far fa-star"></i>';
  }
}

clearHistory.addEventListener('click', () => {
  if (confirm("Clear all history?")) {
    localStorage.removeItem('searchHistory');
    renderHistory();
  }
});

// Collapsible sections
function toggleSection(el) {
  const content = el.nextElementSibling;
  content.style.display = content.style.display === 'none' ? 'block' : 'none';
  el.querySelector('i').classList.toggle('fa-chevron-down');
  el.querySelector('i').classList.toggle('fa-chevron-up');
}

// Init
renderHistory();
renderFavorites();
phoneInput.focus();
