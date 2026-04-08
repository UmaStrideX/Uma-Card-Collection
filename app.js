const typeIcons = {
  speed: "https://gametora.com/images/umamusume/icons/utx_ico_obtain_00.png",
  stamina: "https://gametora.com/images/umamusume/icons/utx_ico_obtain_01.png",
  power: "https://gametora.com/images/umamusume/icons/utx_ico_obtain_02.png",
  guts: "https://gametora.com/images/umamusume/icons/utx_ico_obtain_03.png",
  wit: "https://gametora.com/images/umamusume/icons/utx_ico_obtain_04.png",
  friend: "https://gametora.com/images/umamusume/icons/utx_ico_obtain_05.png",
  group: "https://gametora.com/images/umamusume/icons/utx_ico_obtain_06.png",
};

const rarityIcons = {
  SSR: "https://gametora.com/images/umamusume/icons/utx_txt_rarity_03.png",
  SR: "https://gametora.com/images/umamusume/icons/utx_txt_rarity_02.png",
  R: "https://gametora.com/images/umamusume/icons/utx_txt_rarity_01.png",
};

const b64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

let cardsData = [];
let collection = JSON.parse(localStorage.getItem('collection') || '[]');
let onlyGlobal = false;

function getRarityLabel(rarity) {
  if (rarity === 3) return "SSR";
  if (rarity === 2) return "SR";
  return "R";
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const colors = type === 'success' ? 'bg-emerald-600' : 'bg-red-600';
  toast.className = `${colors} text-white px-6 py-3 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-10 opacity-0 font-bold text-sm flex items-center gap-2 z-50`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-10', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function saveCollection() {
  localStorage.setItem('collection', JSON.stringify(collection));
  updateStats();
}

function updateStats() {
  const statsEl = document.getElementById('collection-stats');
  if (cardsData.length > 0) {
    statsEl.innerText = `${collection.length} / ${cardsData.length} CARTES`;
  }
}

function toggleCard(card) {
  const id = card.support_id.toString();
  const idx = collection.findIndex(c => c.id === id);
  if (idx === -1) {
    collection.push({ id: id, limitBreak: 0 });
    showToast(`${card.char_name} ajoutée !`);
  } else {
    collection.splice(idx, 1);
    showToast(`${card.char_name} retirée !`, 'error');
  }
  saveCollection();
}

function changeLB(cardId, delta) {
  const c = collection.find(c => c.id === cardId);
  if (!c) return;
  c.limitBreak = Math.min(4, Math.max(0, c.limitBreak + delta));
  saveCollection();
}

function exportCollection() {
  const rawValues = cardsData.map(card => {
    const found = collection.find(c => c.id === card.support_id.toString());
    return found ? found.limitBreak : 5;
  });
  let compressed = "";
  let step = 0;
  for (let i = 0; i < rawValues.length; i += 2) {
    const v1 = rawValues[i];
    const v2 = (rawValues[i + 1] !== undefined) ? rawValues[i + 1] : 5;
    let combinedIndex = (v1 * 6) + v2;
    combinedIndex = (combinedIndex + (step * 7)) % 64;
    compressed += b64Alphabet[combinedIndex];
    step++;
  }
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('c', compressed);
  return url.toString();
}

function importCollection(code) {
  collection = [];
  let rawValues = [];
  let step = 0;
  for (let char of code) {
    let combinedIndex = b64Alphabet.indexOf(char);
    if (combinedIndex === -1) { step++; continue; }
    combinedIndex = (combinedIndex - (step * 7)) % 64;
    if (combinedIndex < 0) combinedIndex += 64;
    const v1 = Math.floor(combinedIndex / 6);
    const v2 = combinedIndex % 6;
    rawValues.push(v1, v2);
    step++;
  }
  rawValues.forEach((lb, index) => {
    if (lb !== 5 && cardsData[index]) {
      collection.push({ id: cardsData[index].support_id.toString(), limitBreak: lb });
    }
  });
  saveCollection();
  renderAll();
  showToast("Collection importée !");
}

