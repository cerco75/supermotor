
// API Base URL for the backend
// Updated to 3001 to match the new Node/Express backend configuration
// export const API_BASE_URL = 'http://localhost:3001/api'; // Dev
export const API_BASE_URL = 'https://wealth-guardian-production.up.railway.app'; // Prod Railway

// EXPANDED CRYPTO ASSET LIST (Wide Range)
// Removes Stocks/Forex to focus on Real Data from Binance
export const ASSET_ICONS: Record<string, string> = {
  // Majors
  BTC: '₿',
  ETH: 'Ξ',
  BNB: '🔶',
  SOL: '◎',
  XRP: '✕',
  ADA: '₳',
  AVAX: '🔺',
  DOT: '●',
  TRX: '♦️',

  // Stablecoins
  USDT: '₮',
  USDC: '💵',
  FDUSD: '💵',

  // Meme Coins (High Volatility)
  DOGE: 'Ð',
  SHIB: '🐕',
  PEPE: '🐸',
  BONK: '🐕',
  WIF: '🧢',
  FLOKI: '🛶',
  MEME: '🤪',
  BOME: '📚',
  ELIZAOS: '🤖',
  FWOG: '🐸',
  POPCAT: '🙀',
  MOG: '😹',
  KEYCAT: '🔑',
  VIRTUAL: '🥽',
  BRETT: '🧢',

  // Crypto.com Ecosystem & Specifics
  CRO: '🦁',
  CORGIAI: '🦊',
  VVS: '💎',
  TONIC: '🥃',
  FER: '🔩',

  // L1 & L2 Alternatives & Trending (Screenshots)
  MATIC: '💜',
  NEAR: '∞',
  KAS: '⚡',
  SUI: '💧',
  SEI: '🚢',
  APT: '🌐',
  ARB: '💙',
  OP: '🔴',
  INJ: '💉',
  TIA: '✨',
  ALGO: '🅰️',
  HBAR: 'ℏ',
  FTM: '👻',

  // New High Gainers (Previous User Request)
  LAYER: '🧬',
  MOVE: '💨',
  KYVE: '💾',
  ELA: '💎',
  TEVA: '🏝️',
  XYO: '📍',
  ZBCN: '🦓',
  BCH: '💸',
  WLFI: '🦅',
  BAT: '🦇',
  ZKC: '🔐',
  A2Z: '🎮',
  ANIME: '🎎',
  KITE: '🪁',
  SPELL: '🔮',
  '2Z': '⚡',

  // NEW DISCOVERY & SCREENSHOTS ADDITIONS
  TNSR: '📐',
  ALI: '🧠',
  CTC: '💳',
  DYM: '🧊',
  FARTCOIN: '💨',
  HIGH: '🌆',
  TROLL: '👹',

  // SCREENSHOT SPECIFIC ADDITIONS (The "Missing" Coins)
  GLM: '💾',    // Golem
  XPL: '🌌',    // Plasma
  SPX: '📈',    // SPX6900
  SPA: '🔄',    // Sperax
  ENA: '💵',    // Ethena
  USELESS: '🚮', // Useless
  KAITO: '🤖',  // Kaito
  REACT: '⚛️',  // React
  IP: '📜',    // Story
  NEON: '🟣',   // Neon
  MON: '👾',    // Monad
  NTRN: '⚛️',   // Neutron
  IOST: '⚡',   // IOST
};

