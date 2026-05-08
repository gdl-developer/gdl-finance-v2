import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlexiRequest } from '../entities/request.entity';
import { FlexiRequestStatus } from '../entities/request.enums';

import { CreateFlexiRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(FlexiRequest)
    private requestRepository: Repository<FlexiRequest>,
  ) {}

  async createRequest(userId: string, dto: CreateFlexiRequestDto) {
    const request = this.requestRepository.create({
      ...dto,
      userId,
      status: FlexiRequestStatus.PENDING_APPROVAL,
    });
    return this.requestRepository.save(request);
  }

  async findByUserId(userId: string) {
    return this.requestRepository.find({
      where: { userId },
      order: { created_at: 'DESC' },
    });
  }

  async findPending() {
    return this.requestRepository.find({
      where: { status: FlexiRequestStatus.PENDING_APPROVAL },
      order: { created_at: 'ASC' },
    });
  }

  async updateStatus(id: number, status: FlexiRequestStatus) {
    await this.requestRepository.update(id, { status });
    return this.requestRepository.findOne({ where: { id } });
  }
}
