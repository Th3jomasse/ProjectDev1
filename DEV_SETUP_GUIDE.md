# Guide de Setup - Système POS

## 🎯 Objectif

Créer une fondation solide et professionnelle pour notre système POS avec :
- Architecture microservices scalable
- TypeScript strict partout
- Standards de code élevés
- Developer experience excellent
- Infrastructure as Code

---

## 🏗️ Stack Technique Final

### Core
- **Runtime** : Node.js 20 LTS
- **Language** : TypeScript 5.3+
- **Framework Backend** : NestJS 10+
- **Monorepo** : Nx Workspace
- **Package Manager** : pnpm (plus rapide que npm/yarn)

### Databases
- **Primary DB** : PostgreSQL 16
- **Cache** : Redis 7
- **ORM** : Prisma 5

### Infrastructure
- **Containerization** : Docker + Docker Compose
- **API** : GraphQL (Apollo) + REST
- **Message Queue** : RabbitMQ (pour phase 2)

### Quality & Tooling
- **Linting** : ESLint
- **Formatting** : Prettier
- **Testing** : Jest + Supertest
- **Git Hooks** : Husky
- **Commit Standard** : Conventional Commits

---

## 📁 Structure du Projet (Monorepo Nx)

```
pos-system/
├── apps/                           # Applications
│   ├── api-gateway/               # API Gateway (NestJS)
│   ├── auth-service/              # Authentication Service
│   ├── order-service/             # Order Management
│   ├── payment-service/           # Payment Processing
│   ├── product-service/           # Products & Menus
│   ├── customer-service/          # Customer Management
│   ├── employee-service/          # Employee Management
│   ├── inventory-service/         # Inventory
│   └── analytics-service/         # Analytics & Reporting
│
├── libs/                          # Shared Libraries
│   ├── common/                    # Common utilities
│   │   ├── interfaces/           # TypeScript interfaces
│   │   ├── dto/                  # Data Transfer Objects
│   │   ├── constants/            # Constants
│   │   └── utils/                # Utility functions
│   ├── database/                 # Database configs
│   │   ├── prisma/              # Prisma schemas
│   │   └── migrations/          # SQL migrations
│   ├── events/                   # Event schemas
│   └── config/                   # Configuration
│
├── tools/                        # Development tools
│   └── scripts/                 # Utility scripts
│
├── docker/                       # Docker configs
│   ├── postgres/
│   ├── redis/
│   └── rabbitmq/
│
├── docs/                         # Documentation
│
├── .github/                      # GitHub Actions CI/CD
│   └── workflows/
│
├── docker-compose.yml           # Local development
├── docker-compose.prod.yml      # Production
├── nx.json                      # Nx configuration
├── package.json                 # Root package.json
├── pnpm-workspace.yaml         # pnpm workspace
├── tsconfig.base.json          # Base TypeScript config
├── .eslintrc.json              # ESLint config
├── .prettierrc                 # Prettier config
└── README.md
```

---

## 🚀 Phases de Développement

### Phase 0 : Setup Initial (Cette session)
**Durée** : 1-2 jours

- [x] Planification complète ✅
- [ ] Structure monorepo Nx
- [ ] Configuration TypeScript/ESLint/Prettier
- [ ] Docker Compose (PostgreSQL, Redis)
- [ ] Service Auth (structure de base)
- [ ] Prisma setup
- [ ] Premier endpoint REST fonctionnel

**Deliverable** : Environnement de dev prêt, service Auth qui tourne

---

### Phase 1 : Core Services (Semaines 1-4)

#### Week 1 : Authentication & Authorization
- [ ] Auth Service complet
  - [ ] JWT token generation
  - [ ] Refresh tokens
  - [ ] Password hashing (bcrypt)
  - [ ] Login/Logout/Register endpoints
  - [ ] Role-based access control (RBAC)
- [ ] User model & migrations
- [ ] Tests unitaires & intégration

#### Week 2 : API Gateway
- [ ] API Gateway avec Kong ou NestJS
- [ ] Request routing
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] API documentation (Swagger)

#### Week 3 : Product Service
- [ ] Product CRUD
- [ ] Categories
- [ ] Modifiers
- [ ] Image upload (S3/Cloudinary)
- [ ] GraphQL API

