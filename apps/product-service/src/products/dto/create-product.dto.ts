import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsArray,
  Min,
  MaxLength,
  MinLength,
  IsInt,
} from 'class-validator';

export enum SpicyLevel {
  NONE = 'NONE',
  MILD = 'MILD',
  MEDIUM = 'MEDIUM',
  HOT = 'HOT',
  EXTRA_HOT = 'EXTRA_HOT',
}

export enum DrinkStrength {
  LIGHT = 'LIGHT',
  MEDIUM = 'MEDIUM',
  STRONG = 'STRONG',
}

export enum DietaryTag {
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  GLUTEN_FREE = 'GLUTEN_FREE',
  DAIRY_FREE = 'DAIRY_FREE',
  NUT_FREE = 'NUT_FREE',
  HALAL = 'HALAL',
  KOSHER = 'KOSHER',
  KETO = 'KETO',
  PALEO = 'PALEO',
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Truffle Burger',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: '8oz Angus beef, truffle aioli, wild mushrooms, gruyere, arugula',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'SKU code',
    example: 'BURGER-TRUFFLE-001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug',
    example: 'truffle-burger',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  slug?: string;

  @ApiProperty({
    description: 'Base price in dollars',
    example: 19.99,
  })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({
    description: 'Cost price (for profit margin calculation)',
    example: 8.50,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({
    description: 'Product image URL',
    example: 'https://example.com/images/truffle-burger.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Preparation time in minutes',
    example: 20,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  preparationTime?: number;

  @ApiPropertyOptional({
    description: 'Calories',
    example: 850,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  calories?: number;

  @ApiPropertyOptional({
    description: 'Spicy level',
    enum: SpicyLevel,
    example: SpicyLevel.NONE,
  })
  @IsEnum(SpicyLevel)
  @IsOptional()
  spicyLevel?: SpicyLevel;

  @ApiPropertyOptional({
    description: 'Serving volume (for beverages)',
    example: '16oz',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  volume?: string;

  @ApiPropertyOptional({
    description: 'Alcohol by volume percentage',
    example: 5.4,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  abv?: number;

  @ApiPropertyOptional({
    description: 'Base spirit (for cocktails)',
    example: 'Vodka',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  baseSpirit?: string;

  @ApiPropertyOptional({
    description: 'Drink strength level',
    enum: DrinkStrength,
    example: DrinkStrength.MEDIUM,
  })
  @IsEnum(DrinkStrength)
  @IsOptional()
  drinkStrength?: DrinkStrength;

  @ApiPropertyOptional({
    description: 'Is product available for ordering',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Is product active in system',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Is product available all day',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  availableAllDay?: boolean;

  @ApiPropertyOptional({
    description: 'Array of allergen IDs',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  allergenIds?: string[];

  @ApiPropertyOptional({
    description: 'Array of dietary tags',
    enum: DietaryTag,
    isArray: true,
    example: [DietaryTag.GLUTEN_FREE],
  })
  @IsArray()
  @IsEnum(DietaryTag, { each: true })
  @IsOptional()
  dietaryTags?: DietaryTag[];

  @ApiPropertyOptional({
    description: 'Array of modifier IDs',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  modifierIds?: string[];
}
