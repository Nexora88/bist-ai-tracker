/* ==========================================================
   NEXORA AI
   Enterprise Configuration System
   Version : 1.0.0
   File    : api/config.js
   ========================================================== */

/* ==========================================================
   APPLICATION INFORMATION
   ========================================================== */

export const APP_CONFIG = {

    // Application
    name: "Nexora AI",

    fullName: "Nexora AI Investment Platform",

    version: "1.0.0",

    build: "2026.07",

    developer: "Nexora Team",

    website: "https://nexora.ai",

    supportEmail: "support@nexora.ai",

    copyright: "© 2026 Nexora AI",

    license: "Commercial",

    environment: "development",

    debug: true,

    logs: true,

    analytics: true,

    betaFeatures: true

};

/* ==========================================================
   REGION SETTINGS
   ========================================================== */

export const REGION = {

    defaultCountry: "TR",

    defaultLanguage: "tr",

    defaultCurrency: "TRY",

    timezone: "Europe/Istanbul",

    dateFormat: "DD.MM.YYYY",

    timeFormat: "24h",

    firstDayOfWeek: "Monday"

};

/* ==========================================================
   APPLICATION LIMITS
   ========================================================== */

export const LIMITS = {

    maxWatchlist: 500,

    maxPortfolioStocks: 1000,

    maxNewsPerRequest: 100,

    maxSearchResults: 500,

    maxNotifications: 1000,

    maxChartsOpened: 12,

    maxComparisonStocks: 10,

    maxAiQuestionsPerDay: 500,

    autoRefreshSeconds: 30

};

/* ==========================================================
   DEFAULT SETTINGS
   ========================================================== */

export const DEFAULTS = {

    theme: "dark",

    language: "tr",

    currency: "TRY",

    chartInterval: "1D",

    chartType: "Candlestick",

    newsCountry: "Global",

    newsLanguage: "all",

    stockExchange: "BIST",

    enableAnimations: true,

    enableNotifications: true,

    enableSounds: false,

    enableAutoRefresh: true,

    enableMarketStatus: true

};

/* ==========================================================
   FEATURE FLAGS
   ========================================================== */

export const FEATURES = {

    aiAssistant: true,

    premium: true,

    portfolio: true,

    news: true,

    markets: true,

    charts: true,

    watchlist: true,

    screener: true,

    dividendCenter: true,

    earningsCenter: true,

    ipoCenter: true,

    economicCalendar: true,

    crypto: true,

    forex: true,

    commodities: true,

    heatmap: true,

    compareStocks: true,

    insiderTrades: true,

    institutionalOwnership: true

};

/* ==========================================================
   END OF SECTION 1
   ========================================================== */

   /* ==========================================================
   API CONFIGURATION CENTER
   ========================================================== */

