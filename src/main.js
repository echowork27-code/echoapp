// EchoApp - TON Ecosystem Aggregator
// Portals-inspired UI with real NFT data

import { TonConnectUI } from '@tonconnect/ui';
import * as api from './api.js';

// ==================== TELEGRAM INIT ====================
const tg = window.Telegram?.WebApp;
let tgUser = null;

function initTelegram() {
  if (!tg) {
    console.log('Not running in Telegram');
    return;
  }
  
  tg.ready();
  tg.expand();
  
  tgUser = tg.initDataUnsafe?.user;
  console.log('Telegram user:', tgUser);
  
  if (tgUser?.photo_url) {
    document.getElementById('nav-avatar').src = tgUser.photo_url;
  }
  
  if (tg.colorScheme === 'light') {
    setTheme('light');
  } else {
    setTheme('dark');
  }
  
  tg.enableClosingConfirmation();
}

// ==================== THEME MANAGEMENT ====================
function getStoredTheme() {
  return localStorage.getItem('echoapp-theme') || 'dark';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('echoapp-theme', theme);
  
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.content = theme === 'dark' ? '#000000' : '#ffffff';
  }
  
  if (tg) {
    const bgColor = theme === 'dark' ? '#000000' : '#ffffff';
    tg.setHeaderColor(bgColor);
    tg.setBackgroundColor(bgColor);
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  haptic('light');
}

