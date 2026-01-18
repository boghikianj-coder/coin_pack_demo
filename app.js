/* $2 Coin Packs — Demo (localStorage)
   - Single-page flow
   - Deterministic outcomes
   - Vault persists locally
   - No accounts, no backend, no payments
*/

"use strict";
let openingFinished = false;
let waitingForFlip = false;
let flipHandlerBound = false;

// ---------- SEASON COIN POOL (16 coins) ----------
// Image convention (recommended): put your PNGs in /coins and name them exactly like the coin id.
// Example: coins/C2024_WARANIMALS.png
const COINS = [
  // Legendary
  { id: "L2012_POPPY", year: 2012, name: "Red Poppy (Remembrance)", theme: "Remembrance", rarity: "Legendary", estValue: 280.00, imgHeads: "coins/L2012_POPPY.png" },

  // Ultra Rare
  { id: "UR2013_CORONATION", year: 2013, name: "Coronation (Purple)", theme: "Royal Coronation", rarity: "Ultra Rare", estValue: 65.00, imgHeads: "coins/UR2013_CORONATION.png" },
  { id: "UR2014_DOVE", year: 2014, name: "Green Dove", theme: "Remembrance", rarity: "Ultra Rare", estValue: 40.00, imgHeads: "coins/UR2014_DOVE.png" },

  // Rare
  { id: "R2016_CHANGEOVER", year: 2016, name: "Decimal Changeover", theme: "Changeover", rarity: "Rare", estValue: 30.00, imgHeads: "coins/R2016_CHANGEOVER.png" },
  { id: "R2015_ANZAC", year: 2015, name: "ANZAC War Graves", theme: "ANZAC", rarity: "Rare", estValue: 19.00, imgHeads: "coins/R2015_ANZAC.png" },
  { id: "R2018_ARMISTICE", year: 2018, name: "Armistice Poppy", theme: "Remembrance", rarity: "Rare", estValue: 15.00, imgHeads: "coins/R2018_ARMISTICE.png" },

  // Uncommon
  { id: "UC2017_MOSAIC", year: 2017, name: "War Memorial Mosaic", theme: "Remembrance", rarity: "Uncommon", estValue: 10.00, imgHeads: "coins/UC2017_MOSAIC.png" },
  { id: "UC2021_ABORIGINAL", year: 2021, name: "Aboriginal Flag 50th Anniversary", theme: "Indigenous", rarity: "Uncommon", estValue: 9.00, imgHeads: "coins/UC2021_ABORIGINAL.png" },
  { id: "UC2018_FLAME", year: 2018, name: "Eternal Flame", theme: "Remembrance", rarity: "Uncommon", estValue: 9.00, imgHeads: "coins/UC2018_FLAME.png" },
  { id: "UC2022_BEE", year: 2022, name: "Honey Bee", theme: "Nature", rarity: "Uncommon", estValue: 11.00, imgHeads: "coins/UC2022_BEE.png" },
  { id: "UC2017_ROSEMARY", year: 2017, name: "Rosemary", theme: "Remembrance", rarity: "Uncommon", estValue: 12.50, imgHeads: "coins/UC2017_ROSEMARY.png" },

  // Common
  { id: "C2024_WARANIMALS", year: 2024, name: "War Animals Purple Poppy", theme: "Remembrance", rarity: "Common", estValue: 6.50, imgHeads: "coins/C2024_WARANIMALS.png" },
  { id: "C2021_IMS", year: 2021, name: "Indigenous Military Service", theme: "Military", rarity: "Common", estValue: 6.00, imgHeads: "coins/C2021_IMS.png" },
  { id: "C2022_PEACEKEEPING", year: 2022, name: "Peacekeeping", theme: "Military", rarity: "Common", estValue: 6.00, imgHeads: "coins/C2022_PEACEKEEPING.png" },
  { id: "C2025_TSIFLAG", year: 2025, name: "T.S.I. Flag", theme: "Indigenous", rarity: "Common", estValue: 6.00, imgHeads: "coins/C2025_TSIFLAG.png" },
  { id: "C2019_POLICE", year: 2019, name: "Police Remembrance", theme: "Services", rarity: "Common", estValue: 8.00, imgHeads: "coins/C2019_POLICE.png" },
];