export const API_CONFIG = {

    /* ===============================
       MARKET DATA PROVIDERS
       =============================== */

    finnhub: {

        enabled: true,

        apiKey: "YOUR_FINNHUB_API_KEY",

        baseUrl: "https://finnhub.io/api/v1",

        timeout: 10000

    },

    twelveData: {

        enabled: true,

        apiKey: "YOUR_TWELVEDATA_API_KEY",

        baseUrl: "https://api.twelvedata.com",

        timeout: 10000

    },

    polygon: {

        enabled: true,

        apiKey: "YOUR_POLYGON_API_KEY",

        baseUrl: "https://api.polygon.io",

        timeout: 10000

    },

    alphaVantage: {

        enabled: true,

        apiKey: "YOUR_ALPHA_VANTAGE_API_KEY",

        baseUrl: "https://www.alphavantage.co",

        timeout: 10000

    },

    financialModelingPrep: {

        enabled: true,

        apiKey: "YOUR_FMP_API_KEY",

        baseUrl: "https://financialmodelingprep.com/api",

        timeout: 10000

    },

    /* ===============================
       NEWS PROVIDERS
       =============================== */

    marketaux: {

        enabled: true,

        apiKey: "YOUR_MARKETAUX_API_KEY",

        baseUrl: "https://api.marketaux.com",

        timeout: 10000

    },

    newsApi: {

        enabled: true,

        apiKey: "YOUR_NEWSAPI_KEY",

        baseUrl: "https://newsapi.org/v2",

        timeout: 10000

    },

    newsData: {

        enabled: true,

        apiKey: "YOUR_NEWSDATA_API_KEY",

        baseUrl: "https://newsdata.io/api",

        timeout: 10000

    },

    /* ===============================
       CRYPTO PROVIDERS
       =============================== */

    coinGecko: {

        enabled: true,

        apiKey: "YOUR_COINGECKO_API_KEY",

        baseUrl: "https://api.coingecko.com/api/v3",

        timeout: 10000

    },

    coinMarketCap: {

        enabled: true,

        apiKey: "YOUR_COINMARKETCAP_API_KEY",

        baseUrl: "https://pro-api.coinmarketcap.com",

        timeout: 10000

    },

    /* ===============================
       ECONOMY PROVIDERS
       =============================== */

    fred: {

        enabled: true,

        apiKey: "YOUR_FRED_API_KEY",

        baseUrl: "https://api.stlouisfed.org",

        timeout: 10000

    },

    tradingEconomics: {

        enabled: true,

        apiKey: "YOUR_TRADINGECONOMICS_API_KEY",

        baseUrl: "https://api.tradingeconomics.com",

        timeout: 10000

    },

    /* ===============================
       AI
       =============================== */

    openAI: {

        enabled: true,

        apiKey: "YOUR_OPENAI_API_KEY",

        baseUrl: "https://api.openai.com/v1",

        timeout: 60000

    },

    /* ===============================
       MAPS
       =============================== */

    googleMaps: {

        enabled: true,

        apiKey: "YOUR_GOOGLE_MAPS_API_KEY",

        baseUrl: "https://maps.googleapis.com",

        timeout: 10000

    }

};

/* ==========================================================
   END OF SECTION 2
   ========================================================== */

   /* ==========================================================
   API PROVIDER PRIORITY SYSTEM
   ========================================================== */

export const API_PRIORITY = {

    /* ===============================
       STOCK MARKET DATA
       =============================== */

    stocks: [

        "finnhub",

        "polygon",

        "twelveData",

        "financialModelingPrep",

        "alphaVantage"

    ],

    /* ===============================
       COMPANY INFORMATION
       =============================== */

    company: [

        "financialModelingPrep",

        "finnhub",

        "polygon"

    ],

    /* ===============================
       NEWS
       =============================== */

    news: [

        "marketaux",

        "newsApi",

        "newsData"

    ],

    /* ===============================
       CHART DATA
       =============================== */

    charts: [

        "polygon",

        "twelveData",

        "finnhub"

    ],

    /* ===============================
       FOREX
       =============================== */

    forex: [

        "twelveData",

        "alphaVantage"

    ],

    /* ===============================
       CRYPTO
       =============================== */

    crypto: [

        "coinGecko",

        "coinMarketCap"

    ],

    /* ===============================
       ECONOMY
       =============================== */

    economy: [

        "fred",

        "tradingEconomics"

    ],

    /* ===============================
       AI
       =============================== */

    ai: [

        "openAI"

    ],

    /* ===============================
       MAPS
       =============================== */

    maps: [

        "googleMaps"

    ]

};

/* ==========================================================
   PROVIDER FALLBACK SETTINGS
   ========================================================== */

export const API_FALLBACK = {

    enabled: true,

    retryCount: 3,

    retryDelay: 2000,

    switchProviderAutomatically: true,

    logProviderChanges: true,

    notifyOnFailure: false

};

/* ==========================================================
   END OF SECTION 3
   ========================================================== */

   /* ==========================================================
   CACHE & PERFORMANCE SYSTEM
   ========================================================== */

export const CACHE = {

    enabled: true,

    provider: "localStorage",

    version: "1.0",

    prefix: "nexora_",

    autoClearExpired: true,

    clearOnVersionChange: true,

    compression: true

};

/* ==========================================================
   CACHE DURATIONS (SECONDS)
   ========================================================== */

export const CACHE_TIME = {

    stocks: 30,

    charts: 30,

    orderBook: 5,

    company: 86400,

    news: 300,

    economy: 1800,

    crypto: 30,

    forex: 30,

    dividends: 86400,

    earnings: 86400,

    ipo: 86400,

    watchlist: 60,

    portfolio: 60,

    ai: 600

};

