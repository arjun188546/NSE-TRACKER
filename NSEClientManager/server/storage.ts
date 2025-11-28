import {
  type User,
  type InsertUser,
  type Stock,
  type InsertStock,
  type ResultsCalendar,
  type InsertResultsCalendar,
  type QuarterlyResults,
  type InsertQuarterlyResults,
  type CandlestickData,
  type InsertCandlestickData,
  type DeliveryVolume,
  type InsertDeliveryVolume,
  type StockWithCalendar,
  type StockDetail,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Stock operations
  getStock(id: string): Promise<Stock | undefined>;
  getStockBySymbol(symbol: string): Promise<Stock | undefined>;
  getAllStocks(): Promise<Stock[]>;
  getTopPerformers(limit?: number): Promise<Stock[]>;
  getPortfolioStocks(limit?: number): Promise<Stock[]>;
  createStock(stock: InsertStock): Promise<Stock>;
  updateStock(id: string, updates: Partial<Stock>): Promise<Stock | undefined>;
  
  // Results Calendar operations
  getResultsCalendar(): Promise<{ dates: { date: string; count: number }[]; stocks: StockWithCalendar[] }>;
  getResultsByDate(date: string): Promise<StockWithCalendar[]>;
  createResultsCalendar(calendar: InsertResultsCalendar): Promise<ResultsCalendar>;
  updateResultStatus(id: string, status: string): Promise<ResultsCalendar | undefined>;
  getResultsCalendarByStockAndDate(stockId: string, date: Date): Promise<ResultsCalendar | undefined>;
  updateResultsCalendar(id: string, updates: Partial<ResultsCalendar>): Promise<ResultsCalendar | undefined>;
  
  // Quarterly Results operations
  getQuarterlyResults(stockId: string): Promise<QuarterlyResults | undefined>;
  getQuarterlyResultsByQuarter(stockId: string, quarter: string, fiscalYear: string): Promise<QuarterlyResults | undefined>;
  upsertQuarterlyResults(results: InsertQuarterlyResults): Promise<QuarterlyResults>;
  createQuarterlyResults(results: InsertQuarterlyResults): Promise<QuarterlyResults>;
  
  // Candlestick Data operations
  createCandlestickData(data: InsertCandlestickData): Promise<CandlestickData>;
  getCandlestickData(stockId: string, limit?: number): Promise<CandlestickData[]>;
  
  // Delivery Volume operations  
  createDeliveryVolume(data: InsertDeliveryVolume): Promise<DeliveryVolume>;
  getDeliveryVolume(stockId: string, limit?: number): Promise<DeliveryVolume[]>;
  
  // Stock Detail operations
  getStockDetail(symbol: string): Promise<StockDetail | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private stocks: Map<string, Stock>;
  private resultsCalendar: Map<string, ResultsCalendar>;
  private quarterlyResults: Map<string, QuarterlyResults>;
  private candlestickData: Map<string, CandlestickData>;
  private deliveryVolume: Map<string, DeliveryVolume>;

  constructor() {
    this.users = new Map();
    this.stocks = new Map();
    this.resultsCalendar = new Map();
    this.quarterlyResults = new Map();
    this.candlestickData = new Map();
    this.deliveryVolume = new Map();
    
    this.seedData();
  }

  private seedData() {
    // Seed admin user
    const adminId = randomUUID();
    this.users.set(adminId, {
      id: adminId,
      email: "admin@nse-platform.com",
      password: "admin123",
      role: "admin",
      subscriptionStatus: "active",
      demoExpiresAt: null,
      lastLogin: null,
      createdAt: new Date(),
    });

    // Seed test client users
    const client1Id = randomUUID();
    this.users.set(client1Id, {
      id: client1Id,
      email: "client@example.com",
      password: "client123",
      role: "client",
      subscriptionStatus: "active",
      demoExpiresAt: null,
      lastLogin: null,
      createdAt: new Date(),
    });

    const client2Id = randomUUID();
    const demoExpiry = new Date();
    demoExpiry.setDate(demoExpiry.getDate() + 7);
    this.users.set(client2Id, {
      id: client2Id,
      email: "demo@example.com",
      password: "demo123",
      role: "client",
      subscriptionStatus: "demo",
      demoExpiresAt: demoExpiry,
      lastLogin: null,
      createdAt: new Date(),
    });

    const client3Id = randomUUID();
    this.users.set(client3Id, {
      id: client3Id,
      email: "inactive@example.com",
      password: "inactive123",
      role: "client",
      subscriptionStatus: "inactive",
      demoExpiresAt: null,
      lastLogin: null,
      createdAt: new Date(),
    });

    // Seed stocks with current real prices (as of Nov 20, 2025)
    const stocksData = [
      { symbol: "TATASTEEL", name: "Tata Steel Limited", price: "172.40", change: "-0.47", volume: 84500000, sector: "Steel", cap: "₹2.15L Cr" },
      { symbol: "RELIANCE", name: "Reliance Industries Ltd", price: "1285.50", change: "0.85", volume: 12000000, sector: "Oil & Gas", cap: "₹17.4L Cr" },
      { symbol: "INFY", name: "Infosys Limited", price: "1925.30", change: "-0.65", volume: 6200000, sector: "IT", cap: "₹8.1L Cr" },
      { symbol: "TCS", name: "Tata Consultancy Services", price: "4156.80", change: "1.12", volume: 4100000, sector: "IT", cap: "₹15.2L Cr" },
      { symbol: "HDFCBANK", name: "HDFC Bank Limited", price: "1748.90", change: "0.45", volume: 9800000, sector: "Banking", cap: "₹13.3L Cr" },
      { symbol: "ICICIBANK", name: "ICICI Bank Limited", price: "1285.60", change: "0.78", volume: 11500000, sector: "Banking", cap: "₹9.1L Cr" },
      { symbol: "BHARTIARTL", name: "Bharti Airtel Limited", price: "1685.40", change: "-0.32", volume: 7300000, sector: "Telecom", cap: "₹9.9L Cr" },
      { symbol: "ITC", name: "ITC Limited", price: "485.70", change: "0.52", volume: 15600000, sector: "FMCG", cap: "₹6.1L Cr" },
      { symbol: "WIPRO", name: "Wipro Limited", price: "298.45", change: "-1.25", volume: 5900000, sector: "IT", cap: "₹1.6L Cr" },
      { symbol: "AXISBANK", name: "Axis Bank Limited", price: "1148.70", change: "1.15", volume: 8700000, sector: "Banking", cap: "₹3.6L Cr" },
    ];

    stocksData.forEach((stock) => {
      const stockId = randomUUID();
      this.stocks.set(stockId, {
        id: stockId,
        symbol: stock.symbol,
        companyName: stock.name,
        currentPrice: stock.price,
        percentChange: stock.change,
        volume: stock.volume,
        lastTradedPrice: stock.price,
        lastTradedQuantity: null,
        lastTradedTime: null,
        dayHigh: null,
        dayLow: null,
        openPrice: null,
        previousClose: null,
        yearHigh: null,
        yearLow: null,
        totalBuyQuantity: null,
        totalSellQuantity: null,
        totalTradedValue: null,
        totalTradedVolume: stock.volume,
        averagePrice: null,
        sector: stock.sector,
        marketCap: stock.cap,
        lastUpdated: new Date(),
      });

      // Add results calendar entry
      const calendarId = randomUUID();
      const announcementDate = new Date();
      announcementDate.setDate(announcementDate.getDate() + Math.floor(Math.random() * 14));
      
      const statuses = ["waiting", "received", "ready"] as const;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      this.resultsCalendar.set(calendarId, {
        id: calendarId,
        stockId: stockId,
        announcementDate: announcementDate.toISOString().split('T')[0],
        resultStatus: status,
        quarter: "Q2",
        fiscalYear: "FY2024",
      });

      // Add quarterly results for some stocks (only if status is ready)
      if (status === "ready" || Math.random() > 0.5) {
        const resultsId = randomUUID();
        const revenue = (Math.random() * 50000 + 10000).toFixed(2);
        const profit = (Math.random() * 10000 + 1000).toFixed(2);
        const eps = (Math.random() * 50 + 5).toFixed(4);
        
        this.quarterlyResults.set(resultsId, {
          id: resultsId,
          stockId: stockId,
          quarter: "Q2",
          fiscalYear: "FY2024",
          revenue: revenue,
          profit: profit,
          eps: eps,
          revenueQoQ: (Math.random() * 20 - 5).toFixed(2),
          profitQoQ: (Math.random() * 30 - 10).toFixed(2),
          epsQoQ: (Math.random() * 25 - 8).toFixed(2),
          revenueYoY: (Math.random() * 40 - 10).toFixed(2),
          profitYoY: (Math.random() * 50 - 15).toFixed(2),
          epsYoY: (Math.random() * 45 - 12).toFixed(2),
          publishedAt: new Date(),
        });
      }
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
      lastLogin: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.role !== "admin");
  }

  // Stock operations
  async getStock(id: string): Promise<Stock | undefined> {
    return this.stocks.get(id);
  }

  async getStockBySymbol(symbol: string): Promise<Stock | undefined> {
    return Array.from(this.stocks.values()).find((stock) => stock.symbol === symbol);
  }

  async getAllStocks(): Promise<Stock[]> {
    return Array.from(this.stocks.values());
  }

  async getTopPerformers(limit: number = 10): Promise<Stock[]> {
    return Array.from(this.stocks.values())
      .sort((a, b) => parseFloat(b.percentChange || "0") - parseFloat(a.percentChange || "0"))
      .slice(0, limit);
  }

  async getPortfolioStocks(limit: number = 10): Promise<Stock[]> {
    return Array.from(this.stocks.values()).slice(0, limit);
  }

  async createStock(insertStock: InsertStock): Promise<Stock> {
    const id = randomUUID();
    const stock: Stock = {
      ...insertStock,
      id,
      lastUpdated: new Date(),
    };
    this.stocks.set(id, stock);
    return stock;
  }

  async updateStock(id: string, updates: Partial<Stock>): Promise<Stock | undefined> {
    const stock = this.stocks.get(id);
    if (!stock) return undefined;
    
    const updated: Stock = {
      ...stock,
      ...updates,
      lastUpdated: new Date(),
    };
    this.stocks.set(id, updated);
    return updated;
  }

  // Results Calendar operations
  async getResultsCalendar(): Promise<{ dates: { date: string; count: number }[]; stocks: StockWithCalendar[] }> {
    const stocks = Array.from(this.stocks.values());
    const calendars = Array.from(this.resultsCalendar.values());
    
    // Create date counts
    const dateCounts = new Map<string, number>();
    calendars.forEach((cal) => {
      const count = dateCounts.get(cal.announcementDate) || 0;
      dateCounts.set(cal.announcementDate, count + 1);
    });
    
    const dates = Array.from(dateCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Combine stocks with calendars
    const stocksWithCalendar: StockWithCalendar[] = stocks.map((stock) => {
      const calendar = calendars.find((cal) => cal.stockId === stock.id);
      return { ...stock, calendar };
    }).filter(s => s.calendar); // Only include stocks with calendar entries
    
    return { dates, stocks: stocksWithCalendar };
  }

  async getResultsByDate(date: string): Promise<StockWithCalendar[]> {
    const stocks = Array.from(this.stocks.values());
    const calendars = Array.from(this.resultsCalendar.values()).filter(
      (cal) => cal.announcementDate === date
    );
    
    return stocks
      .map((stock) => {
        const calendar = calendars.find((cal) => cal.stockId === stock.id);
        return calendar ? { ...stock, calendar } : null;
      })
      .filter((s): s is StockWithCalendar => s !== null);
  }

  async createResultsCalendar(insertCalendar: InsertResultsCalendar): Promise<ResultsCalendar> {
    const id = randomUUID();
    const calendar: ResultsCalendar = { ...insertCalendar, id };
    this.resultsCalendar.set(id, calendar);
    return calendar;
  }

  async updateResultStatus(id: string, status: string): Promise<ResultsCalendar | undefined> {
    const calendar = this.resultsCalendar.get(id);
    if (!calendar) return undefined;
    
    calendar.resultStatus = status;
    this.resultsCalendar.set(id, calendar);
    return calendar;
  }

  async getResultsCalendarByStockAndDate(stockId: string, date: Date): Promise<ResultsCalendar | undefined> {
    const dateStr = date.toISOString().split('T')[0];
    return Array.from(this.resultsCalendar.values()).find(
      (calendar) => calendar.stockId === stockId && 
                    calendar.announcementDate.toISOString().split('T')[0] === dateStr
    );
  }

  async updateResultsCalendar(id: string, updates: Partial<ResultsCalendar>): Promise<ResultsCalendar | undefined> {
    const calendar = this.resultsCalendar.get(id);
    if (!calendar) return undefined;
    
    Object.assign(calendar, updates);
    this.resultsCalendar.set(id, calendar);
    return calendar;
  }

  // Quarterly Results operations
  async getQuarterlyResults(stockId: string): Promise<QuarterlyResults | undefined> {
    return Array.from(this.quarterlyResults.values()).find(
      (result) => result.stockId === stockId
    );
  }

  async getQuarterlyResultsByQuarter(stockId: string, quarter: string, fiscalYear: string): Promise<QuarterlyResults | undefined> {
    return Array.from(this.quarterlyResults.values()).find(
      (result) => result.stockId === stockId && result.quarter === quarter && result.fiscalYear === fiscalYear
    );
  }

  async upsertQuarterlyResults(insertResults: InsertQuarterlyResults): Promise<QuarterlyResults> {
    // Find existing result for this stock/quarter/fiscalYear
    const existing = Array.from(this.quarterlyResults.values()).find(
      (result) => 
        result.stockId === insertResults.stockId && 
        result.quarter === insertResults.quarter && 
        result.fiscalYear === insertResults.fiscalYear
    );

    if (existing) {
      // Update existing
      const updated: QuarterlyResults = {
        ...existing,
        ...insertResults,
        publishedAt: new Date(),
      };
      this.quarterlyResults.set(existing.id, updated);
      return updated;
    } else {
      // Create new
      return this.createQuarterlyResults(insertResults);
    }
  }

  async createQuarterlyResults(insertResults: InsertQuarterlyResults): Promise<QuarterlyResults> {
    const id = randomUUID();
    const results: QuarterlyResults = {
      id,
      stockId: insertResults.stockId,
      quarter: insertResults.quarter,
      fiscalYear: insertResults.fiscalYear,
      revenue: insertResults.revenue || null,
      profit: insertResults.profit || null,
      eps: insertResults.eps || null,
      operatingProfit: insertResults.operatingProfit || null,
      operatingProfitMargin: insertResults.operatingProfitMargin || null,
      ebitda: insertResults.ebitda || null,
      ebitdaMargin: insertResults.ebitdaMargin || null,
      totalIncome: insertResults.totalIncome || null,
      totalExpenses: insertResults.totalExpenses || null,
      patMargin: insertResults.patMargin || null,
      roe: insertResults.roe || null,
      roce: insertResults.roce || null,
      prevRevenue: insertResults.prevRevenue || null,
      prevProfit: insertResults.prevProfit || null,
      prevEps: insertResults.prevEps || null,
      prevOperatingProfit: insertResults.prevOperatingProfit || null,
      yearAgoRevenue: insertResults.yearAgoRevenue || null,
      yearAgoProfit: insertResults.yearAgoProfit || null,
      yearAgoEps: insertResults.yearAgoEps || null,
      yearAgoOperatingProfit: insertResults.yearAgoOperatingProfit || null,
      revenueQoQ: insertResults.revenueQoQ || null,
      profitQoQ: insertResults.profitQoQ || null,
      epsQoQ: insertResults.epsQoQ || null,
      operatingProfitQoQ: insertResults.operatingProfitQoQ || null,
      operatingProfitMarginQoQ: insertResults.operatingProfitMarginQoQ || null,
      revenueYoY: insertResults.revenueYoY || null,
      profitYoY: insertResults.profitYoY || null,
      epsYoY: insertResults.epsYoY || null,
      operatingProfitYoY: insertResults.operatingProfitYoY || null,
      operatingProfitMarginYoY: insertResults.operatingProfitMarginYoY || null,
      publishedAt: new Date(),
    };
    this.quarterlyResults.set(id, results);
    return results;
  }

  // Candlestick Data operations
  async createCandlestickData(insertData: InsertCandlestickData): Promise<CandlestickData> {
    const id = randomUUID();
    const data: CandlestickData = {
      ...insertData,
      id,
    };
    this.candlestickData.set(id, data);
    return data;
  }

  async getCandlestickData(stockId: string, limit: number = 90): Promise<CandlestickData[]> {
    return Array.from(this.candlestickData.values())
      .filter((data) => data.stockId === stockId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  // Delivery Volume operations
  async createDeliveryVolume(insertData: InsertDeliveryVolume): Promise<DeliveryVolume> {
    const id = randomUUID();
    const data: DeliveryVolume = {
      ...insertData,
      id,
    };
    this.deliveryVolume.set(id, data);
    return data;
  }

  async getDeliveryVolume(stockId: string, limit: number = 30): Promise<DeliveryVolume[]> {
    return Array.from(this.deliveryVolume.values())
      .filter((data) => data.stockId === stockId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  // Stock Detail operations
  async getStockDetail(symbol: string): Promise<StockDetail | undefined> {
    const stock = await this.getStockBySymbol(symbol);
    if (!stock) return undefined;
    
    const results = await this.getQuarterlyResults(stock.id);
    
    return {
      ...stock,
      results,
      candlestickData: [],
      deliveryVolume: [],
    };
  }
}

// Use Supabase storage by default (production-ready)
import { SupabaseStorage } from './supabase-storage';

// Always use SupabaseStorage - DATABASE_URL is configured in .env
export const storage = new SupabaseStorage();
