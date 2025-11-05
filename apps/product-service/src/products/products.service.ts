import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID '${createProductDto.categoryId}' not found`,
      );
    }

    // Check if slug is unique
    if (createProductDto.slug) {
      const existing = await this.prisma.product.findUnique({
        where: { slug: createProductDto.slug },
      });

      if (existing) {
        throw new ConflictException(
          `Product with slug '${createProductDto.slug}' already exists`,
        );
      }
    }

    // Check if SKU is unique
    if (createProductDto.sku) {
      const existing = await this.prisma.product.findUnique({
        where: { sku: createProductDto.sku },
      });

      if (existing) {
        throw new ConflictException(
          `Product with SKU '${createProductDto.sku}' already exists`,
        );
      }
    }

    const {
      allergenIds,
      dietaryTags,
      modifierIds,
      ...productData
    } = createProductDto;

    // Create product with relationships
    return this.prisma.product.create({
      data: {
        ...productData,
        allergens: allergenIds
          ? {
              create: allergenIds.map((allergenId) => ({
                allergenId,
              })),
            }
          : undefined,
        dietaryTags: dietaryTags
          ? {
              create: dietaryTags.map((tag) => ({
                tag,
              })),
            }
          : undefined,
        modifiers: modifierIds
          ? {
              create: modifierIds.map((modifierId) => ({
                modifierId,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        allergens: {
          include: {
            allergen: true,
          },
        },
        dietaryTags: true,
        modifiers: {
          include: {
            modifier: true,
          },
        },
      },
    });
  }

  async findAll(params?: {
    categoryId?: string;
    isAvailable?: boolean;
    isActive?: boolean;
    search?: string;
  }): Promise<Product[]> {
    const where: Prisma.ProductWhereInput = {};

    if (params?.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params?.isAvailable !== undefined) {
      where.isAvailable = params.isAvailable;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { sku: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        allergens: {
          include: {
            allergen: {
              select: {
                id: true,
                name: true,
                icon: true,
              },
            },
          },
        },
        dietaryTags: true,
        modifiers: {
          include: {
            modifier: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        allergens: {
          include: {
            allergen: true,
          },
        },
        dietaryTags: true,
        modifiers: {
          include: {
            modifier: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        allergens: {
          include: {
            allergen: true,
          },
        },
        dietaryTags: true,
        modifiers: {
          include: {
            modifier: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug '${slug}' not found`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    // Check if product exists
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: {
        allergens: true,
        dietaryTags: true,
        modifiers: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    // Verify category exists if being updated
    if (updateProductDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateProductDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException(
          `Category with ID '${updateProductDto.categoryId}' not found`,
        );
      }
    }

    // Check if slug is unique (if being updated)
    if (updateProductDto.slug && updateProductDto.slug !== existing.slug) {
      const slugExists = await this.prisma.product.findUnique({
        where: { slug: updateProductDto.slug },
      });

      if (slugExists) {
        throw new ConflictException(
          `Product with slug '${updateProductDto.slug}' already exists`,
        );
      }
    }

    // Check if SKU is unique (if being updated)
    if (updateProductDto.sku && updateProductDto.sku !== existing.sku) {
      const skuExists = await this.prisma.product.findUnique({
        where: { sku: updateProductDto.sku },
      });

      if (skuExists) {
        throw new ConflictException(
          `Product with SKU '${updateProductDto.sku}' already exists`,
        );
      }
    }

    const {
      allergenIds,
      dietaryTags,
      modifierIds,
      ...productData
    } = updateProductDto;

    // Update product with relationships
    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        allergens:
          allergenIds !== undefined
            ? {
                deleteMany: {},
                create: allergenIds.map((allergenId) => ({
                  allergenId,
                })),
              }
            : undefined,
        dietaryTags:
          dietaryTags !== undefined
            ? {
                deleteMany: {},
                create: dietaryTags.map((tag) => ({
                  tag,
                })),
              }
            : undefined,
        modifiers:
          modifierIds !== undefined
            ? {
                deleteMany: {},
                create: modifierIds.map((modifierId) => ({
                  modifierId,
                })),
              }
            : undefined,
      },
      include: {
        category: true,
        allergens: {
          include: {
            allergen: true,
          },
        },
        dietaryTags: true,
        modifiers: {
          include: {
            modifier: true,
          },
        },
      },
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    // In a real system, you might want to check if product is in any active orders
    // For now, we'll allow deletion (cascade will handle related records)

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: `Product '${product.name}' deleted successfully` };
  }

  async getByCategorySlug(categorySlug: string): Promise<Product[]> {
    const category = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with slug '${categorySlug}' not found`,
      );
    }

    return this.findAll({
      categoryId: category.id,
      isActive: true,
      isAvailable: true,
    });
  }
}