// MAPPING FOR COINGECKO API FALLBACK
// Binance uses Symbols (BTC), CoinGecko uses IDs (bitcoin)
export const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  TRX: 'tron',
  DOGE: 'dogecoin',
  SHIB: 'shiba-inu',
  PEPE: 'pepe',
  BONK: 'bonk',
  WIF: 'dogwifhat',
  FLOKI: 'floki',
  MATIC: 'matic-network',
  NEAR: 'near',
  KAS: 'kaspa',
  SUI: 'sui',
  SEI: 'sei-network',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  INJ: 'injective-protocol',
  TIA: 'celestia',
  ALGO: 'algorand',
  HBAR: 'hedera-hashgraph',
  FTM: 'fantom',
  BCH: 'bitcoin-cash',
  BAT: 'basic-attention-token',
  SPELL: 'spell-token',
  XYO: 'xyo-network',
  ELA: 'elastos',
  // Some smaller/newer tokens might not be on CoinGecko free tier or have different IDs
  LAYER: 'solayer',
  WLFI: 'world-liberty-financial',
  MOVE: 'movement',
  KYVE: 'kyve-network',
  // New Discoveries
  TNSR: 'tensor',
  ALI: 'allet', // or artificial-liquid-intelligence
  DYM: 'dymension',
  HIGH: 'highstreet',
  CTC: 'creditcoin',
  // Memes
  POPCAT: 'popcat-sol',
  MOG: 'mog-coin',
  BRETT: 'based-brett',
  KEYCAT: 'keyboard-cat',
  ELIZAOS: 'eliza', // check id
  VIRTUAL: 'virtual-protocol',
  FWOG: 'fwog',
  // Crypto.com Specifics
  CRO: 'crypto-com-chain',
  CORGIAI: 'corgiai',
  VVS: 'vvs-finance',
  FER: 'ferro',
  TONIC: 'tectonic',

  // SCREENSHOT ADDITIONS MAPPING
  GLM: 'golem',
  XPL: 'plasma-network', // Or 'plasma-finance', checking common ID
  SPX: 'spx6900',
  SPA: 'sperax',
  ENA: 'ethena',
  USELESS: 'useless-v3', // Or 'useless'
  KAITO: 'kaito',
  REACT: 'react-network',
  IP: 'story-protocol', // Often 'story' or 'story-protocol'
  NEON: 'neon-evm',
  MON: 'monad-official', // Warning: Might be pre-market
  NTRN: 'neutron-3',
  IOST: 'iost',
  FARTCOIN: 'fartcoin'
};

export const SUPPORTED_CRYPTO_ASSETS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'TRX',
  'DOGE', 'SHIB', 'PEPE', 'BONK', 'WIF', 'FLOKI', 'MEME', 'BOME',
  'MATIC', 'NEAR', 'KAS', 'SUI', 'SEI', 'APT', 'ARB', 'OP', 'INJ', 'TIA', 'ALGO', 'HBAR', 'FTM',
  // Previous Request
  'LAYER', 'KYVE', 'FER', 'ZBCN', 'BCH', 'WLFI', 'MOVE', '2Z', 'ELIZAOS',
  'ZKC', 'BAT', 'ELA', 'TEVA', 'ANIME', 'XYO', 'A2Z', 'KITE', 'SPELL',
  // New Request (Crypto.com Gainers)
  'TNSR', 'ALI', 'FWOG', 'CTC', 'DYM', 'FARTCOIN', 'HIGH', 'TROLL',
  // Velocity Radar Additions
  'POPCAT', 'MOG', 'KEYCAT', 'VIRTUAL', 'BRETT',
  // Crypto.com Specifics
  'CRO', 'CORGIAI', 'VVS', 'TONIC',
  // SCREENSHOT ADDITIONS
  'GLM', 'XPL', 'SPX', 'SPA', 'ENA', 'USELESS', 'KAITO', 'REACT', 'IP', 'NEON', 'MON', 'NTRN', 'IOST'
];

export const CLASSIFICATION_COLORS = {
  'Confirmado': 'text-emerald-400',
  'Dudoso': 'text-amber-400',
  'Falso': 'text-rose-400',
  'Pendiente': 'text-slate-400'
};

export const AVAILABLE_LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' }
];

export const DEFAULT_FOLLOWED_ASSETS = ['BTC', 'ETH', 'SOL', 'PEPE', 'WIF'];
export const DEFAULT_PREFERRED_CURRENCIES = ['USD', 'EUR', 'USDT'];
export const DEFAULT_TIMEZONE = 'UTC';
