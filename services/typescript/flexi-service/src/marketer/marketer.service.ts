import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GdlMarketer } from '../entities/marketer.entity';

import { CreateMarketerDto } from './dto/marketer.dto';

@Injectable()
export class MarketerService {
  constructor(
    @InjectRepository(GdlMarketer)
    private marketerRepository: Repository<GdlMarketer>,
  ) {}

  async create(dto: CreateMarketerDto) {
    const marketer = this.marketerRepository.create(dto);
    return this.marketerRepository.save(marketer);
  }

  async findAll() {
    return this.marketerRepository.find({ order: { last_name: 'ASC' } });
  }

  async findOne(id: number) {
    return this.marketerRepository.findOne({ where: { id } });
  }

  async update(id: number, dto: Partial<CreateMarketerDto>) {
    await this.marketerRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.marketerRepository.delete(id);
    return { success: true };
  }
}