// Tier odds disclosure (demo UI only)
const TIER_ODDS = [
  { tier: "Legendary", note: "Time-varying (demo placeholder)", odds: "~1 in 500" },
  { tier: "Ultra Rare", note: "Fixed odds per season", odds: "~1 in 40" },
  { tier: "Rare", note: "Fixed odds per season", odds: "~1 in 12" },
  { tier: "Uncommon", note: "Fixed odds per season", odds: "~1 in 5" },
  { tier: "Common", note: "Remainder", odds: "Most packs" },
];

// Deterministic outcomes: cycle through this list forever.
// (You can make this match your real odds distribution later.)
// ---------- SHORT DEMO OUTCOMES (NO DUPLICATES) ----------
const OUTCOMES = [
  // Common
  "C2024_WARANIMALS",
  "C2021_IMS",
  "C2022_PEACEKEEPING",
  "C2025_TSIFLAG",
  "C2019_POLICE",

  // Uncommon
  "UC2017_MOSAIC",
  "UC2018_FLAME",
  "UC2022_BEE",
  "UC2017_ROSEMARY",
  "UC2021_ABORIGINAL",

  // Rare
  "R2016_CHANGEOVER",
  "R2015_ANZAC",
  "R2018_ARMISTICE",

  // Ultra Rare
  "UR2013_CORONATION",
  "UR2014_DOVE",

  // Legendary (last, for impact)
  "L2012_POPPY"
];


// ---------- Storage keys ----------
const LS_KEY = "coinpacks_demo_vault_v1";

// ---------- State ----------
let appState = {
  screen: "landing",
  packsOpened: 0,
  holdings: {}, // coinId -> qty
  soundOn: false,
  pendingCoinId: null, // coin being revealed during opening
};

// ---------- Helpers ----------
function $(id){ return document.getElementById(id); }

function money(n){
  return `$${Number(n).toFixed(2)}`;
}

function rarityColor(r){
  switch(r){
    case "Legendary": return "var(--legendary)";
    case "Ultra Rare": return "var(--ultra)";
    case "Rare": return "var(--rare)";
    case "Uncommon": return "var(--uncommon)";
    default: return "var(--common)";
  }
}

function load(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return;
    const parsed = JSON.parse(raw);
    if(typeof parsed?.packsOpened === "number") appState.packsOpened = parsed.packsOpened;
    if(parsed?.holdings && typeof parsed.holdings === "object") appState.holdings = parsed.holdings;
  }catch(e){
    // ignore
  }
}

function save(){
  localStorage.setItem(LS_KEY, JSON.stringify({
    packsOpened: appState.packsOpened,
    holdings: appState.holdings,
  }));
}

function resetAll(){
  localStorage.removeItem(LS_KEY);
  appState.packsOpened = 0;
  appState.holdings = {};
  appState.pendingCoinId = null;
  save();
  renderAll();
  showScreen("landing");
}

function getCoinById(id){
  return COINS.find(c => c.id === id) || null;
}

// ---------- Coin image helpers ----------
function coinImg(coinId, side) {
  const c = getCoinById(coinId);

  // HEADS = generic obverse
  if (side === "heads") return "coin-heads.png";

  // TAILS = real commemorative image
  return c?.imgHeads || "coin-tails.png";
}


function setRevealCoinImages(coinId){
  const coin = $("coin");
  if(!coin) return;
  const frontImg = coin.querySelector(".faceFront img");
  const backImg  = coin.querySelector(".faceBack img");
  if(frontImg) frontImg.src = coinImg(coinId, "heads");
  if(backImg)  backImg.src  = coinImg(coinId, "tails");
}

function totalUniqueOwned(){
  return Object.keys(appState.holdings).filter(k => appState.holdings[k] > 0).length;
}

function totalCoinPoolCount(){
  // Unique coins in season pool
  return COINS.length;
}

function totalValue(){
  let sum = 0;
  for(const [coinId, qty] of Object.entries(appState.holdings)){
    const coin = getCoinById(coinId);
    if(!coin) continue;
    sum += coin.estValue * qty;
  }
  return sum;
}

function liquidityValue(){
  return totalValue() * 0.9;
}

function nextOutcomeCoinId(){
  // deterministic by packsOpened index
  const idx = appState.packsOpened % OUTCOMES.length;
  return OUTCOMES[idx];
}