/* ==========================================================
   REQUEST SETTINGS
   ========================================================== */

export const REQUEST = {

    timeout: 10000,

    retryCount: 3,

    retryDelay: 1500,

    retryMultiplier: 2,

    queueEnabled: true,

    maxConcurrentRequests: 10,

    abortOnTimeout: true

};

/* ==========================================================
   RATE LIMIT
   ========================================================== */

export const RATE_LIMIT = {

    enabled: true,

    requestsPerSecond: 8,

    requestsPerMinute: 100,

    requestsPerHour: 5000,

    queueRequests: true

};

/* ==========================================================
   OFFLINE MODE
   ========================================================== */

export const OFFLINE = {

    enabled: true,

    useLastCachedData: true,

    showOfflineBanner: true,

    autoSyncWhenOnline: true,

    maxOfflineDays: 7

};

/* ==========================================================
   PERFORMANCE
   ========================================================== */

export const PERFORMANCE = {

    lazyLoadImages: true,

    lazyLoadCharts: true,

    preloadWatchlist: true,

    preloadPortfolio: true,

    preloadNews: false,

    preloadMarkets: true,

    smoothAnimations: true,

    hardwareAcceleration: true

};

/* ==========================================================
   END OF SECTION 4
   ========================================================== */

   /* ==========================================================
   GLOBAL MARKETS CONFIGURATION
   ========================================================== */

export const MARKETS = {

    BIST: {
        code: "BIST",
        name: "Borsa Istanbul",
        country: "Türkiye",
        currency: "TRY",
        timezone: "Europe/Istanbul",
        api: "finnhub",
        enabled: true
    },

    NASDAQ: {
        code: "NASDAQ",
        name: "NASDAQ",
        country: "United States",
        currency: "USD",
        timezone: "America/New_York",
        api: "finnhub",
        enabled: true
    },

    NYSE: {
        code: "NYSE",
        name: "New York Stock Exchange",
        country: "United States",
        currency: "USD",
        timezone: "America/New_York",
        api: "finnhub",
        enabled: true
    },

    AMEX: {
        code: "AMEX",
        name: "NYSE American",
        country: "United States",
        currency: "USD",
        timezone: "America/New_York",
        api: "finnhub",
        enabled: true
    },

    OTC: {
        code: "OTC",
        name: "OTC Markets",
        country: "United States",
        currency: "USD",
        timezone: "America/New_York",
        api: "finnhub",
        enabled: true
    },

    LSE: {
        code: "LSE",
        name: "London Stock Exchange",
        country: "United Kingdom",
        currency: "GBP",
        timezone: "Europe/London",
        api: "finnhub",
        enabled: true
    },

    EURONEXT: {
        code: "EURONEXT",
        name: "Euronext",
        country: "Europe",
        currency: "EUR",
        timezone: "Europe/Paris",
        api: "finnhub",
        enabled: true
    },

    XETRA: {
        code: "XETRA",
        name: "Xetra",
        country: "Germany",
        currency: "EUR",
        timezone: "Europe/Berlin",
        api: "finnhub",
        enabled: true
    },

    TSX: {
        code: "TSX",
        name: "Toronto Stock Exchange",
        country: "Canada",
        currency: "CAD",
        timezone: "America/Toronto",
        api: "finnhub",
        enabled: true
    },

    B3: {
        code: "B3",
        name: "Brasil Bolsa Balcao",
        country: "Brazil",
        currency: "BRL",
        timezone: "America/Sao_Paulo",
        api: "finnhub",
        enabled: true
    },

    JPX: {
        code: "JPX",
        name: "Japan Exchange Group",
        country: "Japan",
        currency: "JPY",
        timezone: "Asia/Tokyo",
        api: "finnhub",
        enabled: true
    },

    HKEX: {
        code: "HKEX",
        name: "Hong Kong Exchange",
        country: "Hong Kong",
        currency: "HKD",
        timezone: "Asia/Hong_Kong",
        api: "finnhub",
        enabled: true
    },

    KRX: {
        code: "KRX",
        name: "Korea Exchange",
        country: "South Korea",
        currency: "KRW",
        timezone: "Asia/Seoul",
        api: "finnhub",
        enabled: true
    },

    ASX: {
        code: "ASX",
        name: "Australian Securities Exchange",
        country: "Australia",
        currency: "AUD",
        timezone: "Australia/Sydney",
        api: "finnhub",
        enabled: true
    }

};

