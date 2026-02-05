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
// Note: Telegram gifts are special NFTs on TON
// Collection addresses for known gift collections

const GIFT_COLLECTIONS = [
  'EQAOQdwdw8kGftJCSFgOErM1mBjYPe4DBPq8-AhF6vr9si5N', // Telegram gifts
];

export async function getTelegramGifts(limit = 20) {
  try {
    // Try to fetch from known gift collection
    const gifts = [];
    
    for (const collectionAddr of GIFT_COLLECTIONS) {
      try {
        const response = await fetch(
          `${TONAPI_BASE}/nfts/collections/${collectionAddr}/items?limit=${limit}`
        );
        const data = await response.json();
        
        if (data.nft_items) {
          gifts.push(...data.nft_items.map((item, index) => ({
            address: item.address,
            name: item.metadata?.name || 'Gift',
            image: getBestImage(item.previews) || item.metadata?.image,
            color: getCardColor(index)
          })));
        }
      } catch (e) {
        console.log('Gift collection not found:', collectionAddr);
      }
    }
    
    return gifts;
  } catch (error) {
    console.error('Failed to fetch gifts:', error);
    return [];
  }
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
