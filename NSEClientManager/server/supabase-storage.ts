import { supabase } from './supabase/config/supabase-client';
import {
  type User,
  type InsertUser,
  type Stock,
  type InsertStock,
  type ResultsCalendar,
  type InsertResultsCalendar,
  type QuarterlyResults,
  type InsertQuarterlyResults,
  type StockWithCalendar,
  type StockDetail,
} from "@shared/schema";
import type { IStorage } from './storage';
import type { CandlestickData, InsertCandlestickData, DeliveryVolume, InsertDeliveryVolume, LivePrice, InsertLivePrice } from '@shared/schema';

// Export supabase client for direct database access
export { supabase };

// Helper functions to convert between camelCase and snake_case
// Optimized with memoization for frequently accessed fields
const caseConversionCache = new Map<string, string>();

function toSnakeCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const snakeCaseObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    let snakeKey = caseConversionCache.get(`s_${key}`);
    if (!snakeKey) {
      // Special handling for QoQ and YoY - treat them as single units
      snakeKey = key
        .replace(/QoQ/g, '_qoq')  // Handle QoQ
        .replace(/YoY/g, '_yoy')  // Handle YoY
        .replace(/([a-z])([A-Z])/g, '$1_$2')  // Insert _ between lowercase and uppercase
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')  // Handle acronyms like "XMLParser" -> "XML_Parser"
        .replace(/^_/, '')  // Remove leading underscore if it exists
        .toLowerCase();
      caseConversionCache.set(`s_${key}`, snakeKey);
    }
    snakeCaseObj[snakeKey] = value;
  }
  return snakeCaseObj;
}

function toCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const camelCaseObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    let camelKey = caseConversionCache.get(`c_${key}`);
    if (!camelKey) {
      // Handle QoQ and YoY specially before general conversion
      camelKey = key
        .replace(/_qoq/g, 'QoQ')
        .replace(/_yoy/g, 'YoY')
        .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      caseConversionCache.set(`c_${key}`, camelKey);
    }
    camelCaseObj[camelKey] = value;
  }
  return camelCaseObj;
}

