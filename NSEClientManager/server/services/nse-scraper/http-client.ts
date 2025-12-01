import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

/**
 * NSE HTTP Client
 * Handles NSE-specific requirements: cookies, headers, rate limiting
 */
class NSEClient {
  private baseURL: string;
  private cookies: string;
  private sessionInitialized: boolean;
  private client: AxiosInstance;
  private lastRequestTime: number;
  private minRequestInterval: number; // milliseconds (200ms = 5 requests/second max)
  private consecutiveErrors: number;
  private maxConsecutiveErrors: number;
  private sessionExpiry: number; // Session expiry timestamp
  private sessionLifetime: number; // Session lifetime in milliseconds

  constructor() {
    this.baseURL = 'https://www.nseindia.com';
    this.cookies = '';
    this.sessionInitialized = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 500; // 500ms between requests (balanced for reliability)
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 5;
    this.sessionExpiry = 0;
    this.sessionLifetime = 30 * 60 * 1000; // 30 minutes

    // Create HTTP agents with keepAlive to prevent connection resets
    const httpAgent = new HttpAgent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
    });

    const httpsAgent = new HttpsAgent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
      rejectUnauthorized: false, // NSE sometimes has cert issues
    });

    this.client = axios.create({
      timeout: 300000, // 5 minutes for large PDFs
      httpAgent,
      httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      },
    });
  }

  /**
   * Initialize session by visiting NSE homepage to get cookies
   */
  async initializeSession(): Promise<void> {
    try {
      console.log('[NSE Client] Initializing session...');
      const response = await this.client.get(this.baseURL, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1',
          'upgrade-insecure-requests': '1',
        },
      });

      // Extract cookies from response
      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders) {
        this.cookies = setCookieHeaders
          .map(cookie => cookie.split(';')[0])
          .join('; ');
      }

      // Visit corporate announcements page to establish referer context
      try {
        await this.client.get('https://www.nseindia.com/companies-listing/corporate-filings-announcements', {
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.nseindia.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': this.cookies,
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
          },
        });
      } catch (e) {
        // Continue even if this fails
      }

      this.sessionInitialized = true;
      this.sessionExpiry = Date.now() + this.sessionLifetime;
      console.log('[NSE Client] Session initialized successfully');
    } catch (error) {
      console.error('[NSE Client] Failed to initialize session:', error);
      throw error;
    }
  }

  /**
   * Check if session has expired
   */
  private isSessionExpired(): boolean {
    return Date.now() > this.sessionExpiry;
  }

  /**
   * Rate limiting: ensure minimum time between requests
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Make GET request to NSE API with retry logic
   */
  async get(endpoint: string, params: Record<string, any> = {}, retries = 5): Promise<any> {
    // Initialize session if not already done or if expired
    if (!this.sessionInitialized || this.isSessionExpired()) {
      if (this.isSessionExpired()) {
        console.log('[NSE Client] Session expired, reinitializing...');
      }
      await this.initializeSession();
    }

    // If too many consecutive errors, reinitialize session
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      console.log('[NSE Client] Too many consecutive errors, reinitializing session...');
      this.sessionInitialized = false;
      this.consecutiveErrors = 0;
      await this.initializeSession();
    }

    // Apply rate limiting
    await this.rateLimit();

    const config: AxiosRequestConfig = {
      params,
      headers: {
        'Referer': 'https://www.nseindia.com/companies-listing/corporate-filings-announcements',
        'Cookie': this.cookies,
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'X-Requested-With': 'XMLHttpRequest',
      },
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
        console.log(`[NSE Client] GET ${url} (attempt ${attempt}/${retries})`);

        const response = await this.client.get(url, config);
        this.consecutiveErrors = 0; // Reset error counter on success
        return response.data;
      } catch (error: any) {
        this.consecutiveErrors++;
        const errorMsg = error.code || error.message;
        console.error(`[NSE Client] Request failed (attempt ${attempt}/${retries}):`, errorMsg);

        // Handle specific error types
        const isConnectionError = error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'EPIPE';

        const isForbidden = error.response?.status === 403;
        const isServerError = error.response?.status >= 500;

        // If connection error or 403, reinitialize session
        if ((isConnectionError || isForbidden) && attempt < retries) {
          console.log('[NSE Client] Connection/Auth error, reinitializing session...');
          this.sessionInitialized = false;
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
          await this.initializeSession();
          continue;
        }

        // If server error, wait longer
        if (isServerError && attempt < retries) {
          const backoffTime = Math.pow(2, attempt) * 2000; // Longer backoff for server errors
          console.log(`[NSE Client] Server error, waiting ${backoffTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }

        // If last attempt, throw error
        if (attempt === retries) {
          throw new Error(`NSE API request failed after ${retries} attempts: ${errorMsg}`);
        }

        // Exponential backoff with jitter
        const baseBackoff = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const backoffTime = baseBackoff + jitter;
        console.log(`[NSE Client] Waiting ${Math.round(backoffTime)}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }

    throw new Error('Unexpected error in NSE client');
  }

  /**
   * Download binary data (e.g., PDF files)
   */
  async downloadBinary(url: string): Promise<Buffer> {
    if (!this.sessionInitialized) {
      await this.initializeSession();
    }

    await this.rateLimit();

    try {
      console.log(`[NSE Client] Downloading binary: ${url}`);
      const response = await this.client.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'Referer': this.baseURL,
          'Cookie': this.cookies,
        },
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      throw new Error(`Failed to download binary: ${error.message}`);
    }
  }
}

// Export singleton instance
export const nseClient = new NSEClient();
