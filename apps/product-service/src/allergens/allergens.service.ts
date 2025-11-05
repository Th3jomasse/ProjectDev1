import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAllergenDto } from './dto/create-allergen.dto';
import { UpdateAllergenDto } from './dto/update-allergen.dto';
import { Allergen } from '@prisma/client';

@Injectable()
export class AllergensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAllergenDto: CreateAllergenDto): Promise<Allergen> {
    // Check if allergen name already exists
    const existing = await this.prisma.allergen.findUnique({
      where: { name: createAllergenDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Allergen with name '${createAllergenDto.name}' already exists`,
      );
    }

    return this.prisma.allergen.create({
      data: createAllergenDto,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findAll(): Promise<Allergen[]> {
    return this.prisma.allergen.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Allergen> {
    const allergen = await this.prisma.allergen.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                category: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!allergen) {
      throw new NotFoundException(`Allergen with ID '${id}' not found`);
    }

    return allergen;
  }

  async update(
    id: string,
    updateAllergenDto: UpdateAllergenDto,
  ): Promise<Allergen> {
    // Check if allergen exists
    const existing = await this.prisma.allergen.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Allergen with ID '${id}' not found`);
    }

    // Check if name is unique (if being updated)
    if (updateAllergenDto.name && updateAllergenDto.name !== existing.name) {
      const nameExists = await this.prisma.allergen.findUnique({
        where: { name: updateAllergenDto.name },
      });

      if (nameExists) {
        throw new ConflictException(
          `Allergen with name '${updateAllergenDto.name}' already exists`,
        );
      }
    }

    return this.prisma.allergen.update({
      where: { id },
      data: updateAllergenDto,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if allergen exists
    const allergen = await this.prisma.allergen.findUnique({
      where: { id },
    });

    if (!allergen) {
      throw new NotFoundException(`Allergen with ID '${id}' not found`);
    }

    // Note: cascade delete will remove product-allergen relationships
    await this.prisma.allergen.delete({
      where: { id },
    });

    return { message: `Allergen '${allergen.name}' deleted successfully` };
  }
}
