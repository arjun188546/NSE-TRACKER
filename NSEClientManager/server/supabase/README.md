# Supabase Backend Structure

This directory contains the file scaffolding for Supabase backend integration. The actual implementation will be completed in VS Code during backend development.

## Directory Structure

```
supabase/
├── config/
│   ├── database.ts          # Database connection configuration
│   └── supabase-client.ts   # Supabase client initialization
├── migrations/
│   └── 001_initial_schema.sql  # Initial database schema migration
├── auth/
│   ├── handlers.ts          # Authentication handlers
│   └── middleware.ts        # Auth middleware for protected routes
├── api/
│   ├── stocks.ts           # Stock-related API endpoints
│   ├── calendar.ts         # Results calendar endpoints
│   ├── results.ts          # Quarterly results endpoints
│   └── admin.ts            # Admin management endpoints
└── README.md
```

## Schema Overview

### Tables
- **users**: User accounts with subscription management
- **stocks**: NSE company stock information
- **results_calendar**: Upcoming quarterly result announcements
- **quarterly_results**: Published quarterly results with QoQ and YoY comparisons
- **candlestick_data**: Historical price data for charting
- **delivery_volume**: Delivery to trading volume percentages

## Authentication

- Admin authentication via email/password
- Client authentication via email/password
- Session-based authentication with role-based access control
- Subscription status validation middleware

## API Endpoints

### Authentication
- POST `/api/auth/login` - Client login
- POST `/api/auth/admin-login` - Admin login
- POST `/api/auth/logout` - Logout

### Stocks
- GET `/api/stocks/portfolio` - User's portfolio stocks
- GET `/api/stocks/top-performers` - Top performing stocks
- GET `/api/stocks/:symbol` - Detailed stock information

### Calendar
- GET `/api/calendar` - Results calendar with dates and companies

### Admin
- GET `/api/admin/users` - List all users
- POST `/api/admin/users/:id/activate-demo` - Activate demo for user
- POST `/api/admin/users/:id/cancel-demo` - Cancel demo for user

## Development Notes

- Use environment variables for Supabase connection strings
- Implement proper error handling and validation
- Add rate limiting for API endpoints
- Ensure proper indexing for performance
- Implement real-time subscriptions for live data updates

## Next Steps

1. Set up Supabase project
2. Run migrations to create database schema
3. Configure authentication providers
4. Implement API endpoints
5. Add real-time data polling from NSE website
6. Implement PDF parsing for quarterly results
