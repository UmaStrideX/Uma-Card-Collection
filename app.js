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
let deck = JSON.parse(localStorage.getItem('umadeck') || '[null,null,null,null,null,null]');
let onlyGlobal = false;
let currentView = 'main';

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

function saveDeck() {
  localStorage.setItem('umadeck', JSON.stringify(deck));
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
    const deckIdx = deck.indexOf(id);
    if (deckIdx !== -1) deck[deckIdx] = null;
    saveDeck();
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

function updateToggleButton(view) {
  const btn = document.getElementById('toggle-view');
  const deckBtn = document.getElementById('toggle-deck');
  const tools = document.getElementById('collection-tools');
  if (view === 'main') {
    btn.innerText = `Voir ma collection (${collection.length})`;
    btn.className = "bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-2xl font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-95 text-sm";
    deckBtn.classList.add('hidden');
    tools.classList.add('hidden');
  } else {
    btn.innerText = "Voir toutes les cartes";
    btn.className = "bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-2xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] active:scale-95 text-sm";
    deckBtn.classList.remove('hidden');
    tools.classList.remove('hidden');
  }
}

function createCardElement(card, mode = 'full') {
  const id = card.support_id.toString();
  const ownedItem = collection.find(c => c.id === id);
  const owned = !!ownedItem;
  const lb = owned ? ownedItem.limitBreak : 0;
  
  const isSmall = mode === 'deck-slot' || mode === 'deck-source';
  
  const container = document.createElement('div');
  container.className = `group relative w-full bg-gray-900 rounded-2xl overflow-hidden shadow-lg border border-gray-800 ${isSmall ? 'p-1' : 'p-2'} flex flex-col gap-2`;
  
  if (mode === 'deck-source') {
    container.draggable = true;
    container.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', id); });
    container.classList.add('cursor-grab', 'active:cursor-grabbing');
  }

  const imgContainer = document.createElement('div');
  imgContainer.className = "relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-800";
  
  const img = document.createElement('img');
  img.src = `https://gametora.com/images/umamusume/supports/tex_support_card_${card.support_id}.png`;
  if (mode === 'full') {
    img.loading = "lazy";
  }
  img.className = "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110";
  imgContainer.appendChild(img);
  
  const rIcon = document.createElement('img');
  rIcon.src = rarityIcons[getRarityLabel(card.rarity)];
  rIcon.className = `${isSmall ? 'h-5' : 'h-8'} absolute top-1 left-1 w-auto drop-shadow-md z-10`;
  imgContainer.appendChild(rIcon);
  
  let tk = card.type.toLowerCase() === 'intelligence' ? 'wit' : card.type.toLowerCase();
  const tIcon = document.createElement('img');
  tIcon.src = typeIcons[tk] || '';
  tIcon.className = `${isSmall ? 'h-5' : 'h-8'} absolute top-1 right-1 w-auto drop-shadow-md`;
  imgContainer.appendChild(tIcon);
  
  const nameOverlay = document.createElement('div');
  nameOverlay.className = `absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent text-white ${isSmall ? 'text-[8px] pt-2 pb-0.5' : 'text-[10px] pt-4 pb-1'} text-center truncate px-2 font-semibold`;
  nameOverlay.innerText = card.char_name;
  imgContainer.appendChild(nameOverlay);
  container.appendChild(imgContainer);

  if (mode === 'full') {
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
    if (currentView === 'collection' && owned) { container.appendChild(createLBDisplay(id, lb)); }
  }

  if (mode === 'deck-slot' || mode === 'deck-source') {
    const lbContainer = document.createElement('div');
    lbContainer.className = "flex justify-center gap-0.5 py-0.5 bg-black/40 rounded-lg mt-0.5";
    for (let i = 1; i <= 4; i++) {
      const star = document.createElement('span');
      star.innerHTML = '★';
      star.className = `text-[8px] ${i <= lb ? 'text-yellow-400' : 'text-gray-600'}`;
      lbContainer.appendChild(star);
    }
    container.appendChild(lbContainer);
    if (mode === 'deck-slot') {
      container.onclick = () => {
        const idx = deck.indexOf(id);
        if (idx !== -1) deck[idx] = null;
        saveDeck();
        renderDeck();
      };
    }
  }
  return container;
}

function createLBDisplay(id, lb) {
  const lbContainer = document.createElement('div');
  lbContainer.className = "flex items-center justify-between bg-gray-800/50 rounded-xl p-1 border border-white/5";
  const decBtn = document.createElement('button');
  decBtn.innerHTML = "−";
  decBtn.className = "w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-lg";
  decBtn.onclick = (e) => { e.stopPropagation(); changeLB(id, -1); renderAll(); };
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
  incBtn.onclick = (e) => { e.stopPropagation(); changeLB(id, 1); renderAll(); };
  lbContainer.append(decBtn, stars, incBtn);
  return lbContainer;
}

function renderDeck() {
  const slots = document.querySelectorAll('.deck-slot');
  slots.forEach((slot, idx) => {
    slot.innerHTML = '';
    const cardId = deck[idx];
    if (cardId) {
      const card = cardsData.find(c => c.support_id.toString() === cardId);
      if (card) {
        slot.appendChild(createCardElement(card, 'deck-slot'));
        slot.classList.remove('border-dashed', 'border-white/5');
      }
    } else {
      slot.classList.add('border-dashed', 'border-white/5');
    }
    slot.ondragover = (e) => e.preventDefault();
    slot.ondrop = (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      if (deck.includes(id)) return;
      deck[idx] = id;
      saveDeck();
      renderDeck();
    };
  });
}

function renderAll() {
  const mainP = document.getElementById('mainPage');
  const collG = document.getElementById('collectionGrid');
  const dSrc = document.getElementById('deckSourceList');
  const tools = document.getElementById('collection-tools');
  
  updateToggleButton(currentView);
  
  const s = document.getElementById('search').value.toLowerCase();
  const r = document.getElementById('rarityFilter').value;
  const t = document.getElementById('typeFilter').value;
  
  let list = cardsData.filter(c => {
    const nMatch = c.char_name.toLowerCase().includes(s);
    const rMatch = !r || getRarityLabel(c.rarity) === r;
    let tk = c.type.toLowerCase() === 'intelligence' ? 'wit' : c.type.toLowerCase();
    const tMatch = !t || tk === t.toLowerCase();
    const gMatch = !onlyGlobal || c.release_en !== undefined;
    return nMatch && rMatch && tMatch && gMatch;
  }).sort((a, b) => b.support_id - a.support_id);

  if (currentView === 'main') {
    tools.classList.add('hidden');
    mainP.innerHTML = '';
    list.forEach(c => mainP.appendChild(createCardElement(c, 'full')));
  } else if (currentView === 'collection') {
    tools.classList.remove('hidden');
    collG.innerHTML = '';
    const collList = list.filter(c => collection.some(col => col.id === c.support_id.toString()));
    collList.forEach(c => collG.appendChild(createCardElement(c, 'full')));
  } else if (currentView === 'deck') {
    tools.classList.add('hidden');
    dSrc.innerHTML = '';
    const collList = list.filter(c => collection.some(col => col.id === c.support_id.toString()));
    collList.forEach(c => dSrc.appendChild(createCardElement(c, 'deck-source')));
    renderDeck();
  }
}

axios.get('https://gametora.com/data/umamusume/support-cards.d1db8dd7.json')
  .then(res => { cardsData = res.data; checkURLImport(); updateStats(); renderAll(); })
  .catch(err => console.error(err));

document.getElementById('toggle-view').onclick = () => {
  const m = document.getElementById('mainPage');
  const c = document.getElementById('collectionPage');
  const d = document.getElementById('deckPage');
  if (currentView === 'main') {
    currentView = 'collection';
    m.classList.add('hidden');
    c.classList.remove('hidden');
    d.classList.add('hidden');
  } else {
    currentView = 'main';
    m.classList.remove('hidden');
    c.classList.add('hidden');
    d.classList.add('hidden');
  }
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.getElementById('toggle-deck').onclick = () => {
  const m = document.getElementById('mainPage');
  const c = document.getElementById('collectionPage');
  const d = document.getElementById('deckPage');
  if (currentView !== 'deck') {
    currentView = 'deck';
    m.classList.add('hidden');
    c.classList.add('hidden');
    d.classList.remove('hidden');
  } else {
    currentView = 'collection';
    c.classList.remove('hidden');
    d.classList.add('hidden');
  }
  renderAll();
};

document.getElementById('clear-deck').onclick = () => {
  deck = [null,null,null,null,null,null];
  saveDeck();
  renderDeck();
};

const modal = document.getElementById('confirm-modal');
document.getElementById('open-reset-modal').onclick = () => modal.classList.remove('hidden');
document.getElementById('cancel-reset').onclick = () => modal.classList.add('hidden');
document.getElementById('confirm-reset').onclick = () => {
  collection = [];
  deck = [null,null,null,null,null,null];
  saveCollection();
  saveDeck();
  modal.classList.add('hidden');
  renderAll();
  showToast("Tout a été réinitialisé", 'error');
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
backToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

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