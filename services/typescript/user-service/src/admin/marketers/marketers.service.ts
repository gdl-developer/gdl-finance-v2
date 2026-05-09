import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Marketer } from './entities/marketer.entity';
import { CreateMarketerDto } from './dto/create-marketer.dto';
import { UpdateMarketerDto } from './dto/update-marketer.dto';

@Injectable()
export class MarketersService {
  constructor(
    @InjectRepository(Marketer)
    private readonly marketerRepo: Repository<Marketer>,
  ) {}

  async create(
    createMarketerDto: CreateMarketerDto,
    admin_id?: number,
  ): Promise<Marketer> {
    const existing = await this.marketerRepo.findOne({
      where: { email: createMarketerDto.email },
    });

    if (existing) {
      throw new ConflictException('A marketer with this email already exists');
    }

    const marketer = this.marketerRepo.create({
      ...createMarketerDto,
      created_by: admin_id,
    });

    return this.marketerRepo.save(marketer);
  }

  async findAll(
    page = 1,
    limit = 15,
    search?: string,
  ): Promise<{
    data: Marketer[];
    meta: { total: number; page: number; limit: number };
  }> {
    const skip = (page - 1) * limit;

    const whereClause = search
      ? [
          { first_name: Like(`%${search}%`) },
          { last_name: Like(`%${search}%`) },
          { email: Like(`%${search}%`) },
          { employee_id: Like(`%${search}%`) },
        ]
      : {};

    const [data, total] = await this.marketerRepo.findAndCount({
      where: whereClause,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      meta: { total, page, limit },
    };
  }

  async findOne(id: number): Promise<Marketer> {
    const marketer = await this.marketerRepo.findOne({ where: { id } });

    if (!marketer) {
      throw new NotFoundException(`Marketer with id ${id} not found`);
    }

    return marketer;
  }

  async update(
    id: number,
    updateMarketerDto: UpdateMarketerDto,
  ): Promise<Marketer> {
    const marketer = await this.findOne(id);

    if (updateMarketerDto.email && updateMarketerDto.email !== marketer.email) {
      const existing = await this.marketerRepo.findOne({
        where: { email: updateMarketerDto.email },
      });
      if (existing) {
        throw new ConflictException(
          'A marketer with this email already exists',
        );
      }
    }

    Object.assign(marketer, updateMarketerDto);
    return this.marketerRepo.save(marketer);
  }

  async remove(id: number): Promise<void> {
    const marketer = await this.findOne(id);
    await this.marketerRepo.remove(marketer);
  }

  async toggleStatus(id: number): Promise<Marketer> {
    const marketer = await this.findOne(id);
    marketer.is_active = !marketer.is_active;
    return this.marketerRepo.save(marketer);
  }
}
