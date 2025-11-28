# Detailed Requirement Document for NSE Project

Confidential • Revision 1

Author – Abhijit Shedage

---

## Background
- As per the set process, every company listed on NSE needs to declare their quarterly results for every quarter (after 3 months).
- Most of the shares follow the movement after their results get declared.
- A few existing websites (e.g., moneycontrol, Motilal Oswal) capture these results and show them after market hours.

## Scope
- Capture the quarterly results from the NSE website and show them as and when they are published (near real-time), not only after market hours.

## Details with Examples
- Before publishing the results, companies need to notify NSE when they are going to publish the results.
- On the UI, show the date‑wise company names by their intended result publication date (reference UI style: Moneycontrol).
- Example of date strip with counts:
  - 05 Nov — 116 Earnings
  - 06 Nov — 171 Earnings
  - 07 Nov — 199 Earnings
  - 08 Nov — 110 Earnings
  - 09 Nov — 5 Earnings
  - 10 Nov — 279 Earnings
- If the user clicks a date (e.g., 05 Nov), list all companies scheduled for that date one by one. Provide filter controls while listing.

### Daily Listing Table
Columns:
- Symbol
- Current MP
- % change (green or red)
- Volume
- Result status

Result status values:
- Waiting
- Received
- Ready for analysis (show in Green when ready)

Each symbol in the list is a hyperlink that opens a new page with three windows.

## Three-Window Detail Page
When a user clicks a symbol hyperlink, open a new page with the following three windows:

1) First Window – Quarterly Results Comparison
- Show the latest results comparison with QoQ and YoY.
- Reference metrics as per example screenshot (e.g., Revenue, Net Profit, EPS, Operating Profit, Operating Profit Margin, etc.).
- If results are not yet received, display a message like “Waiting for results”.

2) Second Window – Candlestick Chart
- Show a candlestick chart for the last 21 days (3 weeks) by default.
- Provide a control to change how many days the user wants to see.
- Include basic indicators: EMA, RSA, VOLUME (as specified in the document).

3) Third Window – Delivery to Trading Volume %
- Show the latest Delivery to Trading Volume percentage.
- This data is available on the NSE site; display at least 3 weeks of data (same time span as the candle chart).
- Present in a tabular form similar to NSE (e.g., Date, Prev Close, Open, High, Low, Last, Close Price, VWAP, Total Traded Quantity, Turnover, No. of Trades, Deliverable Quantity, % Delivery Traded Qty, etc.).

## Data Acquisition & Processing
- The program should continuously poll the NSE results page to check the results of all symbols.
- When the desired symbol’s result appears on the NSE site:
  - Download the corresponding PDF.
  - Parse the results table from the PDF.
  - Store the parsed data in the database.
- Once the data is stored, update the Results Status column for that symbol to “Ready” (in Green).

## Behavior When Results Are Not Available
- If results are not yet received and the user clicks a symbol link:
  - First Window: show a message like “Waiting for results”.
  - Second Window: still show the candlestick chart per requirements.
  - Third Window: still show the delivery vs. trading volume data per requirements.

## User Flow Summary
1. User selects a date from the date strip with earnings counts.
2. The app lists all companies for that date in a table with filters.
3. User clicks a company (hyperlink) to open the three‑window detail page.
4. The app shows:
   - Latest QoQ/YoY results (or “Waiting for results” if unavailable),
   - Candlestick chart (21 days by default, adjustable),
   - Delivery vs. trading volume table (≥ 3 weeks).
5. As background jobs fetch and parse NSE PDFs, the corresponding symbol’s status transitions to Ready (in Green).

## Notes
- All requirements above are transcribed from the provided client document and images titled “Detailed Requirement Document for NSE Project” and “NSE DD2”.
- Metric names and table columns should follow the NSE/industry conventions; screenshots are illustrative for content and layout.



Client (active): email: client@example.com / password: client123
Client (demo): email: demo@example.com / password: demo123
Demo auto-expires in 7 days; expired demos are blocked.
Client (inactive): email: inactive@example.com / password: inactive123
Can sign in, but protected data routes will return “Active subscription required.”
Admin: email: admin@nse-platform.com / password: admin123