function exportToJson() {
  const dataStr = JSON.stringify(collection, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `umamusume_collection_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Fichier JSON téléchargé !");
}

function importFromJson(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        collection = imported;
        saveCollection();
        renderAll();
        showToast("Fichier JSON importé !");
      } else {
        throw new Error();
      }
    } catch (err) {
      showToast("Erreur lors de l'importation du JSON", 'error');
    }
  };
  reader.readAsText(file);
}

function checkURLImport() {
  const params = new URLSearchParams(window.location.search);
  const data = params.get('c');
  if (data && cardsData.length > 0) {
    importCollection(data);
    window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
  }
}

function updateToggleButton(isMainPage) {
  const btn = document.getElementById('toggle-view');
  if (isMainPage) {
    btn.innerText = `Voir ma collection (${collection.length})`;
    btn.className = "bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-2xl font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-95 text-sm";
  } else {
    btn.innerText = "Voir toutes les cartes";
    btn.className = "bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-2xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] active:scale-95 text-sm";
  }
}

function createCardElement(card, showLB = false) {
  const id = card.support_id.toString();
  const ownedItem = collection.find(c => c.id === id);
  const owned = !!ownedItem;
  const lb = owned ? ownedItem.limitBreak : 0;
  const container = document.createElement('div');
  container.className = `group relative w-full bg-gray-900 rounded-2xl overflow-hidden shadow-lg border border-gray-800 p-2 flex flex-col gap-2`;
  const imgContainer = document.createElement('div');
  imgContainer.className = "relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-800";
  const img = document.createElement('img');
  img.src = `https://gametora.com/images/umamusume/supports/tex_support_card_${card.support_id}.png`;
  img.loading = "lazy";
  img.className = "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110";
  imgContainer.appendChild(img);
  const rarityIcon = document.createElement('img');
  rarityIcon.src = rarityIcons[getRarityLabel(card.rarity)];
  rarityIcon.className = "absolute top-1 left-1 h-8 w-auto drop-shadow-md z-10";
  imgContainer.appendChild(rarityIcon);
  let typeKey = card.type.toLowerCase() === 'intelligence' ? 'wit' : card.type.toLowerCase();
  const typeIcon = document.createElement('img');
  typeIcon.src = typeIcons[typeKey] || '';
  typeIcon.className = "absolute top-1 right-1 h-8 w-auto drop-shadow-md";
  imgContainer.appendChild(typeIcon);
  const nameOverlay = document.createElement('div');
  nameOverlay.className = "absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent text-white text-[10px] text-center pt-4 pb-1 truncate px-2 font-semibold";
  nameOverlay.innerText = card.char_name;
  imgContainer.appendChild(nameOverlay);
  container.appendChild(imgContainer);
  const actionBtn = document.createElement('button');
  actionBtn.className = `w-full py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${owned ? 'bg-gray-800 text-red-400 hover:bg-red-900/30' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`;
  actionBtn.innerText = owned ? 'Retirer' : 'Ajouter';
  actionBtn.onclick = () => { toggleCard(card); renderAll(); };
  container.appendChild(actionBtn);
  const formattedName = card.char_name.replace(/'/g, '').replace(/\s+/g, '-').toLowerCase();
  const infoLink = document.createElement('a');
  infoLink.href = `https://gametora.com/umamusume/supports/${card.support_id}-${formattedName}`;
  infoLink.target = "_blank";
  infoLink.className = "w-full py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all text-center btn-info";
  infoLink.innerText = "Infos";
  container.appendChild(infoLink);
  if (showLB && owned) {
    const lbContainer = document.createElement('div');
    lbContainer.className = "flex items-center justify-between bg-gray-800/50 rounded-xl p-1 border border-white/5";
    const decBtn = document.createElement('button');
    decBtn.innerHTML = "−";
    decBtn.className = "w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-lg";
    decBtn.onclick = () => { changeLB(id, -1); renderAll(); };
    const stars = document.createElement('div');
    stars.className = "flex gap-0.5";
    for (let i = 1; i <= 4; i++) {
      const star = document.createElement('span');
      star.innerHTML = '★';
      star.className = `text-sm transition-colors ${i <= lb ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : 'text-gray-600'}`;
      stars.appendChild(star);
    }
    const incBtn = document.createElement('button');
    incBtn.innerHTML = "+";
    incBtn.className = "w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-lg";
    incBtn.onclick = () => { changeLB(id, 1); renderAll(); };
    lbContainer.append(decBtn, stars, incBtn);
    container.appendChild(lbContainer);
  }
  return container;
}

function renderAll() {
  const mainEl = document.getElementById('mainPage');
  const collGrid = document.getElementById('collectionGrid');
  const isMain = !mainEl.classList.contains('hidden');
  const isColl = !document.getElementById('collectionPage').classList.contains('hidden');
  
  updateToggleButton(isMain);
  
  let container = isMain ? mainEl : (isColl ? collGrid : null);
  if (!container) return;
  container.innerHTML = '';
  
  const search = document.getElementById('search').value.toLowerCase();
  const rarity = document.getElementById('rarityFilter').value;
  const type = document.getElementById('typeFilter').value;
  
  let list = cardsData.filter(c => {
    const n = c.char_name.toLowerCase().includes(search);
    const r = !rarity || getRarityLabel(c.rarity) === rarity;
    let tk = c.type.toLowerCase() === 'intelligence' ? 'wit' : c.type.toLowerCase();
    const t = !type || tk === type.toLowerCase();
    const g = !onlyGlobal || c.release_en !== undefined;
    return n && r && t && g;
  }).sort((a, b) => b.support_id - a.support_id);
  
  if (isColl) {
    list = list.filter(c => collection.some(col => col.id === c.support_id.toString()));
  }
  
  list.forEach(c => container.appendChild(createCardElement(c, isColl)));
}

axios.get('https://gametora.com/data/umamusume/support-cards.d1db8dd7.json')
  .then(res => { cardsData = res.data; checkURLImport(); updateStats(); renderAll(); })
  .catch(err => console.error(err));

const modal = document.getElementById('confirm-modal');
document.getElementById('open-reset-modal').onclick = () => modal.classList.remove('hidden');
document.getElementById('cancel-reset').onclick = () => modal.classList.add('hidden');
document.getElementById('confirm-reset').onclick = () => {
  collection = [];
  saveCollection();
  modal.classList.add('hidden');
  renderAll();
  showToast("Collection réinitialisée", 'error');
};

document.getElementById('toggle-view').onclick = () => {
  const main = document.getElementById('mainPage');
  const coll = document.getElementById('collectionPage');
  const tools = document.getElementById('collection-tools');
  main.classList.toggle('hidden');
  coll.classList.toggle('hidden');
  tools.classList.toggle('hidden');
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.getElementById('exportBtn').onclick = () => {
  const url = exportCollection();
  const res = document.getElementById('exportResult');
  res.value = url;
  res.select();
  navigator.clipboard.writeText(url).then(() => showToast("Lien copié !"));
};

document.getElementById('importBtn').onclick = () => {
  const val = document.getElementById('importData').value.trim();
  if (!val) return;
  importCollection(val.includes('c=') ? new URLSearchParams(val.split('?')[1]).get('c') : val);
};

document.getElementById('exportJsonBtn').onclick = exportToJson;
document.getElementById('importJsonBtn').onclick = () => document.getElementById('importJsonFile').click();
document.getElementById('importJsonFile').onchange = (e) => {
  if (e.target.files.length > 0) importFromJson(e.target.files[0]);
};

document.getElementById('globalFilterBtn').onclick = (e) => {
  onlyGlobal = !onlyGlobal;
  e.target.innerText = `Global Only: ${onlyGlobal ? 'ON' : 'OFF'}`;
  e.target.className = onlyGlobal 
    ? "p-3 rounded-xl bg-emerald-600/20 border border-emerald-500 text-emerald-400 text-sm font-bold transition-all whitespace-nowrap"
    : "p-3 rounded-xl bg-gray-900/40 border border-gray-700 text-white text-sm font-bold transition-all hover:border-emerald-500 whitespace-nowrap";
  renderAll();
};

document.getElementById('search').oninput = renderAll;
document.getElementById('rarityFilter').onchange = renderAll;
document.getElementById('typeFilter').onchange = renderAll;

const backToTopBtn = document.getElementById('back-to-top');

window.onscroll = () => {
  if (document.body.scrollTop > 500 || document.documentElement.scrollTop > 500) {
    backToTopBtn.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
  } else {
    backToTopBtn.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
  }
};

backToTopBtn.onclick = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const headerWrapper = document.getElementById('header-wrapper');
const headerContent = document.getElementById('header-content');
const toggleHeaderBtn = document.getElementById('toggle-header');
const toggleIcon = document.getElementById('toggle-icon');
const mainContent = document.getElementById('main-content');

function toggleHeaderLogic(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const height = headerContent.offsetHeight;
  const isHidden = headerWrapper.classList.toggle('header-hidden');
  
  if (isHidden) {
    headerWrapper.style.transform = `translateY(-${height}px)`;
    mainContent.style.marginTop = `-${height}px`;
    toggleIcon.style.transform = 'rotate(180deg)';
  } else {
    headerWrapper.style.transform = 'translateY(0)';
    mainContent.style.marginTop = '0px';
    toggleIcon.style.transform = 'rotate(0deg)';
  }
}

toggleHeaderBtn.addEventListener('click', toggleHeaderLogic);
toggleHeaderBtn.addEventListener('touchstart', toggleHeaderLogic, { passive: false });

window.addEventListener('resize', () => {
  if (headerWrapper.classList.contains('header-hidden')) {
    const height = headerContent.offsetHeight;
    headerWrapper.style.transform = `translateY(-${height}px)`;
    mainContent.style.marginTop = `-${height}px`;
  }
});