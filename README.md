# Autofixer API

Mobile Automotive AC Service API for Santiago, Chile.

## Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.7
- **ORM**: Prisma 6.x
- **Database**: PostgreSQL (Neon)
- **Authentication**: JWT + Google OAuth
- **API Documentation**: Swagger/OpenAPI

## Project Structure

```
src/
├── auth/           # Authentication (JWT, Google OAuth)
├── users/          # User management
├── bookings/       # Booking management
├── quotes/         # Quote calculator
├── services/       # Service catalog
├── notifications/  # Email/Push notifications
├── payments/       # Flow.cl, WebPay integration
├── sii/           # Chilean tax authority (SII) integration
├── admin/         # Admin operations
├── common/        # Shared decorators, filters, interceptors
├── prisma/        # Prisma service
└── main.ts        # Application bootstrap
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or Neon cloud)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth credentials

## API Documentation

When running in development mode, Swagger docs are available at:
```
http://localhost:3000/api/docs
```

## Services & Pricing

| Service | Base Price (CLP) |
|---------|-----------------|
| Diagnóstico | $25,000 |
| Carga R134a | desde $35,000 |
| Carga R1234yf | desde $90,000 |
| Sanitización | desde $45,000 |

Pricing formula:
- **Total** = Labor + Parts + Materials + Travel - Discount + IVA (19%)

## Roles

- `ADMIN` - Full system access
- `TECHNICIAN` - Technician features, assigned bookings
- `CLIENT` - Bookings, quotes, reviews

## API Endpoints

### Authentication
- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/login` - Login
- `POST /v1/auth/google` - Google OAuth
- `POST /v1/auth/refresh` - Refresh token
- `POST /v1/auth/logout` - Logout

### Users
- `GET /v1/users/profile` - Get profile
- `PUT /v1/users/profile` - Update profile
- `GET /v1/users/technicians` - List technicians

### Bookings
- `POST /v1/bookings` - Create booking
- `GET /v1/bookings` - List bookings
- `GET /v1/bookings/:id` - Get booking
- `PUT /v1/bookings/:id` - Update booking
- `PUT /v1/bookings/:id/status` - Update status

### Quotes
- `POST /v1/quotes/calculate` - Calculate quote
- `POST /v1/quotes` - Save quote
- `GET /v1/quotes` - List quotes

### Services
- `GET /v1/services` - List services
- `GET /v1/services/popular` - Popular services
- `GET /v1/services/symptoms` - Symptoms list

### Payments (Admin)
- `POST /v1/payments` - Create payment
- `GET /v1/payments/:id` - Get status
- `POST /v1/payments/:id/refund` - Refund

### SII (Admin)
- `POST /v1/sii/boleta/:bookingId` - Generate boleta
- `POST /v1/sii/factura/:bookingId` - Generate factura
- `POST /v1/sii/void/:documentNumber` - Void document

### Admin
- `GET /v1/admin/dashboard` - Dashboard stats
- `GET /v1/admin/technicians/report` - Technician report
- `GET /v1/admin/revenue` - Revenue report

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start in development mode |
| `npm run start:prod` | Start in production mode |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:seed` | Seed database |

## License

Proprietary - Autofixer SpA
