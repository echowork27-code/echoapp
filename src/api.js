// EchoApp API - TON NFT Data via TonAPI

const TONAPI_BASE = 'https://tonapi.io/v2';

// Color palette for NFT card backgrounds
const CARD_COLORS = ['green', 'purple', 'blue', 'orange', 'pink'];

// Get random card color
function getCardColor(index) {
  return CARD_COLORS[index % CARD_COLORS.length];
}

// Format TON price from nanoton
function formatTonPrice(nanoton) {
  if (!nanoton) return null;
  const ton = Number(nanoton) / 1e9;
  if (ton >= 1000) {
    return ton.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return ton.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// Format large numbers
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Get best image URL from previews
function getBestImage(previews, size = '500x500') {
  if (!previews || !previews.length) return null;
  const preferred = previews.find(p => p.resolution === size);
  return preferred?.url || previews[previews.length - 1]?.url;
}

// ==================== NFT COLLECTIONS ====================

export async function getTopCollections(limit = 20) {
  try {
    // Get top collections by volume
    const response = await fetch(
      `${TONAPI_BASE}/nfts/collections?limit=${limit}`
    );
    const data = await response.json();
    
    return data.nft_collections?.map((col, index) => ({
      address: col.address,
      name: col.metadata?.name || 'Unknown Collection',
      description: col.metadata?.description || '',
      image: getBestImage(col.previews, '100x100') || col.metadata?.image,
      coverImage: col.metadata?.cover_image,
      itemCount: col.next_item_index || 0,
      color: getCardColor(index),
      marketplace: col.metadata?.marketplace,
      socialLinks: col.metadata?.social_links || []
    })) || [];
  } catch (error) {
    console.error('Failed to fetch collections:', error);
    return [];
  }
}

// ==================== NFT ITEMS ====================

export async function getNftsByCollection(collectionAddress, limit = 20) {
  try {
    const response = await fetch(
      `${TONAPI_BASE}/nfts/collections/${collectionAddress}/items?limit=${limit}`
    );
    const data = await response.json();
    
    return data.nft_items?.map((item, index) => ({
      address: item.address,
      index: item.index,
      name: item.metadata?.name || `#${item.index}`,
      description: item.metadata?.description || '',
      image: getBestImage(item.previews) || item.metadata?.image,
      collectionAddress: collectionAddress,
      collectionName: item.collection?.name,
      owner: item.owner?.address,
      price: null, // Need to fetch from marketplace
      color: getCardColor(index)
    })) || [];
  } catch (error) {
    console.error('Failed to fetch NFTs:', error);
    return [];
  }
}

// ==================== NFT SEARCH ====================

export async function searchNfts(query, limit = 20) {
  try {
    // TonAPI doesn't have direct search, so we'll search in account NFTs
    // For now, return empty - we'd need Getgems API for proper search
    console.log('Search not implemented yet:', query);
    return [];
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

// ==================== USER NFTs ====================

export async function getUserNfts(walletAddress, limit = 50) {
  try {
    const response = await fetch(
      `${TONAPI_BASE}/accounts/${walletAddress}/nfts?limit=${limit}&indirect_ownership=true`
    );
    const data = await response.json();
    
    return data.nft_items?.map((item, index) => ({
      address: item.address,
      index: item.index,
      name: item.metadata?.name || `NFT #${item.index}`,
      description: item.metadata?.description || '',
      image: getBestImage(item.previews) || item.metadata?.image,
      collectionAddress: item.collection?.address,
      collectionName: item.collection?.name || 'Unknown Collection',
      color: getCardColor(index)
    })) || [];
  } catch (error) {
    console.error('Failed to fetch user NFTs:', error);
    return [];
  }
}

// ==================== WALLET BALANCE ====================

export async function getWalletBalance(walletAddress) {
  try {
    const response = await fetch(
      `${TONAPI_BASE}/accounts/${walletAddress}`
    );
    const data = await response.json();
    
    return {
      balance: formatTonPrice(data.balance),
      balanceRaw: data.balance,
      status: data.status,
      name: data.name,
      icon: data.icon
    };
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    return null;
  }
}

// ==================== TELEGRAM GIFTS ====================
// Official Telegram Gift collections from Fragment

const TELEGRAM_GIFT_COLLECTIONS = [
  {
    address: 'EQATuUGdvrjLvTWE5ppVFOVCqU2dlCLUnKTsu0n1JYm9la10',
    name: 'Scared Cats',
    image: 'https://nft.fragment.com/collection/scaredcat.webp',
    emoji: '🐱',
    color: 'purple'
  },
  {
    address: 'EQBG-g6ahkAUGWpefWbx-D_9sQ8oWbvy6puuq78U2c4NUDFS',
    name: 'Plush Pepes',
    image: 'https://nft.fragment.com/collection/plushpepe.webp',
    emoji: '🐸',
    color: 'green'
  }
];

export function getTelegramGiftCollections() {
  return TELEGRAM_GIFT_COLLECTIONS;
}

export async function getTelegramGifts(collectionAddress, limit = 20) {
  try {
    const response = await fetch(
      `${TONAPI_BASE}/nfts/collections/${collectionAddress}/items?limit=${limit}`
    );
    const data = await response.json();
    
    const collection = TELEGRAM_GIFT_COLLECTIONS.find(c => c.address === collectionAddress);
    
    return data.nft_items?.map((item, index) => ({
      address: item.address,
      index: item.index,
      name: item.metadata?.name || `${collection?.name || 'Gift'} #${item.index}`,
      description: item.metadata?.description || '',
      image: getBestImage(item.previews) || item.metadata?.image,
      collectionAddress: collectionAddress,
      collectionName: collection?.name || 'Telegram Gift',
      color: collection?.color || getCardColor(index),
      fragmentUrl: `https://fragment.com/gift/${item.address}`
    })) || [];
  } catch (error) {
    console.error('Failed to fetch Telegram gifts:', error);
    return [];
  }
}

export async function getAllTelegramGifts(limitPerCollection = 10) {
  const allGifts = [];
  
  for (const collection of TELEGRAM_GIFT_COLLECTIONS) {
    const gifts = await getTelegramGifts(collection.address, limitPerCollection);
    allGifts.push(...gifts);
  }
  
  return allGifts;
}

// ==================== FEATURED / TRENDING ====================

export async function getFeaturedNfts() {
  // Get a mix of NFTs from top collections
  const collections = await getTopCollections(5);
  const featured = [];
  
  for (const collection of collections.slice(0, 3)) {
    const items = await getNftsByCollection(collection.address, 4);
    featured.push(...items.map(item => ({
      ...item,
      collectionName: collection.name
    })));
  }
  
  return featured.slice(0, 12);
}

// ==================== TOKEN SWAP ====================

// Popular tokens on TON
const POPULAR_TOKENS = [
  {
    symbol: 'TON',
    name: 'Toncoin',
    address: 'native',
    decimals: 9,
    image: 'https://ton.org/download/ton_symbol.png'
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
    decimals: 6,
    image: 'https://cache.tonapi.io/imgproxy/T3PB4s7oprNVaJkwqbGg07DPUrXmzBi-Xzi-q9uJzTo/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29DaXJjbGUucG5n.webp'
  },
  {
    symbol: 'NOT',
    name: 'Notcoin',
    address: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT',
    decimals: 9,
    image: 'https://cache.tonapi.io/imgproxy/4KCMNm34jZLXt0rqeFm4rH-BK4FoK76EVX9r0cCIGDg/rs:fill:200:200:1/g:no/aHR0cHM6Ly9jZG4uam9pbmNvbW11bml0eS54eXovY2xpY2tlci9ub3RfbG9nby5wbmc.webp'
  },
  {
    symbol: 'DOGS',
    name: 'Dogs',
    address: 'EQCvxJy4eG8hyHBFsZ7eePxrRsUQSFE_jpptRAYBmcG_DOGS',
    decimals: 9,
    image: 'https://cache.tonapi.io/imgproxy/6PVNYcQAaWOPZr3H7sfaVgFNZC9ZfVHlcYIY6ABGA0s/rs:fill:200:200:1/g:no/aHR0cHM6Ly9jZG4uZG9ncy5kZXYvZG9ncy5wbmc.webp'
  },
  {
    symbol: 'CATI',
    name: 'Catizen',
    address: 'EQD-cvR0Nz6XAyRBvbhz-abTrRC6sI5tvHvvpeQraV9UAAD7',
    decimals: 9,
    image: 'https://cache.tonapi.io/imgproxy/x6C9v3kNHMgWDOtaZBQQWjjQ0o9Wl9ODAjkfrlZqOGQ/rs:fill:200:200:1/g:no/aHR0cHM6Ly9hc3NldHMuY29pbmdlY2tvLmNvbS9jb2lucy9pbWFnZXMvMzk0NjYvbGFyZ2UvY2F0aV9sb2dvLnBuZz8xNzI0NDU2MzE2.webp'
  },
  {
    symbol: 'HMSTR',
    name: 'Hamster Kombat',
    address: 'EQAJ8uWd7EBqsmpSWaRdf_I-8R8-XHwh3gsNKhy-UrdrPcUo',
    decimals: 9,
    image: 'https://cache.tonapi.io/imgproxy/4v-m_pNcZD2xKc8GB5oaLiHRrSipu6IV-YUPbGjwNyM/rs:fill:200:200:1/g:no/aHR0cHM6Ly9oYW1zdGVya29tYmF0Lmlvcy1hcHBzLnN0b3JlL2ltYWdlcy9jb2luX2hhbXN0ZXJfa29tYmF0LnBuZw.webp'
  }
];

export function getPopularTokens() {
  return POPULAR_TOKENS;
}

export async function getTokenRates(symbols = ['ton']) {
  try {
    const response = await fetch(
      `${TONAPI_BASE}/rates?tokens=${symbols.join(',')}&currencies=usd`
    );
    const data = await response.json();
    return data.rates || {};
  } catch (error) {
    console.error('Failed to fetch rates:', error);
    return {};
  }
}

export async function getSwapEstimate(fromToken, toToken, amount) {
  // For now, return mock estimate based on rates
  // In production, this would call DeDust or Ston.fi API
  try {
    const rates = await getTokenRates(['ton']);
    const tonPrice = rates?.TON?.prices?.USD || 3.5;
    
    // Simple mock conversion (TON <-> USDT)
    if (fromToken === 'TON' && toToken === 'USDT') {
      return {
        fromAmount: amount,
        toAmount: (amount * tonPrice).toFixed(2),
        rate: tonPrice,
        priceImpact: '0.1%',
        fee: '0.3%'
      };
    } else if (fromToken === 'USDT' && toToken === 'TON') {
      return {
        fromAmount: amount,
        toAmount: (amount / tonPrice).toFixed(4),
        rate: 1 / tonPrice,
        priceImpact: '0.1%',
        fee: '0.3%'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get swap estimate:', error);
    return null;
  }
}

// Get user's token balances
export async function getUserTokens(walletAddress) {
  try {
    const response = await fetch(
      `${TONAPI_BASE}/accounts/${walletAddress}/jettons?currencies=usd`
    );
    const data = await response.json();
    
    return data.balances?.map(bal => ({
      address: bal.jetton?.address,
      symbol: bal.jetton?.symbol || 'Unknown',
      name: bal.jetton?.name || 'Unknown Token',
      balance: bal.balance,
      decimals: bal.jetton?.decimals || 9,
      image: bal.jetton?.image,
      usdValue: bal.price?.prices?.USD ? 
        (Number(bal.balance) / Math.pow(10, bal.jetton?.decimals || 9)) * bal.price.prices.USD : 0
    })) || [];
  } catch (error) {
    console.error('Failed to fetch user tokens:', error);
    return [];
  }
}
