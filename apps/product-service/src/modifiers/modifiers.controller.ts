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
import { ModifiersService } from './modifiers.service';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';

@ApiTags('Modifiers')
@Controller('modifiers')
export class ModifiersController {
  constructor(private readonly modifiersService: ModifiersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new modifier' })
  @ApiResponse({
    status: 201,
    description: 'Modifier created successfully',
  })
  create(@Body() createModifierDto: CreateModifierDto) {
    return this.modifiersService.create(createModifierDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all modifiers' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'List of modifiers retrieved successfully',
  })
  findAll(@Query('isActive') isActive?: string) {
    return this.modifiersService.findAll({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get modifier by ID' })
  @ApiParam({ name: 'id', description: 'Modifier UUID' })
  @ApiResponse({
    status: 200,
    description: 'Modifier retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Modifier not found',
  })
  findOne(@Param('id') id: string) {
    return this.modifiersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update modifier' })
  @ApiParam({ name: 'id', description: 'Modifier UUID' })
  @ApiResponse({
    status: 200,
    description: 'Modifier updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Modifier not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateModifierDto: UpdateModifierDto,
  ) {
    return this.modifiersService.update(id, updateModifierDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete modifier' })
  @ApiParam({ name: 'id', description: 'Modifier UUID' })
  @ApiResponse({
    status: 200,
    description: 'Modifier deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Modifier not found',
  })
  remove(@Param('id') id: string) {
    return this.modifiersService.remove(id);
  }
}