/* ==========================================================
   OTHER MARKETS
   ========================================================== */

export const OTHER_MARKETS = {

    FOREX: true,

    CRYPTO: true,

    COMMODITIES: true,

    INDICES: true,

    ETFS: true,

    MUTUAL_FUNDS: true,

    BONDS: true,

    FUTURES: true,

    OPTIONS: true

};

/* ==========================================================
   DEFAULT MARKET
   ========================================================== */

export const DEFAULT_MARKET = "BIST";

/* ==========================================================
   END OF SECTION 5
   ========================================================== */

/* ==========================================================
   UI & THEME CONFIGURATION
   ========================================================== */

export const UI = {

    defaultTheme: "dark",

    allowThemeSwitch: true,

    glassmorphism: true,

    animations: true,

    smoothScrolling: true,

    roundedDesign: true,

    compactMode: false,

    defaultFont: "Inter",

    chartTheme: "dark",

    iconStyle: "modern",

    showLoadingAnimations: true,

    showSkeletonLoader: true,

    enableBlurEffects: true,

    enableGradientBackgrounds: true,

    enableCardHoverEffects: true,

    enableButtonAnimations: true,

    enableTransitions: true

};

/* ==========================================================
   COLOR SYSTEM
   ========================================================== */

export const COLORS = {

    primary: "#10B981",

    secondary: "#3B82F6",

    success: "#22C55E",

    danger: "#EF4444",

    warning: "#F59E0B",

    info: "#06B6D4",

    background: "#0F172A",

    surface: "#1E293B",

    text: "#F8FAFC",

    muted: "#94A3B8"

};

/* ==========================================================
   CHART APPEARANCE
   ========================================================== */

export const CHART_UI = {

    defaultType: "candlestick",

    defaultInterval: "1D",

    showVolume: true,

    showGrid: true,

    showCrosshair: true,

    showLegend: true,

    showWatermark: false,

    autoResize: true,

    smoothZoom: true,

    enableDrawingTools: true,

    enableFullscreen: true,

    enableScreenshot: true

};

/* ==========================================================
   MOBILE SETTINGS
   ========================================================== */

export const MOBILE = {

    responsive: true,

    mobileMenu: true,

    swipeNavigation: true,

    bottomNavigation: true,

    touchOptimized: true,

    enableHapticFeedback: false

};

/* ==========================================================
   DASHBOARD SETTINGS
   ========================================================== */

export const DASHBOARD = {

    defaultPage: "stocks",

    showMarketOverview: true,

    showWatchlist: true,

    showPortfolio: true,

    showTopNews: true,

    showEconomicCalendar: true,

    showCrypto: true,

    showForex: true,

    autoRefreshDashboard: true

};

/* ==========================================================
   END OF SECTION 6
   ========================================================== */

   /* ==========================================================
   LANGUAGE & LOCALIZATION
   ========================================================== */

export const LANGUAGE = {

    default: "tr",

    fallback: "en",

    autoDetect: true,

    allowUserChange: true,

    rememberSelection: true,

    supported: [

        "tr",
        "en",
        "de",
        "fr",
        "es",
        "it",
        "pt",
        "ru",
        "ja",
        "ko",
        "zh",
        "ar",
        "hi"

    ]

};

/* ==========================================================
   LANGUAGE NAMES
   ========================================================== */

export const LANGUAGE_NAMES = {

    tr: "Türkçe",

    en: "English",

    de: "Deutsch",

    fr: "Français",

    es: "Español",

    it: "Italiano",

    pt: "Português",

    ru: "Русский",

    ja: "日本語",

    ko: "한국어",

    zh: "中文",

    ar: "العربية",

    hi: "हिन्दी"

};

/* ==========================================================
   CURRENCY SETTINGS
   ========================================================== */

export const CURRENCY = {

    default: "TRY",

    supported: [

        "TRY",

        "USD",

        "EUR",

        "GBP",

        "JPY",

        "CHF",

        "CAD",

        "AUD",

        "CNY",

        "HKD",

        "SGD",

        "KRW",

        "INR",

        "BRL"

    ]

};

