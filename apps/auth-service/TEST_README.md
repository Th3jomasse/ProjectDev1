# Auth Service - Testing Guide

## Overview

The Auth Service has comprehensive test coverage including:
- **Unit Tests**: Test individual components in isolation
- **E2E Tests**: Test complete API endpoints with real database

## Test Structure

```
apps/auth-service/
├── src/
│   └── auth/
│       ├── auth.service.spec.ts      # Unit tests for AuthService
│       └── users.service.spec.ts     # Unit tests for UsersService
├── test/
│   ├── auth.e2e-spec.ts              # E2E tests for all auth endpoints
│   └── jest-e2e.json                 # E2E test configuration
├── jest.config.js                    # Unit test configuration
└── tsconfig.spec.json                # TypeScript config for tests
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
cd apps/auth-service
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:cov
```

### E2E Tests

```bash
# Make sure Docker containers are running first
docker-compose up -d

# Wait for PostgreSQL to be ready
docker-compose logs -f postgres

# Run E2E tests
cd apps/auth-service
pnpm test:e2e

# Run E2E tests with coverage
pnpm test:e2e:cov
```

### Run All Tests (from root)

```bash
# Run all tests across all apps
pnpm test
```

## Test Coverage

### Current Coverage Targets

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### View Coverage Report

After running `pnpm test:cov`, open:
```
apps/auth-service/coverage/index.html
```

## Unit Tests

### AuthService Tests

**File**: `src/auth/auth.service.spec.ts`

Tests cover:
- ✅ User registration
  - Successful registration with token generation
  - Conflict detection for duplicate emails
- ✅ User validation
  - Valid credentials return user without password
  - Invalid email returns null
  - Invalid password returns null
  - Inactive users return null
- ✅ Login
  - Successful login returns tokens
- ✅ Token refresh
  - Valid refresh token returns new tokens
  - Invalid refresh token throws UnauthorizedException
  - User not found throws UnauthorizedException

**Key Features**:
- bcrypt mocking for password hashing
- JWT service mocking for token operations
- Complete test coverage of all public methods

### UsersService Tests

**File**: `src/auth/users.service.spec.ts`

Tests cover:
- ✅ User creation via Prisma
- ✅ Find user by email
- ✅ Find user by ID (excludes password)
- ✅ Error propagation from Prisma

## E2E Tests

**File**: `test/auth.e2e-spec.ts`

### Test Scenarios

#### 1. POST /auth/register
- ✅ Register new user successfully
- ✅ Return 409 for duplicate email
- ✅ Return 400 for invalid email format
- ✅ Return 400 for short password
- ✅ Return 400 for missing fields

#### 2. POST /auth/login
- ✅ Login with valid credentials
- ✅ Return 401 for invalid email
- ✅ Return 401 for invalid password
- ✅ Return 400 for missing credentials

#### 3. GET /auth/me
- ✅ Return user profile with valid token
- ✅ Return 401 without token
- ✅ Return 401 with invalid token
- ✅ Return 401 with malformed header

#### 4. POST /auth/refresh
- ✅ Return new tokens with valid refresh token
- ✅ Return 401 with invalid token
- ✅ Return 400 without refresh token

#### 5. POST /auth/logout
- ✅ Logout successfully with valid token
- ✅ Return 401 without token
- ✅ Return 401 with invalid token

#### 6. Role-Based Registration
- ✅ Register users with all 5 roles (ADMIN, MANAGER, SERVER, KITCHEN, HOST)
- ✅ Default to SERVER role if not specified
- ✅ Reject invalid roles

### Test Database

E2E tests use a separate test database: `pos_db_test`

The tests:
1. Clean up test data before starting
2. Run all test scenarios
3. Clean up test data after completion

## Best Practices

### Writing New Tests

1. **Unit Tests**:
   ```typescript
   describe('YourService', () => {
     let service: YourService;

     beforeEach(async () => {
       const module = await Test.createTestingModule({
         providers: [YourService, /* mocked dependencies */],
       }).compile();

       service = module.get<YourService>(YourService);
     });

     it('should do something', () => {
       // Arrange
       const input = 'test';

       // Act
       const result = service.method(input);

       // Assert
       expect(result).toBe('expected');
     });
   });
   ```

2. **E2E Tests**:
   ```typescript
   describe('Feature (e2e)', () => {
     it('should perform action', () => {
       return request(app.getHttpServer())
         .post('/endpoint')
         .send({ data: 'test' })
         .expect(201)
         .expect((res) => {
           expect(res.body).toHaveProperty('id');
         });
     });
   });
   ```

### Mocking Guidelines

- Mock external dependencies (database, APIs)
- Don't mock the system under test
- Use `jest.fn()` for function mocks
- Clear mocks between tests with `jest.clearAllMocks()`

### Test Data

- Use realistic test data
- Clean up after tests
- Don't rely on execution order
- Use separate test database for E2E tests

## Debugging Tests

### Run Single Test File

```bash
# Unit test
pnpm test auth.service.spec.ts

# E2E test
pnpm test:e2e auth.e2e-spec.ts
```

### Run Tests in Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then attach your debugger (VS Code, Chrome DevTools, etc.)

### View Test Output

```bash
# Verbose output
pnpm test -- --verbose

# Show all test names
pnpm test -- --listTests
```

## CI/CD Integration

Tests are configured to run in CI/CD pipelines:

```yaml
# .github/workflows/ci.yml (future)
- name: Run Tests
  run: |
    pnpm test
    pnpm test:e2e
```

## Troubleshooting

### Issue: Tests fail with database connection error

**Solution**: Make sure Docker PostgreSQL is running
```bash
docker-compose up -d postgres
docker-compose logs postgres
```

### Issue: E2E tests timeout

**Solution**: Increase Jest timeout
```typescript
jest.setTimeout(30000); // 30 seconds
```

### Issue: Coverage not meeting threshold

**Solution**: Add more test cases for uncovered branches
```bash
# See what's not covered
pnpm test:cov
# Open coverage/index.html to see detailed report
```

### Issue: Module not found in tests

**Solution**: Make sure tsconfig.spec.json includes test files
```json
{
  "include": ["src/**/*.spec.ts", "test/**/*.ts"]
}
```

## Next Steps

1. Add integration tests for guards and strategies
2. Add performance tests for token generation
3. Add security tests for password validation
4. Setup automated test runs on PR
5. Add mutation testing with Stryker

---

**Need help?** Check the main README_DEV.md or NestJS testing documentation.
