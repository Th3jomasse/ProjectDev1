# 🚀 Development Guide - POS System

## Quick Start

### Prerequisites

```bash
Node.js >= 20.0.0
pnpm >= 8.0.0
Docker >= 24.0.0
Docker Compose >= 2.0.0
```

### Installation & Setup

```bash
# 1. Install pnpm globally
npm install -g pnpm

# 2. Install all dependencies
pnpm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Start infrastructure (PostgreSQL + Redis)
docker-compose up -d

# 5. Wait for PostgreSQL to be ready (check logs)
docker-compose logs -f postgres
# Look for: "database system is ready to accept connections"

# 6. Generate Prisma Client
pnpm prisma:generate

# 7. Run database migrations
pnpm prisma:migrate

# 8. Start the Auth Service
cd apps/auth-service
pnpm start:dev
```

## 🎯 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Auth Service API** | http://localhost:3001 | - |
| **Swagger Docs** | http://localhost:3001/api/docs | - |
| **Adminer (DB UI)** | http://localhost:8080 | postgres/postgres |
| **Prisma Studio** | http://localhost:5555 | Run `pnpm prisma:studio` |

## 📁 Project Structure

```
pos-system/
├── apps/
│   └── auth-service/          ✅ COMPLETED
│       ├── src/
│       │   ├── auth/          # JWT auth, strategies, guards
│       │   ├── prisma/        # Prisma service
│       │   └── main.ts        # Entry point
│       └── package.json
│
├── prisma/
│   └── schema.prisma          ✅ Complete schema with 10 models
│
├── docker-compose.yml         ✅ PostgreSQL + Redis + Adminer
├── package.json               ✅ All dependencies configured
└── tsconfig.base.json         ✅ Strict TypeScript setup
```

## 🧪 Testing the Auth Service

### Using cURL

**1. Register a new user**

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@restaurant.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN"
  }'
```

**2. Login**

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@restaurant.com",
    "password": "SecurePass123!"
  }'
```

**Save the accessToken from the response!**

**3. Get current user profile**

```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

**4. Refresh access token**

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<YOUR_REFRESH_TOKEN>"
  }'
```

### Using Swagger UI (Recommended)

1. Open http://localhost:3001/api/docs
2. Click "Try it out" on any endpoint
3. Fill in the request body
4. Click "Execute"
5. See the response!

For protected endpoints (with 🔒 lock icon):
1. Get an accessToken from /auth/login
2. Click "Authorize" button at top
3. Enter: `Bearer <YOUR_TOKEN>`
4. Now you can call protected endpoints

## 🗄️ Database

### Models Available

- ✅ **User** - Authentication with roles (ADMIN, MANAGER, SERVER, KITCHEN, HOST)
- ✅ **Organization** - Multi-tenant organizations
- ✅ **Location** - Restaurant locations
- ✅ **Category** - Product categories
- ✅ **Product** - Menu items
- ✅ **Table** - Tables with status (AVAILABLE, OCCUPIED, RESERVED, etc.)
- ✅ **Order** - Orders with status workflow
- ✅ **Payment** - Payment processing
- ✅ **Customer** - Customer profiles with loyalty

### Useful Prisma Commands

```bash
# Open Prisma Studio (Visual DB editor)
pnpm prisma:studio

# Create a new migration
pnpm prisma migrate dev --name your_migration_name

# Reset database (⚠️ Deletes all data!)
pnpm prisma migrate reset

# Generate Prisma Client (after schema changes)
pnpm prisma:generate

# Format schema file
npx prisma format
```

### Connect to PostgreSQL directly

```bash
# Via Docker
docker-compose exec postgres psql -U postgres -d pos_db

# Or use Adminer at http://localhost:8080
```

## 🛠️ Development Commands

```bash
# Install dependencies
pnpm install

# Start Auth Service in watch mode
cd apps/auth-service
pnpm start:dev

# Build Auth Service
pnpm build

# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:cov

# Run E2E tests (make sure Docker is running)
pnpm test:e2e

# Lint code
pnpm lint

# Format code
pnpm format

# Check formatting
pnpm format:check
```

## 🐳 Docker Commands

```bash
# Start all infrastructure
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f postgres

# Restart a service
docker-compose restart postgres

# Remove volumes (⚠️ Deletes data!)
docker-compose down -v
```

## 🔐 Environment Variables

Required variables in `.env`:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pos_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-change-this-in-production
JWT_EXPIRATION=15m
REFRESH_TOKEN_SECRET=your-refresh-secret-change-this
REFRESH_TOKEN_EXPIRATION=7d

# Service Port
AUTH_SERVICE_PORT=3001
```

## ✅ What's Working Right Now

### Auth Service - FULLY FUNCTIONAL ✅

**Endpoints:**
- `POST /auth/register` - Create new user
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user (protected)
- `POST /auth/logout` - Logout (protected)

**Features:**
- ✅ JWT authentication with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Role-based access control (RBAC)
- ✅ Input validation with class-validator
- ✅ Swagger API documentation
- ✅ Passport strategies (JWT + Local)
- ✅ Guards for protected routes
- ✅ TypeScript strict mode
- ✅ Prisma ORM integration
- ✅ PostgreSQL database
- ✅ Comprehensive unit tests (80%+ coverage target)
- ✅ Complete E2E test suite for all endpoints

## 🚧 Next Steps

### Immediate (Week 1)
- [ ] Create API Gateway
- [x] Add tests to Auth Service (COMPLETED)
- [ ] Setup CI/CD pipeline (GitHub Actions)

### Short term (Week 2-3)
- [ ] Product Service (CRUD products, categories)
- [ ] Order Service (Order management)
- [ ] Shared libraries (@pos/common, @pos/database)

### Medium term (Week 4-6)
- [ ] Payment Service (Stripe integration)
- [ ] Customer Service (Profiles, loyalty)
- [ ] Employee Service (Management, roles)
- [ ] WebSocket for real-time updates

## 🐛 Troubleshooting

### Database connection error

```bash
# Check if PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Prisma Client errors

```bash
# Regenerate Prisma Client
pnpm prisma:generate

# If still not working, delete node_modules and reinstall
rm -rf node_modules
pnpm install
pnpm prisma:generate
```

### Port already in use

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change port in .env
AUTH_SERVICE_PORT=3002
```

## 📚 Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Passport.js Documentation](http://www.passportjs.org/docs/)
- [pnpm Documentation](https://pnpm.io/)

---

**Need help?** Check the planning docs in the root directory or create an issue.
