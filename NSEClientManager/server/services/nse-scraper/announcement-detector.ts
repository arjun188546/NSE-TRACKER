/**
 * Announcement Detector
 * Classifies NSE announcements as notification vs actual results
 * Prevents downloading notification PDFs unnecessarily
 */

export type AnnouncementType = 'notification' | 'results' | 'unknown';

export interface AnnouncementClassification {
  type: AnnouncementType;
  score: number;
  resultDeclarationDate?: Date;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Detect announcement type based on subject and description
 * This is the primary detection method - runs BEFORE PDF download
 */
export function detectAnnouncementType(announcement: any): AnnouncementClassification {
  const subject = (announcement.desc || announcement.subject || '').toLowerCase();
  const description = (announcement.attchmntText || announcement.description || '').toLowerCase();
  const combined = subject + ' ' + description;

  // PRIORITY 1: Check for definitive results indicators
  if (isResultsAnnouncement(subject, description)) {
    return {
      type: 'results',
      score: 100,
      confidence: 'high',
      reason: 'Subject: "Outcome of Board Meeting" or description contains "submitted to the Exchange"'
    };
  }

  // PRIORITY 2: Check for definitive notification indicators
  if (isNotificationAnnouncement(subject, description)) {
    const declarationDate = extractResultDeclarationDate(description);
    return {
      type: 'notification',
      score: 10,
      confidence: 'high',
      reason: 'Subject: "General Updates" or description contains "Call with Media" keywords',
      resultDeclarationDate: declarationDate
    };
  }

  // PRIORITY 3: Score based on keyword analysis
  const score = scoreAnnouncementRelevance(announcement);
  
  if (score >= 70) {
    return {
      type: 'results',
      score,
      confidence: 'medium',
      reason: 'High relevance score based on financial result keywords'
    };
  }

  if (score <= 30) {
    return {
      type: 'notification',
      score,
      confidence: 'medium',
      reason: 'Low relevance score, likely notification or non-financial announcement'
    };
  }

  return {
    type: 'unknown',
    score,
    confidence: 'low',
    reason: 'Ambiguous announcement, requires PDF analysis'
  };
}

/**
 * Check if announcement is a notification (NOT actual results)
 */
export function isNotificationAnnouncement(subject: string, description: string): boolean {
  const notificationKeywords = [
    'call with media',
    'has informed the exchange about',
    'will host',
    'will discuss',
    'will be held',
    'earnings call',
    'conference call',
    'dial-in details',
    'pre-registration',
    'universal dial-ins',
    'toll-free dial numbers',
    'investor call',
    'analysts call',
    'press conference',
    'media interaction'
  ];

  const notificationSubjects = [
    'general updates',
    'intimation',
    'announcement',
    'intimation of',
    'press release'
  ];

  // Check subject
  const subjectLower = subject.toLowerCase();
  if (notificationSubjects.some(keyword => subjectLower.includes(keyword))) {
    // Additional check: if description mentions results but subject is "General Updates",
    // it's still a notification UNLESS it says "submitted to the Exchange"
    if (!description.includes('submitted to the exchange')) {
      return true;
    }
  }

  // Check description
  const descLower = description.toLowerCase();
  return notificationKeywords.some(keyword => descLower.includes(keyword));
}

/**
 * Check if announcement contains actual results
 */
export function isResultsAnnouncement(subject: string, description: string): boolean {
  const resultsKeywords = [
    'submitted to the exchange',
    'unaudited financial results',
    'audited financial results',
    'financial results (standalone and consolidated)',
    'quarterly results',
    'standalone and consolidated'
  ];

  const resultsSubjects = [
    'outcome of board meeting',
    'financial results',
    'quarterly results',
    'annual results',
    'un-audited financial results'
  ];

  // Check subject
  const subjectLower = subject.toLowerCase();
  if (resultsSubjects.some(keyword => subjectLower.includes(keyword))) {
    return true;
  }

  // Check description for definitive phrases
  const descLower = description.toLowerCase();
  return resultsKeywords.some(keyword => descLower.includes(keyword));
}

/**
 * Score announcement relevance (0-100)
 * Higher scores = more likely to be actual results
 */
export function scoreAnnouncementRelevance(announcement: any): number {
  const subject = (announcement.desc || announcement.subject || '').toLowerCase();
  const description = (announcement.attchmntText || announcement.description || '').toLowerCase();
  const combined = subject + ' ' + description;

  let score = 0;

  // Definitive results indicators (100 points)
  if (subject.includes('outcome of board meeting') && description.includes('submitted to the exchange')) {
    return 100;
  }

  // Strong results indicators (70-90 points)
  if (subject.includes('outcome of board meeting')) score += 70;
  if (description.includes('submitted to the exchange')) score += 80;
  if (description.includes('unaudited financial results')) score += 75;
  if (description.includes('audited financial results')) score += 75;
  if (description.includes('standalone and consolidated')) score += 60;

  // Moderate results indicators (40-60 points)
  if (combined.includes('financial results')) score += 50;
  if (combined.includes('quarterly results')) score += 50;
  if (combined.includes('q1') || combined.includes('q2') || combined.includes('q3') || combined.includes('q4')) score += 40;

  // Notification indicators (negative points)
  if (subject.includes('general updates')) score -= 60;
  if (description.includes('call with media')) score -= 70;
  if (description.includes('has informed the exchange about')) score -= 50;
  if (combined.includes('earnings call')) score -= 60;
  if (combined.includes('conference call')) score -= 60;
  if (combined.includes('dial-in')) score -= 70;

  // Cap score between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Extract result declaration date from notification description
 * Examples:
 * - "on October 18, 2025"
 * - "dated 18-Oct-2025"
 * - "to be held on 18th October, 2025"
 */
export function extractResultDeclarationDate(description: string): Date | undefined {
  // Pattern 1: "on October 18, 2025" or "on 18th October, 2025"
  const pattern1 = /on\s+(\d{1,2}(?:st|nd|rd|th)?)\s+([A-Za-z]+)[,\s]+(\d{4})/i;
  const match1 = description.match(pattern1);
  if (match1) {
    const day = parseInt(match1[1].replace(/\D/g, ''));
    const month = parseMonth(match1[2]);
    const year = parseInt(match1[3]);
    if (month !== -1) {
      return new Date(year, month, day);
    }
  }

  // Pattern 2: "dated 18-Oct-2025" or "18-Oct-2025"
  const pattern2 = /(\d{1,2})-([A-Za-z]{3})-(\d{4})/i;
  const match2 = description.match(pattern2);
  if (match2) {
    const day = parseInt(match2[1]);
    const month = parseMonth(match2[2]);
    const year = parseInt(match2[3]);
    if (month !== -1) {
      return new Date(year, month, day);
    }
  }

  // Pattern 3: "October 18, 2025"
  const pattern3 = /([A-Za-z]+)\s+(\d{1,2})[,\s]+(\d{4})/i;
  const match3 = description.match(pattern3);
  if (match3) {
    const month = parseMonth(match3[1]);
    const day = parseInt(match3[2]);
    const year = parseInt(match3[3]);
    if (month !== -1) {
      return new Date(year, month, day);
    }
  }

  return undefined;
}

/**
 * Parse month name to number (0-11)
 */
function parseMonth(monthStr: string): number {
  const months: Record<string, number> = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  };

  return months[monthStr.toLowerCase()] ?? -1;
}

/**
 * Validate PDF content matches detected announcement type
 * Use this for cross-checking after PDF download
 */
export function validatePDFContent(pdfText: string, announcementType: AnnouncementType): {
  isValid: boolean;
  warning?: string;
} {
  const lowerText = pdfText.toLowerCase();

  if (announcementType === 'results') {
    // Check for financial tables/numbers
    const hasFinancialData = 
      lowerText.includes('revenue') ||
      lowerText.includes('net profit') ||
      lowerText.includes('eps') ||
      lowerText.includes('total income') ||
      lowerText.includes('profit after tax');

    if (!hasFinancialData) {
      return {
        isValid: false,
        warning: 'PDF classified as results but no financial data found. May be notification PDF.'
      };
    }
  }

  if (announcementType === 'notification') {
    // Check for earnings call keywords
    const hasCallInfo = 
      lowerText.includes('dial-in') ||
      lowerText.includes('conference call') ||
      lowerText.includes('earnings call') ||
      lowerText.includes('toll free');

    if (hasCallInfo) {
      return {
        isValid: true
      };
    }

    return {
      isValid: false,
      warning: 'PDF classified as notification but no call information found.'
    };
  }

  return { isValid: true };
}

/**
 * Detect PDF type from content (fallback method when metadata is ambiguous)
 */
export function detectPDFType(pdfText: string): 'notification' | 'results' | 'unknown' {
  const lowerText = pdfText.toLowerCase();

  // Strong notification indicators
  const notificationKeywords = [
    'call with media',
    'dial-in details',
    'conference call',
    'earnings call',
    'toll-free',
    'universal dial-ins',
    'pre-registration'
  ];

  const notificationCount = notificationKeywords.filter(keyword => 
    lowerText.includes(keyword)
  ).length;

  if (notificationCount >= 2) {
    return 'notification';
  }

  // Strong results indicators
  const resultsKeywords = [
    'revenue',
    'net profit',
    'earnings per share',
    'total income',
    'profit after tax',
    'ebitda',
    'operating profit'
  ];

  const resultsCount = resultsKeywords.filter(keyword =>
    lowerText.includes(keyword)
  ).length;

  if (resultsCount >= 3) {
    return 'results';
  }

  return 'unknown';
}
