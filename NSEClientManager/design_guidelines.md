# Design Guidelines: NSE Stock Analysis Platform

## Design Approach

**Selected Approach:** Reference-Based (Financial Trading Platforms)
**Primary References:** Robinhood, Webull, TradingView, Bloomberg Terminal
**Justification:** Financial data visualization requires established patterns for credibility, real-time data displays, and chart-heavy interfaces. Users expect familiar trading platform conventions.

## Core Design Elements

### Typography
- **Primary Font:** Inter or DM Sans (via Google Fonts CDN)
- **Monospace Font:** JetBrains Mono for numerical data, stock prices, percentages
- **Hierarchy:**
  - Page titles: 32px, semibold
  - Section headings: 24px, semibold
  - Card titles: 18px, medium
  - Data labels: 14px, regular
  - Stock prices/values: 20-24px, medium (monospace)
  - Percentage changes: 16px, medium (monospace)
  - Table headers: 12px, uppercase, semibold, letter-spacing

### Layout System
**Tailwind Spacing Units:** Consistently use 2, 4, 6, 8, 12, 16
- Component padding: p-6
- Card gaps: gap-6
- Section spacing: space-y-8
- Page margins: px-6 lg:px-8
- Grid gaps: gap-4 or gap-6

### Component Library

#### Navigation
- **Top Bar:** Fixed header with logo left, user profile/subscription status right
- **Admin Sidebar:** Collapsible left sidebar (w-64) with user management sections
- **Client Dashboard:** Top navigation with tabs (Overview, Results Calendar, Watchlist, Settings)

#### Data Display Components

**Results Calendar Card:**
- Grid layout showing dates with company count badges
- Click to expand showing company list
- Filter controls: date range, sector, market cap

**Stock Symbol Table:**
- Columns: Symbol (hyperlink), Current MP, % Change, Volume, Result Status
- Status badges: "Waiting" (amber), "Received" (blue), "Ready for analysis" (green)
- Sortable columns with arrow indicators
- Hover row highlight

**Three-Panel Detail View:**
1. **Results Comparison Panel:**
   - Data table with QoQ and YoY columns
   - Highlight positive values (green text), negative (red text)
   - Clear column headers with tooltips

2. **Candlestick Chart Panel:**
   - Full-width chart using Chart.js or Lightweight Charts library
   - 21-day default view with range selector (1W, 1M, 3M, 6M, 1Y)
   - Indicators toggles: EMA, RSI, Volume (bottom sub-chart)
   - Crosshair with price/date info on hover

3. **Delivery Volume Panel:**
   - Bar/line chart showing delivery to trading volume %
   - 3-week default timeframe
   - Threshold line at typical delivery percentage

**Admin Dashboard Components:**
- User table with columns: Email, Subscription Status, Demo Active, Last Login, Actions
- Action buttons: "Activate Demo", "Cancel Demo", "View Dashboard"
- Quick stats cards: Total Users, Active Subscriptions, Active Demos, Revenue

**Portfolio Cards (from reference image):**
- Dark card background with subtle border
- Large stock price (top left)
- Percentage change with directional arrow
- Mini sparkline chart
- Company logo/symbol badge

#### Form Elements
- Text inputs: Dark background, light border, focused state with accent border
- Buttons: Primary (orange/amber), Secondary (dark with border), Danger (red)
- Checkboxes/toggles for filters and settings
- Date pickers for calendar range selection

#### Overlays
- Modal dialogs: Centered, max-w-2xl, backdrop blur
- Toast notifications: Top-right positioned for status updates (success/error/info)
- Loading states: Skeleton loaders for tables and charts

### Visual Treatment (Reference Image Style)

**Dashboard Layout:**
- Dark background (#0f1419 or similar deep charcoal)
- Cards: Slightly lighter dark (#1a1f2e), 1px subtle border
- Accent color: Orange/amber (#ff6b35 or #f97316) for CTAs, positive indicators, charts
- Use red (#ef4444) for negative changes, losses
- Use green (#10b981) for positive changes, gains

**Data Visualization:**
- Candlestick colors: Green (up), Red (down)
- Chart grid lines: Subtle gray (#2d3748)
- Volume bars: Semi-transparent accent color
- Indicator lines: Distinct colors (blue for EMA, purple for RSI)

**Spacing & Density:**
- Dashboard grid: 2-3 columns on desktop, responsive stack on mobile
- Card padding: p-6
- Tables: Comfortable row height (h-12), alternating subtle row background

### Icons
**Library:** Heroicons via CDN
**Usage:**
- Status indicators (clock, check, alert)
- Action buttons (refresh, filter, download)
- Navigation items (dashboard, users, settings)
- Trend indicators (arrow-up, arrow-down)
- Chart controls (zoom, range selectors)

### Responsive Behavior
- Desktop (lg+): Full three-panel layout, multi-column dashboard grid
- Tablet (md): Two-column grid, tabs for detail panels
- Mobile: Single column, collapsible sections, simplified charts

### Subscription Access States
- **Active:** Full dashboard access, all features enabled
- **Expired:** Dashboard visible but blurred with upgrade overlay, limited to view-only calendar
- **Demo:** Full access with "Demo Mode" banner, countdown timer visible

### Admin-Specific Design
- Distinct header background to differentiate from client view
- User action buttons clearly labeled with confirmation modals
- Real-time status indicators for demo expirations
- Search and filter toolbar for user management table

**No animations** except:
- Smooth scroll to detailed view on symbol click
- Chart crosshair following cursor
- Toast notification slide-in

This design creates a professional, data-dense trading platform interface that prioritizes clarity, real-time information display, and efficient user workflows for both clients and administrators.