// ==================== HAPTIC FEEDBACK ====================
function haptic(type = 'light') {
  if (tg?.HapticFeedback) {
    if (type === 'selection') {
      tg.HapticFeedback.selectionChanged();
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  }
}

// ==================== TON CONNECT ====================
let tonConnectUI = null;
let walletAddress = null;

async function initTonConnect() {
  try {
    tonConnectUI = new TonConnectUI({
      manifestUrl: 'https://echowork27-code.github.io/echoapp/tonconnect-manifest.json',
      buttonRootId: null
    });
    
    const wallet = tonConnectUI.wallet;
    if (wallet) {
      onWalletConnected(wallet);
    }
    
    tonConnectUI.onStatusChange((wallet) => {
      if (wallet) {
        onWalletConnected(wallet);
      } else {
        onWalletDisconnected();
      }
    });
    
    console.log('TonConnect initialized');
  } catch (error) {
    console.error('TonConnect init error:', error);
  }
}

async function onWalletConnected(wallet) {
  walletAddress = wallet.account.address;
  const shortAddr = formatAddress(walletAddress);
  
  const walletBtn = document.getElementById('wallet-btn');
  const walletText = document.getElementById('wallet-text');
  walletBtn.classList.remove('connect');
  walletText.textContent = shortAddr;
  
  // Fetch real balance
  const balanceData = await api.getWalletBalance(walletAddress);
  if (balanceData) {
    walletText.textContent = `${balanceData.balance} TON`;
  }
  
  // Load user NFTs
  loadUserNfts();
  
  console.log('Wallet connected:', walletAddress);
  haptic('medium');
}

function onWalletDisconnected() {
  walletAddress = null;
  
  const walletBtn = document.getElementById('wallet-btn');
  const walletText = document.getElementById('wallet-text');
  walletBtn.classList.add('connect');
  walletText.textContent = 'Connect';
  
  document.getElementById('points-value').textContent = '0';
  
  // Clear user NFTs
  const giftsGrid = document.querySelector('#page-gifts .content');
  if (giftsGrid) {
    giftsGrid.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">🎁</div>
        <div class="placeholder-text">Connect wallet to see your gifts</div>
      </div>
    `;
  }
  
  console.log('Wallet disconnected');
}

function formatAddress(address) {
  if (!address) return '';
  const addr = address.toString();
  return addr.slice(0, 4) + '...' + addr.slice(-4);
}

async function handleWalletClick() {
  if (!tonConnectUI) return;
  haptic('medium');
  
  if (walletAddress) {
    tonConnectUI.disconnect();
  } else {
    tonConnectUI.openModal();
  }
}

// ==================== NFT RENDERING ====================

function renderNftCard(nft, index) {
  return `
    <div class="nft-card" data-bg="${nft.color || 'blue'}" data-address="${nft.address}">
      <div class="nft-image-wrapper">
        ${nft.image 
          ? `<img class="nft-image" src="${nft.image}" alt="${nft.name}" loading="lazy" onerror="this.style.display='none'">`
          : `<div class="nft-image" style="font-size: 64px;">🖼️</div>`
        }
      </div>
      <div class="nft-info">
        <div class="nft-name">${nft.name}</div>
        <div class="nft-number">${nft.collectionName || '#' + (nft.index || index)}</div>
        <div class="nft-actions">
          <button class="price-btn">
            <span class="ton-icon-white"></span>
            <span>${nft.price || 'View'}</span>
          </button>
          <button class="cart-btn">🛒</button>
        </div>
      </div>
    </div>
  `;
}

function renderCollectionItem(collection) {
  return `
    <li class="collection-item" data-address="${collection.address}">
      <div class="collection-checkbox"></div>
      <div class="collection-icon">
        ${collection.image 
          ? `<img src="${collection.image}" alt="${collection.name}" onerror="this.parentElement.textContent='🖼️'">`
          : '🖼️'
        }
      </div>
      <div class="collection-info">
        <div class="collection-name">${collection.name}</div>
        <div class="collection-meta">${collection.itemCount || 0} items</div>
      </div>
      <div class="collection-stats">
        <div class="collection-price">—</div>
        <div class="collection-volume">${collection.marketplace || ''}</div>
      </div>
    </li>
  `;
}

function renderLoading() {
  return `
    <div class="placeholder">
      <div class="placeholder-icon">⏳</div>
      <div class="placeholder-text">Loading...</div>
    </div>
  `;
}

// ==================== DATA LOADING ====================

let allCollections = [];
let selectedCollections = [];

async function loadNfts() {
  const grid = document.getElementById('nft-grid');
  grid.innerHTML = renderLoading();
  
  try {
    // Get featured NFTs from top collections
    const nfts = await api.getFeaturedNfts();
    
    if (nfts.length === 0) {
      grid.innerHTML = `
        <div class="placeholder" style="grid-column: 1/-1;">
          <div class="placeholder-icon">🔍</div>
          <div class="placeholder-text">No NFTs found</div>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = nfts.map((nft, i) => renderNftCard(nft, i)).join('');
    
    // Add click handlers
    initNftCardHandlers();
    
  } catch (error) {
    console.error('Failed to load NFTs:', error);
    grid.innerHTML = `
      <div class="placeholder" style="grid-column: 1/-1;">
        <div class="placeholder-icon">⚠️</div>
        <div class="placeholder-text">Failed to load NFTs</div>
      </div>
    `;
  }
}

async function loadCollections() {
  const list = document.getElementById('collection-list');
  list.innerHTML = '<li style="padding: 20px; text-align: center; color: var(--text-tertiary);">Loading...</li>';
  
  try {
    allCollections = await api.getTopCollections(20);
    
    if (allCollections.length === 0) {
      list.innerHTML = '<li style="padding: 20px; text-align: center; color: var(--text-tertiary);">No collections found</li>';
      return;
    }
    
    list.innerHTML = allCollections.map(col => renderCollectionItem(col)).join('');
    
    // Add click handlers
    document.querySelectorAll('.collection-item').forEach(item => {
      item.addEventListener('click', () => {
        item.classList.toggle('selected');
        haptic('selection');
      });
    });
    
  } catch (error) {
    console.error('Failed to load collections:', error);
    list.innerHTML = '<li style="padding: 20px; text-align: center; color: var(--text-tertiary);">Failed to load</li>';
  }
}

async function loadUserNfts() {
  if (!walletAddress) return;
  
  const giftsContent = document.querySelector('#page-gifts .content');
  giftsContent.innerHTML = renderLoading();
  
  try {
    const nfts = await api.getUserNfts(walletAddress);
    
    if (nfts.length === 0) {
      giftsContent.innerHTML = `
        <div class="placeholder">
          <div class="placeholder-icon">🎁</div>
          <div class="placeholder-text">No NFTs yet. Visit the store!</div>
        </div>
      `;
      return;
    }
    
    // Update points with NFT count
    document.getElementById('points-value').textContent = nfts.length.toLocaleString();
    
    giftsContent.innerHTML = `<div class="nft-grid">${nfts.map((nft, i) => renderNftCard(nft, i)).join('')}</div>`;
    
    // Add click handlers
    initNftCardHandlers();
    
  } catch (error) {
    console.error('Failed to load user NFTs:', error);
    giftsContent.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">⚠️</div>
        <div class="placeholder-text">Failed to load NFTs</div>
      </div>
    `;
  }
}

// ==================== EVENT HANDLERS ====================

function initNftCardHandlers() {
  document.querySelectorAll('.price-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic('medium');
      
      if (!walletAddress) {
        handleWalletClick();
        return;
      }
      
      // Get NFT address and open on Getgems
      const card = btn.closest('.nft-card');
      const address = card?.dataset.address;
      if (address && tg) {
        tg.openLink(`https://getgems.io/nft/${address}`);
      }
    });
  });
  
  document.querySelectorAll('.cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic('light');
      btn.textContent = btn.textContent === '🛒' ? '✓' : '🛒';
    });
  });
  
  document.querySelectorAll('.nft-card').forEach(card => {
    card.addEventListener('click', () => {
      haptic('light');
      const address = card.dataset.address;
      if (address && tg) {
        tg.openLink(`https://getgems.io/nft/${address}`);
      }
    });
  });
}

