import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsEnum,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum CategoryType {
  FOOD = 'FOOD',
  BEVERAGE = 'BEVERAGE',
  ALCOHOL = 'ALCOHOL',
  MERCHANDISE = 'MERCHANDISE',
}

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Appetizers',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Delicious starters to begin your meal',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug',
    example: 'appetizers',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string;

  @ApiProperty({
    description: 'Category type',
    enum: CategoryType,
    example: CategoryType.FOOD,
  })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiPropertyOptional({
    description: 'Parent category ID for subcategories',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Display order (lower numbers appear first)',
    example: 1,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Category image URL',
    example: 'https://example.com/images/appetizers.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Is category active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
