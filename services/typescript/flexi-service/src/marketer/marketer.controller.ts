import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MarketerService } from './marketer.service';
import { CreateMarketerDto } from './dto/marketer.dto';

@Controller('marketers')
export class MarketerController {
  constructor(private readonly marketerService: MarketerService) {}

  @Post()
  create(@Body() dto: CreateMarketerDto) {
    return this.marketerService.create(dto);
  }

  @Get()
  findAll() {
    return this.marketerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.marketerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateMarketerDto>) {
    return this.marketerService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.marketerService.remove(+id);
  }
}