// ==================== PAGE NAVIGATION ====================

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const pageId = item.dataset.page;
      
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      
      pages.forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${pageId}`)?.classList.add('active');
      
      haptic('selection');
    });
  });
}

function initSectionTabs() {
  const tabs = document.querySelectorAll('.section-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      haptic('selection');
      
      const section = tab.dataset.section;
      console.log('Section:', section);
      // TODO: Filter by section
    });
  });
}

// ==================== MODALS ====================

function initModals() {
  const overlay = document.getElementById('modal-overlay');
  const collectionSheet = document.getElementById('collection-sheet');
  const filterBtn = document.getElementById('filter-collection');
  const closeBtn = document.getElementById('sheet-close');
  const clearBtn = document.getElementById('btn-clear-filter');
  const applyBtn = document.getElementById('btn-apply-filter');
  
  filterBtn?.addEventListener('click', () => {
    openSheet(collectionSheet, overlay);
    loadCollections();
  });
  
  closeBtn?.addEventListener('click', () => {
    closeSheet(collectionSheet, overlay);
  });
  
  overlay?.addEventListener('click', () => {
    closeSheet(collectionSheet, overlay);
  });
  
  clearBtn?.addEventListener('click', () => {
    document.querySelectorAll('.collection-item.selected').forEach(item => {
      item.classList.remove('selected');
    });
    selectedCollections = [];
    haptic('light');
  });
  
  applyBtn?.addEventListener('click', async () => {
    selectedCollections = Array.from(document.querySelectorAll('.collection-item.selected'))
      .map(item => item.dataset.address);
    
    closeSheet(collectionSheet, overlay);
    haptic('medium');
    
    // Reload NFTs with filter
    if (selectedCollections.length > 0) {
      await loadFilteredNfts();
    } else {
      await loadNfts();
    }
  });
}

async function loadFilteredNfts() {
  const grid = document.getElementById('nft-grid');
  grid.innerHTML = renderLoading();
  
  try {
    let allNfts = [];
    
    for (const address of selectedCollections.slice(0, 3)) {
      const nfts = await api.getNftsByCollection(address, 6);
      const collection = allCollections.find(c => c.address === address);
      allNfts.push(...nfts.map(nft => ({
        ...nft,
        collectionName: collection?.name || 'Collection'
      })));
    }
    
    if (allNfts.length === 0) {
      grid.innerHTML = `
        <div class="placeholder" style="grid-column: 1/-1;">
          <div class="placeholder-icon">🔍</div>
          <div class="placeholder-text">No NFTs in selected collections</div>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = allNfts.map((nft, i) => renderNftCard(nft, i)).join('');
    initNftCardHandlers();
    
  } catch (error) {
    console.error('Failed to load filtered NFTs:', error);
    grid.innerHTML = `
      <div class="placeholder" style="grid-column: 1/-1;">
        <div class="placeholder-icon">⚠️</div>
        <div class="placeholder-text">Failed to load</div>
      </div>
    `;
  }
}

function openSheet(sheet, overlay) {
  overlay?.classList.add('open');
  sheet?.classList.add('open');
  haptic('medium');
}

function closeSheet(sheet, overlay) {
  overlay?.classList.remove('open');
  sheet?.classList.remove('open');
  haptic('light');
}

// ==================== SEARCH ====================

function initSearch() {
  const searchInput = document.getElementById('search-input');
  let searchTimeout;
  
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
      loadNfts();
      return;
    }
    
    searchTimeout = setTimeout(() => {
      console.log('Search:', query);
      // TODO: Implement search
    }, 500);
  });
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  setTheme(getStoredTheme());
  initTelegram();
  initNavigation();
  initSectionTabs();
  initModals();
  initSearch();
  initTonConnect();
  
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('wallet-btn')?.addEventListener('click', handleWalletClick);
  
  // Load initial data
  await loadNfts();
  
  console.log('EchoApp initialized 🐋');
});
