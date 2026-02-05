// EchoApp - TON Ecosystem Aggregator
// Portals-inspired UI

import { TonConnectUI } from '@tonconnect/ui';

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
  
  // Get user data
  tgUser = tg.initDataUnsafe?.user;
  console.log('Telegram user:', tgUser);
  
  // Set avatar if available
  if (tgUser?.photo_url) {
    document.getElementById('nav-avatar').src = tgUser.photo_url;
  }
  
  // Match Telegram theme (default to dark)
  if (tg.colorScheme === 'light') {
    setTheme('light');
  } else {
    setTheme('dark');
  }
  
  // Enable closing confirmation
  tg.enableClosingConfirmation();
}

// ==================== THEME MANAGEMENT ====================
function getStoredTheme() {
  // Default to dark (Portals style)
  return localStorage.getItem('echoapp-theme') || 'dark';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('echoapp-theme', theme);
  
  // Update meta theme color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.content = theme === 'dark' ? '#000000' : '#ffffff';
  }
  
  // Update Telegram header color
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
      manifestUrl: 'https://echoanna.github.io/echoapp/tonconnect-manifest.json',
      buttonRootId: null
    });
    
    // Restore connection
    const wallet = tonConnectUI.wallet;
    if (wallet) {
      onWalletConnected(wallet);
    }
    
    // Listen for connection changes
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

function onWalletConnected(wallet) {
  walletAddress = wallet.account.address;
  const shortAddr = formatAddress(walletAddress);
  
  const walletBtn = document.getElementById('wallet-btn');
  const walletText = document.getElementById('wallet-text');
  walletBtn.classList.remove('connect');
  walletText.textContent = shortAddr;
  
  // Update points (demo)
  document.getElementById('points-value').textContent = '89,252';
  
  // Update placeholders
  updateConnectedState(true);
  
  console.log('Wallet connected:', walletAddress);
  haptic('medium');
}

function onWalletDisconnected() {
  walletAddress = null;
  
  const walletBtn = document.getElementById('wallet-btn');
  const walletText = document.getElementById('wallet-text');
  walletBtn.classList.add('connect');
  walletText.textContent = 'Connect';
  
  // Reset points
  document.getElementById('points-value').textContent = '0';
  
  // Update placeholders
  updateConnectedState(false);
  
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

function updateConnectedState(connected) {
  // Update My Gifts page
  const giftsPlaceholder = document.querySelector('#page-gifts .placeholder-text');
  if (giftsPlaceholder) {
    giftsPlaceholder.textContent = connected 
      ? 'No gifts yet. Visit the store!' 
      : 'Connect wallet to see your gifts';
  }
  
  // Update Profile page
  const profilePlaceholder = document.querySelector('#page-profile .placeholder-text');
  if (profilePlaceholder) {
    profilePlaceholder.textContent = connected 
      ? `Connected: ${formatAddress(walletAddress)}` 
      : 'Connect wallet to view profile';
  }
}

// ==================== PAGE NAVIGATION ====================
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const pageId = item.dataset.page;
      
      // Update active nav item
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      
      // Update active page
      pages.forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${pageId}`)?.classList.add('active');
      
      haptic('selection');
    });
  });
}

// ==================== SECTION TABS ====================
function initSectionTabs() {
  const tabs = document.querySelectorAll('.section-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      haptic('selection');
      
      // TODO: Filter content based on section
      const section = tab.dataset.section;
      console.log('Section:', section);
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
  
  // Open collection filter
  filterBtn?.addEventListener('click', () => {
    openSheet(collectionSheet, overlay);
  });
  
  // Close handlers
  closeBtn?.addEventListener('click', () => {
    closeSheet(collectionSheet, overlay);
  });
  
  overlay?.addEventListener('click', () => {
    closeSheet(collectionSheet, overlay);
  });
  
  clearBtn?.addEventListener('click', () => {
    // Clear all selections
    document.querySelectorAll('.collection-item.selected').forEach(item => {
      item.classList.remove('selected');
    });
    haptic('light');
  });
  
  applyBtn?.addEventListener('click', () => {
    closeSheet(collectionSheet, overlay);
    haptic('medium');
    // TODO: Apply filter
  });
  
  // Collection item selection
  document.querySelectorAll('.collection-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('selected');
      haptic('selection');
    });
  });
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

// ==================== NFT CARD INTERACTIONS ====================
function initNftCards() {
  // Price button clicks
  document.querySelectorAll('.price-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic('medium');
      
      if (!walletAddress) {
        handleWalletClick();
        return;
      }
      
      // TODO: Open buy modal
      console.log('Buy NFT');
    });
  });
  
  // Cart button clicks
  document.querySelectorAll('.cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic('light');
      
      // Toggle cart state
      btn.textContent = btn.textContent === '🛒' ? '✓' : '🛒';
    });
  });
  
  // Card clicks
  document.querySelectorAll('.nft-card').forEach(card => {
    card.addEventListener('click', () => {
      haptic('light');
      // TODO: Open NFT detail
      console.log('View NFT');
    });
  });
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  // Set initial theme
  setTheme(getStoredTheme());
  
  // Initialize Telegram
  initTelegram();
  
  // Initialize navigation
  initNavigation();
  initSectionTabs();
  
  // Initialize modals
  initModals();
  
  // Initialize NFT cards
  initNftCards();
  
  // Initialize TonConnect
  initTonConnect();
  
  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  
  // Wallet button
  document.getElementById('wallet-btn')?.addEventListener('click', handleWalletClick);
  
  console.log('EchoApp initialized 🐋');
});
