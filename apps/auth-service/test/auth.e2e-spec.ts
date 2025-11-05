import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  // Test user data
  const testUser = {
    email: 'e2e-test@restaurant.com',
    password: 'SecurePass123!',
    firstName: 'E2E',
    lastName: 'Test',
    role: 'SERVER',
  };

  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same global pipes as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);

    // Clean up test user if exists from previous runs
    await prismaService.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    // Clean up test user
    await prismaService.user.deleteMany({
      where: { email: testUser.email },
    });

    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe(testUser.email);
          expect(res.body.user.firstName).toBe(testUser.firstName);
          expect(res.body.user.lastName).toBe(testUser.lastName);
          expect(res.body.user.role).toBe(testUser.role);
          expect(res.body.user).not.toHaveProperty('password');

          // Save tokens for later tests
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should return 409 if email already exists', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toBe('Email already exists');
        });
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should return 400 for short password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'another@restaurant.com',
          password: 'short',
        })
        .expect(400);
    });

    it('should return 400 for missing required fields', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'incomplete@restaurant.com',
          // Missing password, firstName, lastName
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe(testUser.email);
          expect(res.body.user).not.toHaveProperty('password');

          // Update tokens
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should return 401 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@restaurant.com',
          password: testUser.password,
        })
        .expect(401);
    });

    it('should return 401 for invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should return 400 for missing credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('/auth/me (GET)', () => {
    it('should return current user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(testUser.email);
          expect(res.body.firstName).toBe(testUser.firstName);
          expect(res.body.lastName).toBe(testUser.lastName);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 401 without authorization header', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);
    });

    it('should return 401 with malformed authorization header', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat token-12345')
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should return new tokens with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(typeof res.body.accessToken).toBe('string');
          expect(typeof res.body.refreshToken).toBe('string');

          // Update tokens with new ones
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should return 401 with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token-12345',
        })
        .expect(401);
    });

    it('should return 400 without refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout successfully with valid token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Logged out successfully');
        });
    });

    it('should return 401 without authorization header', () => {
      return request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);
    });
  });

  describe('Role-based registration', () => {
    const roles = ['ADMIN', 'MANAGER', 'SERVER', 'KITCHEN', 'HOST'];

    afterEach(async () => {
      // Clean up users created in role tests
      await prismaService.user.deleteMany({
        where: {
          email: {
            startsWith: 'role-test-',
          },
        },
      });
    });

    roles.forEach((role) => {
      it(`should register user with role ${role}`, () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `role-test-${role.toLowerCase()}@restaurant.com`,
            password: 'SecurePass123!',
            firstName: 'Role',
            lastName: 'Test',
            role: role,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.user.role).toBe(role);
          });
      });
    });

    it('should default to SERVER role if not specified', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'role-test-default@restaurant.com',
          password: 'SecurePass123!',
          firstName: 'Default',
          lastName: 'User',
          // No role specified
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.user.role).toBe('SERVER');
        });
    });

    it('should reject invalid role', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'role-test-invalid@restaurant.com',
          password: 'SecurePass123!',
          firstName: 'Invalid',
          lastName: 'Role',
          role: 'INVALID_ROLE',
        })
        .expect(400);
    });
  });
});
