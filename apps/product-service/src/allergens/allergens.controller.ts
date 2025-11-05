import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AllergensService } from './allergens.service';
import { CreateAllergenDto } from './dto/create-allergen.dto';
import { UpdateAllergenDto } from './dto/update-allergen.dto';

@ApiTags('Allergens')
@Controller('allergens')
export class AllergensController {
  constructor(private readonly allergensService: AllergensService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new allergen' })
  @ApiResponse({
    status: 201,
    description: 'Allergen created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Allergen with this name already exists',
  })
  create(@Body() createAllergenDto: CreateAllergenDto) {
    return this.allergensService.create(createAllergenDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all allergens' })
  @ApiResponse({
    status: 200,
    description: 'List of allergens retrieved successfully',
  })
  findAll() {
    return this.allergensService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get allergen by ID' })
  @ApiParam({ name: 'id', description: 'Allergen UUID' })
  @ApiResponse({
    status: 200,
    description: 'Allergen retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Allergen not found',
  })
  findOne(@Param('id') id: string) {
    return this.allergensService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update allergen' })
  @ApiParam({ name: 'id', description: 'Allergen UUID' })
  @ApiResponse({
    status: 200,
    description: 'Allergen updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Allergen not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateAllergenDto: UpdateAllergenDto,
  ) {
    return this.allergensService.update(id, updateAllergenDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete allergen' })
  @ApiParam({ name: 'id', description: 'Allergen UUID' })
  @ApiResponse({
    status: 200,
    description: 'Allergen deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Allergen not found',
  })
  remove(@Param('id') id: string) {
    return this.allergensService.remove(id);
  }
}
