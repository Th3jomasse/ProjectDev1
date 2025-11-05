import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateModifierDto {
  @ApiProperty({
    description: 'Modifier name',
    example: 'Add Grilled Chicken',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Modifier description',
    example: 'Add 6oz grilled chicken breast',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Additional price for this modifier',
    example: 6.00,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Modifier type',
    example: 'addon',
    default: 'addon',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({
    description: 'Is modifier active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