// ---------- Navigation ----------
function showScreen(name){
  appState.screen = name;

  const screens = [
    "screenLanding",
    "screenSeason",
    "screenConfirm",
    "screenOpening",
    "screenVault"
  ];

  screens.forEach(id => $(id).classList.add("hidden"));

  switch(name){
    case "landing": $("screenLanding").classList.remove("hidden"); break;
    case "season": $("screenSeason").classList.remove("hidden"); break;
    case "confirm": $("screenConfirm").classList.remove("hidden"); break;
    case "opening": $("screenOpening").classList.remove("hidden"); break;
    case "vault": $("screenVault").classList.remove("hidden"); break;
    default: $("screenLanding").classList.remove("hidden");
  }

  // render bits that depend on screen
  renderAll();
}

// ---------- Rendering ----------
function renderStats(){
  $("statPacksOpened").textContent = String(appState.packsOpened);
  $("statCollection").textContent = `${totalUniqueOwned()} / ${totalCoinPoolCount()}`;
  $("statValue").textContent = money(totalValue());
}

function renderOdds(){
  const el = $("oddsTable");
  el.innerHTML = "";
  TIER_ODDS.forEach(row => {
    const wrap = document.createElement("div");
    wrap.className = "oddsRow";

    const name = document.createElement("div");
    name.className = "oddsName";
    const left = document.createElement("div");
    left.textContent = row.tier;
    left.style.fontWeight = "1000";
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = row.note;
    badge.style.borderColor = "rgba(255,255,255,0.14)";

    name.appendChild(left);
    name.appendChild(badge);

    const val = document.createElement("div");
    val.className = "oddsVal";
    val.textContent = row.odds;

    el.appendChild(name);
    el.appendChild(val);
  });
}