export class SupabaseStorage implements IStorage {
  // User operations
  async getUserById(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return undefined;
    return toCamelCase(data) as User;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.getUserById(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) return undefined;
    return toCamelCase(data) as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const dbUser = toSnakeCase(insertUser);
    const { data, error } = await supabase
      .from('users')
      .insert({
        ...dbUser,
        created_at: new Date().toISOString(),
        last_login: null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return toCamelCase(data) as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const dbUpdates = toSnakeCase(updates);
    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseStorage] updateUser error:', error);
      return undefined;
    }
    return toCamelCase(data) as User;
  }

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .neq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(toCamelCase) as User[];
  }

  // Stock operations
  async getStock(id: string): Promise<Stock | undefined> {
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return undefined;
    return toCamelCase(data) as Stock;
  }

  async getStockBySymbol(symbol: string): Promise<Stock | undefined> {
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('symbol', symbol)
      .single();

    if (error) return undefined;
    return toCamelCase(data) as Stock;
  }

  async getAllStocks(): Promise<Stock[]> {
    // Optimized: Select only essential fields for listing (reduces data transfer)
    const { data, error } = await supabase
      .from('stocks')
      .select('id, symbol, company_name, current_price, percent_change, volume, sector, last_updated')
      .order('symbol');

    if (error) return [];
    return data.map(toCamelCase) as Stock[];
  }

  async getTopPerformers(limit: number = 10): Promise<Stock[]> {
    // Optimized: Use index on percent_change and select minimal fields
    const { data, error } = await supabase
      .from('stocks')
      .select('id, symbol, company_name, current_price, percent_change, volume, last_traded_price, day_high, day_low')
      .order('percent_change', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data.map(toCamelCase) as Stock[];
  }

  async getPortfolioStocks(limit: number = 10): Promise<Stock[]> {
    // Optimized: Select only display fields for dashboard cards
    const { data, error } = await supabase
      .from('stocks')
      .select('id, symbol, company_name, current_price, percent_change, volume, last_traded_price, day_high, day_low, sector')
      .limit(limit);

    if (error) return [];
    return data.map(toCamelCase) as Stock[];
  }

  async createStock(insertStock: InsertStock): Promise<Stock> {
    const dbStock = toSnakeCase(insertStock);
    const { data, error } = await supabase
      .from('stocks')
      .insert({
        ...dbStock,
        last_updated: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create stock: ${error.message}`);
    return toCamelCase(data) as Stock;
  }

  async updateStock(id: string, updates: Partial<Stock>): Promise<Stock | undefined> {
    const dbUpdates = toSnakeCase(updates);
    const { data, error } = await supabase
      .from('stocks')
      .update({
        ...dbUpdates,
        last_updated: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseStorage] updateStock error:', error);
      return undefined;
    }
    return toCamelCase(data) as Stock;
  }

  // Results Calendar operations
  async getResultsCalendar(): Promise<{ dates: { date: string; count: number }[]; stocks: StockWithCalendar[] }> {
    // Get all calendar entries with stock data
    const { data: calendarData, error: calendarError } = await supabase
      .from('results_calendar')
      .select(`
        *,
        stock:stocks(*)
      `)
      .order('announcement_date');

    if (calendarError) {
      return { dates: [], stocks: [] };
    }

    // Create date counts
    const dateCounts = new Map<string, number>();
    calendarData.forEach((entry: any) => {
      const date = entry.announcement_date;
      dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
    });

    const dates = Array.from(dateCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Transform to StockWithCalendar format with camelCase conversion
    const stocks: StockWithCalendar[] = calendarData.map((entry: any) => {
      const stock = toCamelCase(entry.stock);
      return {
        ...stock,
        calendar: {
          id: entry.id,
          stockId: entry.stock_id,
          announcementDate: entry.announcement_date,
          resultStatus: entry.result_status,
          quarter: entry.quarter,
          fiscalYear: entry.fiscal_year,
          pdfUrl: entry.pdf_url,
          pdfDownloadedAt: entry.pdf_downloaded_at,
        }
      };
    });

    return { dates, stocks };
  }

  async getResultsByDate(date: string): Promise<StockWithCalendar[]> {
    const { data, error } = await supabase
      .from('results_calendar')
      .select(`
        *,
        stock:stocks(*)
      `)
      .eq('announcement_date', date);

    if (error) return [];

    return data.map((entry: any) => {
      const stock = toCamelCase(entry.stock);
      return {
        ...stock,
        calendar: {
          id: entry.id,
          stockId: entry.stock_id,
          announcementDate: entry.announcement_date,
          resultStatus: entry.result_status,
          quarter: entry.quarter,
          fiscalYear: entry.fiscal_year,
          pdfUrl: entry.pdf_url,
          pdfDownloadedAt: entry.pdf_downloaded_at,
        }
      };
    });
  }

  async createResultsCalendar(calendar: InsertResultsCalendar): Promise<ResultsCalendar> {
    const dbCalendar = toSnakeCase(calendar);
    const { data, error } = await supabase
      .from('results_calendar')
      .insert(dbCalendar)
      .select()
      .single();

    if (error) throw new Error(`Failed to create calendar entry: ${error.message}`);
    return toCamelCase(data) as ResultsCalendar;
  }

  async updateResultStatus(id: string, status: string): Promise<ResultsCalendar | undefined> {
    const { data, error } = await supabase
      .from('results_calendar')
      .update({ result_status: status })
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return toCamelCase(data) as ResultsCalendar;
  }

  async getResultsCalendarByStockAndDate(stockId: string, date: Date): Promise<ResultsCalendar | undefined> {
    const dateStr = date.toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('results_calendar')
      .select('*')
      .eq('stock_id', stockId)
      .gte('announcement_date', dateStr)
      .lt('announcement_date', new Date(date.getTime() + 86400000).toISOString().split('T')[0])
      .single();

    if (error) return undefined;
    return toCamelCase(data) as ResultsCalendar;
  }

  async updateResultsCalendar(id: string, updates: Partial<ResultsCalendar>): Promise<ResultsCalendar | undefined> {
    const dbUpdates = toSnakeCase(updates);
    const { data, error } = await supabase
      .from('results_calendar')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return toCamelCase(data) as ResultsCalendar;
  }

  // Quarterly Results operations
  async getQuarterlyResults(stockId: string): Promise<QuarterlyResults | undefined> {
    const { data, error } = await supabase
      .from('quarterly_results')
      .select('*')
      .eq('stock_id', stockId)
      .order('published_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return undefined;
    return toCamelCase(data) as QuarterlyResults;
  }

  async getQuarterlyResultsByQuarter(stockId: string, quarter: string, fiscalYear: string): Promise<QuarterlyResults | undefined> {
    const { data, error } = await supabase
      .from('quarterly_results')
      .select('*')
      .eq('stock_id', stockId)
      .eq('quarter', quarter)
      .eq('fiscal_year', fiscalYear)
      .single();

    if (error) return undefined;
    return toCamelCase(data) as QuarterlyResults;
  }

  async createQuarterlyResults(results: InsertQuarterlyResults): Promise<QuarterlyResults> {
    const dbResults = toSnakeCase(results);
    const { data, error } = await supabase
      .from('quarterly_results')
      .insert({
        ...dbResults,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create quarterly results: ${error.message}`);
    return toCamelCase(data) as QuarterlyResults;
  }

  async upsertQuarterlyResults(results: InsertQuarterlyResults): Promise<QuarterlyResults> {
    const dbResults = toSnakeCase(results);
    
    // Try to find existing record
    const { data: existing } = await supabase
      .from('quarterly_results')
      .select('id')
      .eq('stock_id', results.stockId)
      .eq('quarter', results.quarter)
      .eq('fiscal_year', results.fiscalYear)
      .maybeSingle();

    let data, error;
    
    if (existing) {
      // Update existing record
      const response = await supabase
        .from('quarterly_results')
        .update({
          ...dbResults,
          published_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      data = response.data;
      error = response.error;
    } else {
      // Insert new record
      const response = await supabase
        .from('quarterly_results')
        .insert({
          ...dbResults,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();
      data = response.data;
      error = response.error;
    }

    if (error) throw new Error(`Failed to upsert quarterly results: ${error.message}`);
    return toCamelCase(data) as QuarterlyResults;
  }

  // Candlestick Data operations
  async createCandlestickData(candlestickData: InsertCandlestickData): Promise<CandlestickData> {
    const dbData = toSnakeCase(candlestickData);
    const { data, error } = await supabase
      .from('candlestick_data')
      .insert(dbData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create candlestick data: ${error.message}`);
    return toCamelCase(data) as CandlestickData;
  }

  async getCandlestickData(stockId: string, limit: number = 90): Promise<CandlestickData[]> {
    const { data, error } = await supabase
      .from('candlestick_data')
      .select('*')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get candlestick data: ${error.message}`);
    return data.map(toCamelCase) as CandlestickData[];
  }

  async getLatestCandlestickDate(stockId: string): Promise<string | undefined> {
    const { data, error } = await supabase
      .from('candlestick_data')
      .select('date')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    if (error) return undefined;
    return data?.date;
  }

  // Delivery Volume operations
  async createDeliveryVolume(deliveryVolume: InsertDeliveryVolume): Promise<DeliveryVolume> {
    const dbVolume = toSnakeCase(deliveryVolume);
    const { data, error } = await supabase
      .from('delivery_volume')
      .insert(dbVolume)
      .select()
      .single();

    if (error) throw new Error(`Failed to create delivery volume: ${error.message}`);
    return toCamelCase(data) as DeliveryVolume;
  }

  async getDeliveryVolume(stockId: string, limit: number = 30): Promise<DeliveryVolume[]> {
    const { data, error } = await supabase
      .from('delivery_volume')
      .select('*')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get delivery volume: ${error.message}`);
    return data.map(toCamelCase) as DeliveryVolume[];
  }

  async getLatestDeliveryDate(stockId: string): Promise<string | undefined> {
    const { data, error } = await supabase
      .from('delivery_volume')
      .select('date')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    if (error) return undefined;
    return data?.date;
  }


  // Stock Detail operations
  async getStockDetail(symbol: string): Promise<StockDetail | undefined> {
    const stock = await this.getStockBySymbol(symbol);
    if (!stock) return undefined;

    // Get quarterly results
    const results = await this.getQuarterlyResults(stock.id);

    // Get candlestick data (last 90 days)
    const candlestickData = await this.getCandlestickData(stock.id, 90);

    // Get delivery volume data (last 30 days)
    const deliveryData = await this.getDeliveryVolume(stock.id, 30);

    return {
      ...stock,
      results,
      candlestickData,
      deliveryVolume: deliveryData,
    };
  }

  // Live Price operations
  async createLivePrice(livePrice: any): Promise<any> {
    const dbPrice = toSnakeCase(livePrice);
    const { data, error } = await supabase
      .from('live_prices')
      .insert({
        ...dbPrice,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create live price: ${error.message}`);
    return toCamelCase(data);
  }

  async getLatestLivePrice(stockId: string): Promise<any | undefined> {
    const { data, error } = await supabase
      .from('live_prices')
      .select('*')
      .eq('stock_id', stockId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) return undefined;
    return toCamelCase(data);
  }

  async getLivePrices(stockId: string, limit: number = 100): Promise<any[]> {
    const { data, error } = await supabase
      .from('live_prices')
      .select('*')
      .eq('stock_id', stockId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data.map(toCamelCase);
  }

  // Enhanced Results Calendar operations
  async updateResultsCalendarStatus(id: string, updates: {
    processingStatus?: string;
    pdfDownloadStatus?: string;
    volume?: number;
    announcementDetectedAt?: Date;
    pdfAvailableAt?: Date;
    parsingCompletedAt?: Date;
  }): Promise<ResultsCalendar | undefined> {
    const dbUpdates = toSnakeCase(updates);
    const { data, error } = await supabase
      .from('results_calendar')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseStorage] updateResultsCalendarStatus error:', error);
      return undefined;
    }
    return toCamelCase(data) as ResultsCalendar;
  }

  // Stock update tracking
  async updateStockDataTimestamp(stockId: string, updateType: 'candlestick' | 'delivery' | 'livePrice'): Promise<void> {
    const columnMap = {
      candlestick: 'last_candlestick_update',
      delivery: 'last_delivery_update',
      livePrice: 'last_live_price_update',
    };

    const column = columnMap[updateType];
    const { error } = await supabase
      .from('stocks')
      .update({ [column]: new Date().toISOString() })
      .eq('id', stockId);

    if (error) {
      console.error(`[SupabaseStorage] Failed to update ${updateType} timestamp:`, error);
    }
  }

  async getStocksNeedingUpdate(updateType: 'candlestick' | 'delivery', hoursThreshold: number = 24): Promise<Stock[]> {
    const columnMap = {
      candlestick: 'last_candlestick_update',
      delivery: 'last_delivery_update',
    };

    const column = columnMap[updateType];
    const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .or(`${column}.is.null,${column}.lt.${thresholdDate}`)
      .order(column, { ascending: true, nullsFirst: true });

    if (error) {
      console.error('[SupabaseStorage] getStocksNeedingUpdate error:', error);
      return [];
    }
    return data.map(toCamelCase) as Stock[];
  }
}