/* ==========================================================
   DATE & TIME
   ========================================================== */

export const DATE_TIME = {

    defaultFormat: "DD.MM.YYYY",

    defaultTime: "24h",

    timezone: "Europe/Istanbul",

    showSeconds: false,

    showWeekday: true

};

/* ==========================================================
   NUMBER FORMATTING
   ========================================================== */

export const NUMBER_FORMAT = {

    decimalPlaces: 2,

    thousandSeparator: ",",

    decimalSeparator: ".",

    compactNumbers: true,

    percentageDecimals: 2

};

/* ==========================================================
   REGION SETTINGS
   ========================================================== */

export const REGION_SETTINGS = {

    autoDetect: true,

    defaultRegion: "TR",

    useLocalMarket: true,

    useLocalCurrency: true,

    useLocalLanguage: true

};

/* ==========================================================
   END OF SECTION 7
   ========================================================== */

   /* ==========================================================
   PREMIUM & NOTIFICATION CONFIGURATION
   ========================================================== */

export const PREMIUM = {

    enabled: true,

    freePlan: true,

    premiumPlan: true,

    yearlyPlan: true,

    lifetimePlan: false,

    trialDays: 7,

    removeAds: true,

    unlimitedWatchlist: true,

    unlimitedPortfolio: true,

    aiUnlimited: true,

    exportPortfolio: true,

    advancedCharts: true,

    insiderData: true,

    realtimeData: true,

    advancedScreener: true

};

/* ==========================================================
   NOTIFICATIONS
   ========================================================== */

export const NOTIFICATIONS = {

    enabled: true,

    browser: true,

    push: true,

    email: true,

    sound: true,

    vibration: false,

    desktop: true,

    mobile: true,

    showBadge: true,

    autoRead: false

};

/* ==========================================================
   PRICE ALERTS
   ========================================================== */

export const PRICE_ALERTS = {

    enabled: true,

    maxAlerts: 500,

    percentageAlerts: true,

    volumeAlerts: true,

    newsAlerts: true,

    earningsAlerts: true,

    dividendAlerts: true,

    ipoAlerts: true

};

/* ==========================================================
   WATCHLIST SETTINGS
   ========================================================== */

export const WATCHLIST = {

    enabled: true,

    syncCloud: true,

    autoSort: false,

    defaultSort: "marketCap",

    maxFavorites: 1000,

    autoRefresh: true,

    refreshInterval: 30

};

/* ==========================================================
   PORTFOLIO SETTINGS
   ========================================================== */

export const PORTFOLIO = {

    enabled: true,

    cloudSync: true,

    autoCalculateProfit: true,

    realtimeUpdate: true,

    dividendTracking: true,

    transactionHistory: true,

    exportExcel: true,

    exportPDF: true

};

/* ==========================================================
   SECURITY
   ========================================================== */

export const SECURITY = {

    twoFactorAuth: true,

    biometricLogin: true,

    sessionTimeout: 30,

    autoLogout: false,

    encryptLocalData: true

};

/* ==========================================================
   END OF SECTION 8
   ========================================================== */

   /* ==========================================================
   NEXORA AI CONFIGURATION
   ========================================================== */

export const AI = {

    enabled: true,

    provider: "OpenAI",

    model: "gpt-5.5",

    temperature: 0.4,

    maxTokens: 4000,

    streamResponse: true,

    saveConversation: true,

    rememberUserPreferences: true,

    language: "auto",

    responseStyle: "professional"

};

/* ==========================================================
   AI MODULES
   ========================================================== */

export const AI_MODULES = {

    stockAnalysis: true,

    technicalAnalysis: true,

    fundamentalAnalysis: true,

    portfolioAnalysis: true,

    marketAnalysis: true,

    newsAnalysis: true,

    earningsAnalysis: true,

    dividendAnalysis: true,

    riskAnalysis: true,

    economicAnalysis: true,

    cryptoAnalysis: true,

    forexAnalysis: true,

    watchlistSuggestions: true,

    smartSearch: true

};

/* ==========================================================
   AI CHAT SETTINGS
   ========================================================== */

