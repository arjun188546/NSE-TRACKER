/**
 * PDF Parser Registry
 * Maps stock symbols to their specific parsers
 * Automatically selects correct parser based on company
 */

import { CompanyPDFParser, PDFParseResult } from './base-parser';
import { TCSParser } from './tcs-parser';
import { InfosysParser } from './infosys-parser';
import { WiproParser } from './wipro-parser';
import { RelianceParser } from './reliance-parser';
import { ICICIBankParser } from './icicibank-parser';
import { HDFCBankParser } from './hdfcbank-parser';
import { AxisBankParser } from './axisbank-parser';
import { BhartiAirtelParser } from './bhartiairtel-parser';
import { ITCParser } from './itc-parser';
import { TataSteelParser } from './tatasteel-parser';
import { GenericParser } from './generic-parser';

class ParserRegistry {
  private parsers: Map<string, CompanyPDFParser>;

  constructor() {
    this.parsers = new Map();
    this.registerParsers();
  }

  /**
   * Register all company-specific parsers
   */
  private registerParsers() {
    // IT Services
    this.parsers.set('TCS', new TCSParser());
    this.parsers.set('INFY', new InfosysParser());
    this.parsers.set('WIPRO', new WiproParser());
    
    // Conglomerates
    this.parsers.set('RELIANCE', new RelianceParser());
    
    // Banking & Financial Services
    this.parsers.set('HDFCBANK', new HDFCBankParser());
    this.parsers.set('ICICIBANK', new ICICIBankParser());
    this.parsers.set('AXISBANK', new AxisBankParser());
    
    // Telecom
    this.parsers.set('BHARTIARTL', new BhartiAirtelParser());
    
    // FMCG & Consumer
    this.parsers.set('ITC', new ITCParser());
    
    // Metals
    this.parsers.set('TATASTEEL', new TataSteelParser());

    console.log(`[Parser Registry] Registered ${this.parsers.size} company-specific parsers`);
  }

  /**
   * Get parser for a specific stock symbol
   */
  getParser(symbol: string): CompanyPDFParser {
    const parser = this.parsers.get(symbol);
    
    if (parser) {
      return parser;
    }

    // Fallback to generic parser for unknown companies
    console.warn(`[Parser Registry] No specific parser for ${symbol}, using generic parser`);
    return new GenericParser(symbol, `${symbol} Company`);
  }

  /**
   * Parse PDF for a specific company
   */
  async parsePDF(symbol: string, pdfUrl: string): Promise<PDFParseResult> {
    const parser = this.getParser(symbol);
    return await parser.parsePDF(pdfUrl);
  }

  /**
   * Check if specific parser exists for symbol
   */
  hasSpecificParser(symbol: string): boolean {
    return this.parsers.has(symbol);
  }

  /**
   * Get list of supported symbols
   */
  getSupportedSymbols(): string[] {
    return Array.from(this.parsers.keys());
  }
}

// Export singleton instance
export const parserRegistry = new ParserRegistry();
