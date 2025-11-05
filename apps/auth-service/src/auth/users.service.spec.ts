import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 'user-123',
    email: 'test@restaurant.com',
    password: '$2b$10$hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: 'SERVER' as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a user', async () => {
      const createUserDto: Prisma.UserCreateInput = {
        email: 'newuser@restaurant.com',
        password: '$2b$10$hashedPassword',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'SERVER',
      };

      const expectedUser = {
        ...mockUser,
        ...createUserDto,
        id: 'new-user-id',
      };

      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      const result = await service.create(createUserDto);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: createUserDto,
      });
      expect(result).toEqual(expectedUser);
    });

    it('should propagate Prisma errors', async () => {
      const createUserDto: Prisma.UserCreateInput = {
        email: 'duplicate@restaurant.com',
        password: '$2b$10$hashedPassword',
        firstName: 'Test',
        lastName: 'User',
      };

      const prismaError = new Error('Unique constraint failed');
      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.create(createUserDto)).rejects.toThrow(prismaError);
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@restaurant.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user without password when found by id', async () => {
      const userWithoutPassword = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithoutPassword);

      const result = await service.findById(mockUser.id);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(userWithoutPassword);
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });
});
