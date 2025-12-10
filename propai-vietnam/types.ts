
export interface PropertyInput {
  address: string;
  price: number; // in Billion VND usually, but user input might be raw
  area: number; // m2
  type: string;
  description: string;
  images?: string[]; // Array of base64 strings including mime type prefix
  locationUrl?: string; // Google Maps URL
}

export interface ClimateRisk {
  flood: number; // 1-10
  heat: number;
  drought: number;
  forestFire: number;
}

export interface MarketTrendItem {
  timeline: string;
  priceTrend: string;
  description: string;
  newsContext?: string; // New field for detailed context/news
}

export interface MarketAnalysis {
  averagePricePerM2: string;
  historicalTrends: MarketTrendItem[];
  futureProjections: string;
}

export interface AnalysisResult {
  coordinates: { lat: number; lng: number };
  terrainAnalysis: string;
  climateRisks: ClimateRisk;
  marketValueEstimation: {
    min: number; // Billion VND
    max: number; // Billion VND
    currency: string;
  };
  marketAnalysis: MarketAnalysis;
  suggestedFunctions: string[];
  investmentScore: number; // 0-100
  reasoning: string;
  groundingLinks?: GroundingLink[];
}

export interface GroundingLink {
  title: string;
  uri: string;
  source: 'search' | 'maps';
}

export interface CustomerProfile {
  budget: number; // Billion VND
  purpose: string; // Investment, Living, Resort, etc.
  riskTolerance: 'Low' | 'Medium' | 'High';
  lifestyle: string;
}

export interface MatchResult {
  matchingScore: number; // 0-100
  explanation: string;
  top3Products?: string[]; // In a real app this would be IDs, here just names/types
  recommendation: boolean;
}

export interface SavedDeal {
  id: string;
  timestamp: number;
  property: PropertyInput;
  analysis: AnalysisResult | null;
  match: MatchResult | null;
  status: 'draft' | 'analyzed';
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: 'free' | 'pro' | 'enterprise';
  avatar?: string;
  joinedAt: Date;
  history: SavedDeal[]; // Personal storage
}

export enum AppState {
  IDLE,
  ANALYZING_PROPERTY,
  PROPERTY_ANALYZED,
  MATCHING_CUSTOMER,
  MATCHED,
  ERROR
}

export interface BulkRow {
  id: number;
  originalData: any;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: AnalysisResult;
  errorMsg?: string;
}