function renderCoinPool(){
  const el = $("coinPool");
  el.innerHTML = "";
  // Sort by rarity order then value
  const order = {"Legendary":0,"Ultra Rare":1,"Rare":2,"Uncommon":3,"Common":4};
  const sorted = [...COINS].sort((a,b)=>{
    const da = order[a.rarity] ?? 9;
    const db = order[b.rarity] ?? 9;
    if(da !== db) return da - db;
    return (b.estValue - a.estValue);
  });

  sorted.forEach(c => {
    const row = document.createElement("div");
    row.className = "coinPoolItem";

    const left = document.createElement("div");
    left.className = "coinPoolLeft";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = c.name;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${c.year} • ${c.theme}`;
    left.appendChild(name);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "coinPoolRight";
    const val = document.createElement("div");
    val.className = "value";
    val.textContent = money(c.estValue);
    const rar = document.createElement("div");
    rar.className = "rar";
    rar.textContent = c.rarity;
    rar.style.color = rarityColor(c.rarity);
    right.appendChild(val);
    right.appendChild(rar);

    row.appendChild(left);
    row.appendChild(right);
    el.appendChild(row);
  });
}

function renderConfirm(){
  $("confirmPackNumber").textContent = String(appState.packsOpened + 1);
}

function renderOpeningHeader(){
  $("openingPackNumber").textContent = String(appState.packsOpened + 1);
}

function renderVault(){
  const uniqueOwned = totalUniqueOwned();
  const total = totalCoinPoolCount();
  const pct = total === 0 ? 0 : Math.round((uniqueOwned / total) * 100);

  $("vaultCompletion").textContent = `${uniqueOwned}/${total} (${pct}%)`;
  $("vaultTotalValue").textContent = money(totalValue());
  $("vaultLiquidity").textContent = money(liquidityValue());
  const fill = $("vaultProgressFill");
  if (fill) fill.style.width = `${pct}%`;

  const container = $("vaultSections");
  container.innerHTML = "";

  const rarityOrder = ["Legendary", "Ultra Rare", "Rare", "Uncommon", "Common"];
  const byRarity = {};
  rarityOrder.forEach(r => byRarity[r] = []);
  COINS.forEach(c => {
    if(!byRarity[c.rarity]) byRarity[c.rarity] = [];
    byRarity[c.rarity].push(c);
  });

  // Legendary empty slot always visible:
  // If Legendary list is empty (shouldn't be), create a placeholder.
  if(byRarity["Legendary"].length === 0){
    byRarity["Legendary"].push({ id:"LEGENDARY_PLACEHOLDER", year:"—", name:"Legendary Slot", theme:"—", rarity:"Legendary", estValue:0 });
  }

  rarityOrder.forEach(r => {
    const coins = (byRarity[r] || []).slice().sort((a,b)=>b.estValue - a.estValue);

    const section = document.createElement("div");
    section.className = `section tray-${r.toLowerCase().replace(" ", "-")}`;

    const head = document.createElement("div");
    head.className = "sectionHead";

    const title = document.createElement("div");
    title.className = "sectionTitle";
    const dot = document.createElement("span");
    dot.textContent = "●";
    dot.style.color = rarityColor(r);
    dot.style.fontSize = "12px";
    title.appendChild(dot);
    const t = document.createElement("span");
    t.textContent = r;
    title.appendChild(t);

    const count = document.createElement("div");
    count.className = "sectionCount";
    const ownedInTier = coins.reduce((acc,c)=> acc + (appState.holdings[c.id] || 0), 0);
    count.textContent = `${ownedInTier} owned`;

    head.appendChild(title);
    head.appendChild(count);

    const grid = document.createElement("div");
    grid.className = "slotGrid";

    coins.forEach(c => {
      const qty = appState.holdings[c.id] || 0;
      const slot = document.createElement("div");
      slot.className = "slot" + (qty === 0 ? " empty" : "");
      slot.dataset.coinId = c.id;
      const ownedQty = qty;

      if (ownedQty > 0) {
        const img = document.createElement("img");
        img.className = "coinImg";
        // Vault thumbnails should show the commemorative (tails) side.
        // Your real coin art is stored per-coin in the coin entry (imgTails preferred, otherwise imgHeads).
        img.src = c.imgTails || c.imgHeads || "coin-tails.png";
        img.alt = c.name || "Coin";
        img.onerror = () => { img.onerror = null; img.src = "coin-tails.png"; };
        slot.appendChild(img);
      } else {
        slot.classList.add("empty");
      }
      const top = document.createElement("div");
      top.className = "slotTop";

      const left = document.createElement("div");
      const nm = document.createElement("div");
      nm.className = "slotName";
      nm.textContent = c.name;
      const meta = document.createElement("div");
      meta.className = "slotMeta";
      meta.textContent = `${c.year} • ${c.theme}`;
      left.appendChild(nm);
      left.appendChild(meta);

      const qtyPill = document.createElement("div");
      qtyPill.className = "slotQty";
      if (qty === 0) {
        qtyPill.textContent = "";
        qtyPill.style.display = "none";
      } else {
        qtyPill.style.display = "inline-flex";
        qtyPill.textContent = `x${qty}`;
      }

      top.appendChild(left);
      top.appendChild(qtyPill);

      const bottom = document.createElement("div");
      bottom.className = "slotMeta";
      if (qty === 0) {
        bottom.textContent = (c.rarity === "Legendary")
          ? "Not yet collected"
          : "Not owned";
      } else {
        bottom.textContent = `Est. ${money(c.estValue)} each`;
      }

      bottom.style.marginTop = "10px";

      slot.appendChild(top);
      slot.appendChild(bottom);

      if(qty > 0){
        slot.style.borderColor = "rgba(255,255,255,0.20)";
        slot.style.background = "rgba(255,255,255,0.05)";
      }

      slot.addEventListener("click", () => {
        if(qty === 0) return; // only open detail if owned (keeps demo clean)
        openCoinModal(c.id);
      });

      grid.appendChild(slot);
    });

    section.appendChild(head);
    section.appendChild(grid);

    container.appendChild(section);
  });
}

function renderAll(){
  renderStats();
  renderConfirm();
  renderOpeningHeader();
  renderOdds();
  renderCoinPool();
  renderVault();
  $("btnSound").textContent = `Sound: ${appState.soundOn ? "On" : "Off"}`;
}

// ---------- Modal ----------
function openCoinModal(coinId){
  const coin = getCoinById(coinId);
  if(!coin) return;

  $("modalTitle").textContent = coin.name;
  $("modalYear").textContent = String(coin.year);
  $("modalTheme").textContent = coin.theme;
  $("modalRarity").textContent = coin.rarity;
  $("modalRarity").style.color = rarityColor(coin.rarity);
  $("modalValue").textContent = money(coin.estValue);
  $("modalOwned").textContent = String(appState.holdings[coinId] || 0);

  $("modal").classList.remove("hidden");
}

function closeCoinModal(){
  $("modal").classList.add("hidden");
}

// ---------- Pack opening animation ----------
let openingLock = false;

function clearOpeningStage(){
  const pack = $("pack");
    // Ensure pack is visible again for the next opening
  pack.style.display = "";
  pack.style.opacity = "";
  pack.style.transform = "";
  const coin = $("coin");
  const banner = $("rarityBanner");
  const meta = $("meta");

  // Always allow reset (never "lock out" future animations)
  openingFinished = false;
  waitingForFlip = false;

  // Reset pack state
  pack.classList.remove("tearing", "torn", "opened", "gone", "shake", "release");

  // Reset coin state
  coin.style.opacity = "";
  coin.style.transform = "";
  coin.style.cursor = "";
  coin.title = "";
  coin.classList.add("hidden");
  coin.classList.remove("showHeads", "rarityOn", "rotate");

  // Reset UI
  banner.classList.add("hidden");
  meta.classList.add("hidden");
  meta.classList.remove("show");

  const ring = $("coinRing");
  if (ring) ring.style.borderColor = "rgba(255,255,255,0.12)";

  const pill = $("rarityPill");
  if (pill){
    pill.textContent = "";
    pill.style.borderColor = "rgba(255,255,255,0.12)";
    pill.style.boxShadow = "";
  }

  const hint = $("flipHint");
  if (hint){
    hint.classList.remove("show");
    hint.classList.add("hidden");
  }
}

function armClickToFlip(){
  waitingForFlip = true;

  const coin = $("coin");
  const stage = document.querySelector(".stage");

  // Show hint every time we arm the flip
  const hint = $("flipHint");
  if (hint) {
    hint.classList.remove("hidden");
    hint.classList.add("show");
  }

  // Visual hint
  coin.style.cursor = "pointer";
  coin.title = "Click to flip";

  if (flipHandlerBound) return;
  flipHandlerBound = true;

  const onFlipClick = () => {
    if (!waitingForFlip) return;
    waitingForFlip = false;

    // Hide hint immediately on interaction
    const hint = $("flipHint");
    if (hint) {
      hint.classList.remove("show");
      hint.classList.add("hidden");
    }

    // Trigger flip + wobble
    coin.classList.add("rotate");

    // After flip finishes, reveal metadata
    setTimeout(() => {
      showMetadataForPendingCoin();
    }, 1200);
  };

  coin.addEventListener("click", onFlipClick);
  stage.addEventListener("click", onFlipClick);
}

function showMetadataForPendingCoin(){
  const coinId = appState.pendingCoinId;
  const coinData = getCoinById(coinId);
  if(!coinData) return;

  const meta = $("meta");
  meta.classList.remove("hidden");
  meta.classList.add("show");

  $("metaTitle").textContent = coinData.name;
  $("metaRarity").textContent = coinData.rarity;
  $("metaRarity").style.borderColor = rarityColor(coinData.rarity);
  $("metaTheme").textContent = coinData.theme;
  $("metaYear").textContent = String(coinData.year);
  $("metaValue").textContent = money(coinData.estValue);

  openingFinished = true;
  openingLock = false;

  // Remove hint
  const coin = $("coin");
  coin.style.cursor = "";
  coin.title = "";
}


function playClick(){
  if(!appState.soundOn) return;
  // Minimal WebAudio click (no external files)
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = 520;
    g.gain.value = 0.03;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.03);
  }catch(e){}
}

function startOpeningSequence(){
  openingFinished = false;
  if(openingLock) return;
  openingLock = true;

  clearOpeningStage();

  // Decide the result for this pack (deterministic)
  const coinId = nextOutcomeCoinId();
  appState.pendingCoinId = coinId;

  const coinData = getCoinById(coinId);
  if(!coinData){
    openingLock = false;
    alert("Demo error: missing coin data for " + coinId);
    return;
  }

  const pack = $("pack");
  const coin = $("coin");
  const banner = $("rarityBanner");

  // Ensure the correct coin art is loaded for this reveal (no animation/tear changes)
  setRevealCoinImages(coinId);

  // PHASE 1: Pack Tear (slower)
  pack.classList.add("tearing");
  playClick(); // seal snap

  // Tear duration must match CSS (700ms)
  setTimeout(() => {
    // Freeze the torn state so halves don't snap shut
    pack.classList.add("torn");
    pack.classList.remove("tearing");
    pack.classList.add("opened");

    // PHASE 2: Coin Appears (Heads) - slightly delayed so tear feels finished
    setTimeout(() => {
      coin.classList.remove("hidden");
      coin.classList.add("showHeads");
      playClick();

      // Fade pack away after coin establishes (prevents pack art lingering)
      setTimeout(() => {
        pack.classList.add("gone");

        // After the fade completes, remove it from layout entirely
        setTimeout(() => {
          pack.style.display = "none";
        }, 450);
      }, 350);

      // PHASE 3: Rarity reveal
      setTimeout(() => {
        const col = rarityColor(coinData.rarity);
        $("coinRing").style.borderColor = col;
        coin.classList.add("rarityOn");

        banner.classList.remove("hidden");
        $("rarityPill").textContent = coinData.rarity.toUpperCase();
        $("rarityPill").style.borderColor = col;
        $("rarityPill").style.boxShadow = `0 0 30px ${col}33`;

        playClick();
        armClickToFlip();
      }, 520);

      openingLock = false;
    }, 180);

  }, 700);
}



function skipOpening(){
  if(openingLock){
    // If mid-animation, just fast-forward to end state (safe and simple)
    openingLock = false;
  }
  const coinId = appState.pendingCoinId ?? nextOutcomeCoinId();
  const coinData = getCoinById(coinId);
  if(!coinData) return;

  // Ensure the correct coin art is loaded for this reveal
  setRevealCoinImages(coinId);

  clearOpeningStage();

  const col = rarityColor(coinData.rarity);

  const pack = $("pack");
  pack.classList.remove("tearing");
  pack.classList.add("opened");

  const coin = $("coin");
  coin.classList.remove("hidden");
  coin.style.opacity = "1";
  coin.style.transform = "translateX(-50%) translateY(160px)";
  $("coinRing").style.borderColor = col;
  coin.classList.add("rarityOn");

  $("rarityBanner").classList.remove("hidden");
  $("rarityPill").textContent = coinData.rarity.toUpperCase();
  $("rarityPill").style.borderColor = col;

  const meta = $("meta");
  meta.classList.remove("hidden");
  meta.classList.add("show");
  $("metaTitle").textContent = coinData.name;
  $("metaRarity").textContent = coinData.rarity;
  $("metaRarity").style.borderColor = col;
  $("metaTheme").textContent = coinData.theme;
  $("metaYear").textContent = String(coinData.year);
  $("metaValue").textContent = money(coinData.estValue);
}

// ---------- Vault actions ----------
function addPendingToVault(){
  const coinId = appState.pendingCoinId;
  if(!coinId) return;

  // Count pack as opened (important: increment before nextOutcomeCoinId changes)
  appState.packsOpened += 1;

  // Add coin
  appState.holdings[coinId] = (appState.holdings[coinId] || 0) + 1;

  // Clear pending
  appState.pendingCoinId = null;

  save();
  renderAll();
}

// ---------- Event wiring ----------
function wireEvents(){
  // Top nav
  $("btnNavSeason").addEventListener("click", () => showScreen("season"));
  $("btnNavVault").addEventListener("click", () => showScreen("vault"));
  $("btnReset").addEventListener("click", resetAll);

  // Landing
  $("btnStart").addEventListener("click", () => showScreen("confirm"));
  $("btnLearn").addEventListener("click", () => showScreen("season"));

  // Season
  $("btnSeasonToConfirm").addEventListener("click", () => showScreen("confirm"));
  $("btnSeasonBack").addEventListener("click", () => showScreen("landing"));

  // Confirm
  $("btnConfirmOpen").addEventListener("click", () => {
    showScreen("opening");
    // small delay so screen renders before animation begins
    setTimeout(startOpeningSequence, 50);
  });
  $("btnConfirmBack").addEventListener("click", () => showScreen("season"));

  // Opening controls
  $("btnSound").addEventListener("click", () => {
    appState.soundOn = !appState.soundOn;
    $("btnSound").textContent = `Sound: ${appState.soundOn ? "On" : "Off"}`;
  });
  $("btnSkip").addEventListener("click", skipOpening);

  $("btnAddToVault").addEventListener("click", () => {
    addPendingToVault();
    showScreen("vault");
  });

  $("btnViewVaultNow").addEventListener("click", () => {
    // If they view vault without adding, keep coin pending (demo choice),
    // but it will not be counted as opened until they "Add to Vault".
    showScreen("vault");
  });

  // Vault
  $("btnVaultOpenNext").addEventListener("click", () => showScreen("confirm"));
  $("btnVaultBack").addEventListener("click", () => showScreen("landing"));

  // Modal
  $("btnModalClose").addEventListener("click", closeCoinModal);
  $("modalBackdrop").addEventListener("click", closeCoinModal);
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") closeCoinModal();
  });
}

// ---------- Init ----------
function init(){
  load();
  wireEvents();
  renderAll();
  showScreen("landing");
}

init();
