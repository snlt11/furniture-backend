# Furniture Backend

A RESTful API backend service for furniture e-commerce platform built with Node.js, Express, and TypeScript.

## Features

- User Authentication (Register/Login)
- OTP Verification
- Password Management
- Role-based Authorization
- Multi-language Support (English, Burmese, Chinese)
- Rate Limiting
- Security Headers
- Cookie-based JWT Authentication
- Error Handling

## Tech Stack

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- JWT
- i18next
- bcrypt
- Express Validator

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/furniture_db"

# JWT
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd furniture-backend
```

2. Install dependencies:
```bash
npm install
```

3. Generate Prisma client:
```bash
npx prisma generate
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Start development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/v1/register` - Register new user
- `POST /api/v1/verify-otp` - Verify OTP
- `POST /api/v1/confirm-password` - Set password after OTP verification
- `POST /api/v1/login` - User login
- `POST /api/v1/logout` - User logout
- `POST /api/v1/forgot-password` - Request password reset
- `POST /api/v1/verify-otp-forgot-password` - Verify OTP for password reset
- `POST /api/v1/reset-password` - Reset password
- `POST /api/v1/change-password` - Change password

### Admin
- `GET /api/v1/admin/users` - Get all users (Admin only)

### User
- Protected routes for authenticated users

## Security Features

- HTTP-only cookies
- CORS protection
- Helmet security headers
- Rate limiting
- Password hashing
- JWT token rotation
- OTP expiration
- Request validation

## Error Handling

The API uses consistent error responses:
```json
{
  "message": "Error message",
  "error": "ERROR_CODE"
}
```

## Development

```bash
# Run in development mode
npm run dev

# Build project
npm run build

# Run in production mode
npm start
```

## Project Structure

```
src/
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── routes/         # Route definitions
├── services/       # Business logic
├── utils/          # Utility functions
├── locales/        # i18n translations
├── app.ts          # Express app setup
└── index.ts        # Entry point
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[MIT License](LICENSE)