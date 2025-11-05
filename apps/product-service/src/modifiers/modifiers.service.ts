import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import { Modifier, Prisma } from '@prisma/client';

@Injectable()
export class ModifiersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createModifierDto: CreateModifierDto): Promise<Modifier> {
    return this.prisma.modifier.create({
      data: createModifierDto,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findAll(params?: { isActive?: boolean }): Promise<Modifier[]> {
    const where: Prisma.ModifierWhereInput = {};

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    return this.prisma.modifier.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Modifier> {
    const modifier = await this.prisma.modifier.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                basePrice: true,
              },
            },
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID '${id}' not found`);
    }

    return modifier;
  }

  async update(
    id: string,
    updateModifierDto: UpdateModifierDto,
  ): Promise<Modifier> {
    // Check if modifier exists
    const existing = await this.prisma.modifier.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Modifier with ID '${id}' not found`);
    }

    return this.prisma.modifier.update({
      where: { id },
      data: updateModifierDto,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if modifier exists
    const modifier = await this.prisma.modifier.findUnique({
      where: { id },
    });

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID '${id}' not found`);
    }

    // Note: cascade delete will remove product-modifier relationships
    await this.prisma.modifier.delete({
      where: { id },
    });

    return { message: `Modifier '${modifier.name}' deleted successfully` };
  }
}
