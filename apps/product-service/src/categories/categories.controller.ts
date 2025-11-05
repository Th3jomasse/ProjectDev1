import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Category with this slug already exists',
  })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['FOOD', 'BEVERAGE', 'ALCOHOL', 'MERCHANDISE'],
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({
    name: 'parentId',
    required: false,
    description: 'Filter by parent ID (use "null" for root categories)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of categories retrieved successfully',
  })
  findAll(
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.categoriesService.findAll({
      type,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      parentId: parentId,
    });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get category tree hierarchy' })
  @ApiResponse({
    status: 200,
    description: 'Category tree retrieved successfully',
  })
  getTree() {
    return this.categoriesService.getTree();
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiParam({ name: 'slug', description: 'Category slug' })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete category with products or subcategories',
  })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
