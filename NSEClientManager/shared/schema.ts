import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, decimal, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with subscription and role management
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("client"), // 'admin' or 'client'
  subscriptionStatus: text("subscription_status").notNull().default("inactive"), // 'active', 'inactive', 'demo'
  demoExpiresAt: timestamp("demo_expires_at"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Stocks/Companies table
export const stocks = pgTable("stocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().unique(),
  companyName: text("company_name").notNull(),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }),
  percentChange: decimal("percent_change", { precision: 5, scale: 2 }),
  volume: integer("volume"),
  // Additional trading data
  lastTradedPrice: decimal("last_traded_price", { precision: 10, scale: 2 }),
  lastTradedQuantity: integer("last_traded_quantity"),
  lastTradedTime: text("last_traded_time"),
  dayHigh: decimal("day_high", { precision: 10, scale: 2 }),
  dayLow: decimal("day_low", { precision: 10, scale: 2 }),
  openPrice: decimal("open_price", { precision: 10, scale: 2 }),
  previousClose: decimal("previous_close", { precision: 10, scale: 2 }),
  yearHigh: decimal("year_high", { precision: 10, scale: 2 }),
  yearLow: decimal("year_low", { precision: 10, scale: 2 }),
  totalBuyQuantity: integer("total_buy_quantity"),
  totalSellQuantity: integer("total_sell_quantity"),
  totalTradedValue: decimal("total_traded_value", { precision: 15, scale: 2 }),
  totalTradedVolume: integer("total_traded_volume"),
  averagePrice: decimal("average_price", { precision: 10, scale: 2 }),
  sector: text("sector"),
  marketCap: text("market_cap"),
  lastUpdated: timestamp("last_updated").default(sql`now()`),
  // Data freshness tracking
  lastCandlestickUpdate: timestamp("last_candlestick_update"),
  lastDeliveryUpdate: timestamp("last_delivery_update"),
  lastLivePriceUpdate: timestamp("last_live_price_update"),
});

// Scraping Jobs - track NSE data fetching status
export const scrapingJobs = pgTable("scraping_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobType: text("job_type").notNull(), // 'results', 'candlestick', 'delivery', 'calendar'
  stockId: varchar("stock_id").references(() => stocks.id),
  status: text("status").notNull().default("pending"), // 'pending', 'running', 'completed', 'failed'
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Results Calendar - upcoming quarterly result announcements
export const resultsCalendar = pgTable("results_calendar", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stockId: varchar("stock_id").notNull().references(() => stocks.id),
  announcementDate: date("announcement_date").notNull(),
  resultStatus: text("result_status").notNull().default("waiting"), // 'waiting', 'received', 'ready'
  quarter: text("quarter").notNull(), // 'Q1', 'Q2', 'Q3', 'Q4'
  fiscalYear: text("fiscal_year").notNull(),
  pdfUrl: text("pdf_url"), // NSE PDF download URL
  pdfDownloadedAt: timestamp("pdf_downloaded_at"),
  // Real-time status tracking
  volume: integer("volume"),
  processingStatus: text("processing_status").default("waiting"), // 'waiting', 'received', 'ready'
  pdfDownloadStatus: text("pdf_download_status").default("pending"), // 'pending', 'available', 'downloaded', 'failed'
  announcementDetectedAt: timestamp("announcement_detected_at"),
  pdfAvailableAt: timestamp("pdf_available_at"),
  parsingCompletedAt: timestamp("parsing_completed_at"),
  // Announcement type tracking
  announcementType: text("announcement_type"), // 'notification', 'results', 'unknown'
  resultDeclarationDate: date("result_declaration_date"), // When results will be published (from notifications)
  pdfType: text("pdf_type"), // Type of PDF attached
  notificationText: text("notification_text"), // Store notification description for reference
});

