import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Check if slug is unique
    if (createCategoryDto.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: createCategoryDto.slug },
      });

      if (existing) {
        throw new ConflictException(
          `Category with slug '${createCategoryDto.slug}' already exists`,
        );
      }
    }

    // Verify parent category exists if provided
    if (createCategoryDto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID '${createCategoryDto.parentId}' not found`,
        );
      }
    }

    return this.prisma.category.create({
      data: createCategoryDto,
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findAll(params?: {
    type?: string;
    isActive?: boolean;
    parentId?: string | null;
  }): Promise<Category[]> {
    const where: Prisma.CategoryWhereInput = {};

    if (params?.type) {
      where.type = params.type as any;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params?.parentId !== undefined) {
      where.parentId = params.parentId === 'null' ? null : params.parentId;
    }

    return this.prisma.category.findMany({
      where,
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          orderBy: { displayOrder: 'asc' },
        },
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            basePrice: true,
            imageUrl: true,
            isAvailable: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        products: {
          where: { isActive: true, isAvailable: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    // Check if category exists
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    // Check if slug is unique (if being updated)
    if (updateCategoryDto.slug && updateCategoryDto.slug !== existing.slug) {
      const slugExists = await this.prisma.category.findUnique({
        where: { slug: updateCategoryDto.slug },
      });

      if (slugExists) {
        throw new ConflictException(
          `Category with slug '${updateCategoryDto.slug}' already exists`,
        );
      }
    }

    // Verify parent category exists if being updated
    if (updateCategoryDto.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      const parent = await this.prisma.category.findUnique({
        where: { id: updateCategoryDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID '${updateCategoryDto.parentId}' not found`,
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    // Check if category has products
    if (category._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${category._count.products} products. Remove products first.`,
      );
    }

    // Check if category has children
    if (category._count.children > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${category._count.children} subcategories. Remove subcategories first.`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { message: `Category '${category.name}' deleted successfully` };
  }

  async getTree(): Promise<Category[]> {
    // Get all root categories (no parent) with their full hierarchy
    return this.prisma.category.findMany({
      where: {
        parentId: null,
        isActive: true,
      },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
            },
            _count: {
              select: { products: true },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }
}
