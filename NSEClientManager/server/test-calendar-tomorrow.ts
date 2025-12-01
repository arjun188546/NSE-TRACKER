/**
 * Test script to check tomorrow's results calendar
 */

import { storage } from './storage';
import { addDays, format } from 'date-fns';

async function checkTomorrowsCalendar() {
  console.log('🗓️  Checking Results Calendar for Tomorrow\n');
  console.log('='.repeat(60));

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  console.log(`Today: ${format(today, 'MMMM dd, yyyy')}`);
  console.log(`Tomorrow: ${format(tomorrow, 'MMMM dd, yyyy')}`);
  console.log('='.repeat(60));
  console.log();

  try {
    // Get all calendar entries
    const calendarData = await storage.getResultsCalendar();
    const calendar = calendarData.stocks || [];
    
    console.log(`📊 Total calendar entries: ${calendar.length}\n`);

    // Filter for tomorrow's announcements
    const tomorrowAnnouncements = calendar.filter(stock => {
      if (!stock.calendar) return false;
      const entryDate = format(new Date(stock.calendar.announcementDate), 'yyyy-MM-dd');
      return entryDate === tomorrowStr;
    });

    if (tomorrowAnnouncements.length === 0) {
      console.log('⚠️  No results scheduled for tomorrow\n');
      
      // Show next few days
      console.log('📅 Upcoming announcements (next 7 days):');
      const upcoming = calendar
        .filter(stock => stock.calendar && new Date(stock.calendar.announcementDate) >= today)
        .sort((a, b) => new Date(a.calendar!.announcementDate).getTime() - new Date(b.calendar!.announcementDate).getTime())
        .slice(0, 10);

      if (upcoming.length === 0) {
        console.log('  No upcoming announcements found');
      } else {
        for (const stock of upcoming) {
          const dateStr = format(new Date(stock.calendar!.announcementDate), 'MMM dd, yyyy');
          console.log(`  ${dateStr} - ${stock.symbol} (${stock.calendar!.quarter} ${stock.calendar!.fiscalYear})`);
        }
      }
    } else {
      console.log(`✅ ${tomorrowAnnouncements.length} companies announcing results tomorrow:\n`);

      for (const stock of tomorrowAnnouncements) {
        console.log(`Company: ${stock.symbol}`);
        console.log(`  Name: ${stock.companyName || 'N/A'}`);
        console.log(`  Quarter: ${stock.calendar!.quarter} ${stock.calendar!.fiscalYear}`);
        console.log(`  Status: ${stock.calendar!.resultStatus}`);
        console.log(`  PDF Available: ${stock.calendar!.pdfUrl ? 'Yes' : 'No'}`);
        console.log();
      }
    }

    console.log('='.repeat(60));
    console.log('✅ Check completed');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

checkTomorrowsCalendar();