// Quarterly Results data
export const quarterlyResults = pgTable("quarterly_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stockId: varchar("stock_id").notNull().references(() => stocks.id),
  quarter: text("quarter").notNull(),
  fiscalYear: text("fiscal_year").notNull(),
  // Current quarter data
  revenue: decimal("revenue", { precision: 15, scale: 2 }),
  profit: decimal("profit", { precision: 15, scale: 2 }),
  eps: decimal("eps", { precision: 10, scale: 4 }),
  operatingProfit: decimal("operating_profit", { precision: 15, scale: 2 }),
  operatingProfitMargin: decimal("operating_profit_margin", { precision: 5, scale: 2 }),
  ebitda: decimal("ebitda", { precision: 15, scale: 2 }),
  ebitdaMargin: decimal("ebitda_margin", { precision: 5, scale: 2 }),
  totalIncome: decimal("total_income", { precision: 15, scale: 2 }),
  totalExpenses: decimal("total_expenses", { precision: 15, scale: 2 }),
  patMargin: decimal("pat_margin", { precision: 5, scale: 2 }),
  roe: decimal("roe", { precision: 5, scale: 2 }),
  roce: decimal("roce", { precision: 5, scale: 2 }),
  // Previous quarter data (for display)
  prevRevenue: decimal("prev_revenue", { precision: 15, scale: 2 }),
  prevProfit: decimal("prev_profit", { precision: 15, scale: 2 }),
  prevEps: decimal("prev_eps", { precision: 10, scale: 4 }),
  prevOperatingProfit: decimal("prev_operating_profit", { precision: 15, scale: 2 }),
  // Year ago data (for display)
  yearAgoRevenue: decimal("year_ago_revenue", { precision: 15, scale: 2 }),
  yearAgoProfit: decimal("year_ago_profit", { precision: 15, scale: 2 }),
  yearAgoEps: decimal("year_ago_eps", { precision: 10, scale: 4 }),
  yearAgoOperatingProfit: decimal("year_ago_operating_profit", { precision: 15, scale: 2 }),
  // QoQ comparison
  revenueQoQ: decimal("revenue_qoq", { precision: 5, scale: 2 }),
  profitQoQ: decimal("profit_qoq", { precision: 5, scale: 2 }),
  epsQoQ: decimal("eps_qoq", { precision: 5, scale: 2 }),
  operatingProfitQoQ: decimal("operating_profit_qoq", { precision: 5, scale: 2 }),
  operatingProfitMarginQoQ: decimal("operating_profit_margin_qoq", { precision: 5, scale: 2 }),
  // YoY comparison
  revenueYoY: decimal("revenue_yoy", { precision: 5, scale: 2 }),
  profitYoY: decimal("profit_yoy", { precision: 5, scale: 2 }),
  epsYoY: decimal("eps_yoy", { precision: 5, scale: 2 }),
  operatingProfitYoY: decimal("operating_profit_yoy", { precision: 5, scale: 2 }),
  operatingProfitMarginYoY: decimal("operating_profit_margin_yoy", { precision: 5, scale: 2 }),
  publishedAt: timestamp("published_at").default(sql`now()`),
});

// Candlestick data for charts
export const candlestickData = pgTable("candlestick_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stockId: varchar("stock_id").notNull().references(() => stocks.id),
  date: date("date").notNull(),
  open: decimal("open", { precision: 10, scale: 2 }).notNull(),
  high: decimal("high", { precision: 10, scale: 2 }).notNull(),
  low: decimal("low", { precision: 10, scale: 2 }).notNull(),
  close: decimal("close", { precision: 10, scale: 2 }).notNull(),
  volume: integer("volume").notNull(),
});

// Delivery volume data
export const deliveryVolume = pgTable("delivery_volume", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stockId: varchar("stock_id").notNull().references(() => stocks.id),
  date: date("date").notNull(),
  deliveryQuantity: integer("delivery_quantity").notNull(),
  tradedQuantity: integer("traded_quantity").notNull(),
  deliveryPercentage: decimal("delivery_percentage", { precision: 5, scale: 2 }).notNull(),
});

// Live prices for intraday data
export const livePrices = pgTable("live_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stockId: varchar("stock_id").notNull().references(() => stocks.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  volume: integer("volume"),
  isMarketOpen: boolean("is_market_open").default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Insert schemas
export const insertScrapingJobSchema = createInsertSchema(scrapingJobs).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertStockSchema = createInsertSchema(stocks).omit({
  id: true,
  lastUpdated: true,
});

export const insertResultsCalendarSchema = createInsertSchema(resultsCalendar).omit({
  id: true,
});

export const insertQuarterlyResultsSchema = createInsertSchema(quarterlyResults).omit({
  id: true,
  publishedAt: true,
});

export const insertCandlestickDataSchema = createInsertSchema(candlestickData).omit({
  id: true,
});

export const insertDeliveryVolumeSchema = createInsertSchema(deliveryVolume).omit({
  id: true,
});

export const insertLivePriceSchema = createInsertSchema(livePrices).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Types
export type InsertScrapingJob = z.infer<typeof insertScrapingJobSchema>;
export type ScrapingJob = typeof scrapingJobs.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStock = z.infer<typeof insertStockSchema>;
export type Stock = typeof stocks.$inferSelect;

export type InsertResultsCalendar = z.infer<typeof insertResultsCalendarSchema>;
export type ResultsCalendar = typeof resultsCalendar.$inferSelect;

export type InsertQuarterlyResults = z.infer<typeof insertQuarterlyResultsSchema>;
export type QuarterlyResults = typeof quarterlyResults.$inferSelect;

export type InsertCandlestickData = z.infer<typeof insertCandlestickDataSchema>;
export type CandlestickData = typeof candlestickData.$inferSelect;

export type InsertDeliveryVolume = z.infer<typeof insertDeliveryVolumeSchema>;
export type DeliveryVolume = typeof deliveryVolume.$inferSelect;

export type InsertLivePrice = z.infer<typeof insertLivePriceSchema>;
export type LivePrice = typeof livePrices.$inferSelect;

export type LoginData = z.infer<typeof loginSchema>;

// Extended types with relations
export type StockWithCalendar = Stock & {
  calendar?: ResultsCalendar;
};

export type StockDetail = Stock & {
  results?: QuarterlyResults;
  candlestickData?: CandlestickData[];
  deliveryVolume?: DeliveryVolume[];
};