export const AI_CHAT = {

    enableMarkdown: true,

    enableTables: true,

    enableCharts: true,

    enableImages: false,

    typingAnimation: true,

    codeHighlight: true,

    showSources: true,

    autoScroll: true,

    saveHistory: true,

    historyLimit: 500

};

/* ==========================================================
   AI ANALYSIS SETTINGS
   ========================================================== */

export const AI_ANALYSIS = {

    sentimentAnalysis: true,

    scoreStocks: true,

    scoreNews: true,

    scorePortfolio: true,

    predictTrend: true,

    detectRisk: true,

    compareCompanies: true,

    summarizeReports: true,

    explainIndicators: true,

    explainFinancialStatements: true

};

/* ==========================================================
   AI WATCHLIST
   ========================================================== */

export const AI_WATCHLIST = {

    autoSuggestions: true,

    maxSuggestions: 20,

    detectMomentum: true,

    detectValueStocks: true,

    detectDividendStocks: true,

    detectGrowthStocks: true,

    detectUndervaluedStocks: true

};

/* ==========================================================
   AI PORTFOLIO
   ========================================================== */

export const AI_PORTFOLIO = {

    rebalanceSuggestions: true,

    diversificationAnalysis: true,

    sectorDistribution: true,

    riskDistribution: true,

    expectedReturn: true,

    volatilityAnalysis: true

};

/* ==========================================================
   END OF SECTION 9
   ========================================================== */

   /* ==========================================================
   GLOBAL CONSTANTS & SYSTEM CONFIGURATION
   ========================================================== */

export const SYSTEM = {

    appName: "Nexora AI",

    appVersion: "1.0.0",

    apiVersion: "v1",

    buildVersion: "2026.07",

    developerMode: false,

    maintenanceMode: false,

    demoMode: false,

    productionReady: true,

    enableLogging: true,

    enablePerformanceMonitor: true,

    enableErrorReporting: true

};

/* ==========================================================
   SUPPORTED CHART TYPES
   ========================================================== */

export const CHART_TYPES = [

    "candlestick",

    "line",

    "area",

    "bar",

    "heikinAshi",

    "hollowCandles",

    "baseline"

];

/* ==========================================================
   TECHNICAL INDICATORS
   ========================================================== */

export const TECHNICAL_INDICATORS = [

    "SMA",

    "EMA",

    "VWAP",

    "RSI",

    "MACD",

    "Bollinger Bands",

    "ATR",

    "ADX",

    "Stochastic",

    "CCI",

    "Ichimoku Cloud",

    "Parabolic SAR",

    "OBV",

    "Volume",

    "SuperTrend",

    "Fibonacci"

];

/* ==========================================================
   SUPPORTED EXPORT FORMATS
   ========================================================== */

export const EXPORT_FORMATS = [

    "PDF",

    "CSV",

    "XLSX",

    "JSON"

];

/* ==========================================================
   SUPPORTED FILE TYPES
   ========================================================== */

export const FILE_TYPES = {

    image: [

        "png",

        "jpg",

        "jpeg",

        "webp",

        "svg"

    ],

    document: [

        "pdf",

        "csv",

        "xlsx",

        "json"

    ]

};

/* ==========================================================
   MARKET STATUS
   ========================================================== */

export const MARKET_STATUS = {

    PRE_MARKET: "pre-market",

    OPEN: "open",

    AFTER_HOURS: "after-hours",

    CLOSED: "closed"

};

/* ==========================================================
   LOG LEVELS
   ========================================================== */

export const LOG_LEVELS = {

    INFO: "info",

    WARNING: "warning",

    ERROR: "error",

    DEBUG: "debug"

};

/* ==========================================================
   APPLICATION PATHS
   ========================================================== */

export const PATHS = {

    home: "index.html",

    stocks: "stocks.html",

    news: "news.html",

    chart: "chart.html",

    portfolio: "portfolio.html",

    settings: "settings.html"

};

/* ==========================================================
   NEXORA CONFIG VERSION
   ========================================================== */

export const CONFIG = {

    version: "1.0.0",

    generated: "2026",

    compatible: true

};

/* ==========================================================
   END OF CONFIG.JS
   ========================================================== */