#### Week 4 : Order Service
- [ ] Order creation & management
- [ ] Order items
- [ ] Status workflow
- [ ] Real-time updates (WebSocket)

---

### Phase 2 : Business Logic (Semaines 5-8)

#### Week 5-6 : Payment Service
- [ ] Stripe integration
- [ ] Payment processing
- [ ] Split payments
- [ ] Refunds
- [ ] PCI-DSS compliance

#### Week 7-8 : Employee & Customer Services
- [ ] Employee management
- [ ] Customer profiles
- [ ] Loyalty points
- [ ] Analytics de base

---

## 🔧 Setup Instructions

### Prerequisites

```bash
# Versions requises
node --version    # v20.x.x
pnpm --version    # v8.x.x
docker --version  # v24.x.x
```

### Installation

```bash
# 1. Clone le repo
git clone <repo-url>
cd pos-system

# 2. Install pnpm (si pas déjà installé)
npm install -g pnpm

# 3. Install dependencies
pnpm install

# 4. Start infrastructure (Docker)
docker-compose up -d

# 5. Run migrations
pnpm prisma:migrate

# 6. Start dev server
pnpm dev
```

---

## 🎨 Standards de Code

### TypeScript

```typescript
// ✅ GOOD: Type everything
interface User {
  id: string;
  email: string;
  role: UserRole;
}

async function getUser(id: string): Promise<User> {
  // ...
}

// ❌ BAD: No any, no implicit types
function getUser(id): any {
  // ...
}
```

### Naming Conventions

```typescript
// Files & Folders
user.service.ts          // Services
user.controller.ts       // Controllers
user.entity.ts          // Database entities
user.dto.ts             // DTOs
user.interface.ts       // Interfaces
user.spec.ts            // Tests

// Classes
class UserService {}
class CreateUserDto {}

// Interfaces
interface IUser {}

// Constants
const MAX_RETRY_ATTEMPTS = 3;

// Enums
enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SERVER = 'server',
}
```

### ESLint Rules (Strict)

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": "warn"
  }
}
```

---

## 🧪 Testing Standards

### Coverage Minimums
- **Unit Tests** : 80%+
- **Integration Tests** : 70%+
- **E2E Tests** : Key flows only

### Test Structure

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const userData = { email: 'test@example.com', password: 'pass123' };

      // Act
      const user = await userService.createUser(userData);

      // Assert
      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });

    it('should throw error with duplicate email', async () => {
      // ...
    });
  });
});
```

---

## 🔐 Environment Variables

```bash
# .env.example (commit this)
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pos_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=7d

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# .env (DO NOT commit - add to .gitignore)
# Real credentials here
```

---

## 🐳 Docker Setup

### docker-compose.yml

Services pour développement :
- PostgreSQL 16
- Redis 7
- RabbitMQ (phase 2)
- Adminer (DB management UI)

### Commandes Utiles

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f postgres

# Access PostgreSQL CLI
docker-compose exec postgres psql -U postgres -d pos_db

# Access Redis CLI
docker-compose exec redis redis-cli
```

---

## 📊 Database Migrations

### Prisma Workflow

```bash
# 1. Make changes to schema.prisma

# 2. Create migration
pnpm prisma migrate dev --name add_user_table

# 3. Generate Prisma Client
pnpm prisma generate

# 4. View database
pnpm prisma studio
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

---

## 📝 Commit Standards

### Conventional Commits

```bash
# Format
<type>(<scope>): <subject>

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Formatting
refactor: Code restructuring
test:     Tests
chore:    Maintenance

# Examples
feat(auth): add JWT refresh token rotation
fix(order): resolve race condition in order creation
docs(api): update swagger documentation
test(payment): add stripe webhook tests
```

---

## 🎯 Ready to Start?

1. **Commençons par créer la structure de base du monorepo**
2. **Puis Docker Compose pour PostgreSQL et Redis**
3. **Ensuite le premier service (Auth Service)**

**Voulez-vous que je commence à créer les fichiers ?** 🚀

Ou préférez-vous d'abord :
- [ ] Revoir l'architecture ?
- [ ] Discuter des choix techniques ?
- [ ] Autre chose ?
