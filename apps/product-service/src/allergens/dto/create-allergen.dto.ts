import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateAllergenDto {
  @ApiProperty({
    description: 'Allergen name',
    example: 'Dairy',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Allergen description',
    example: 'Contains milk, cheese, or other dairy products',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon name or URL',
    example: 'dairy-icon.svg',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  icon?: string;
}
