import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InvestmentRequest,
  InvestmentStatus,
} from '../entities/investment.entity';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InvestmentService {
  constructor(
    @InjectRepository(InvestmentRequest)
    private investmentRepository: Repository<InvestmentRequest>,
  ) {}

  async create(userId: string, dto: CreateInvestmentDto) {
    const reference = dto.reference || `INV-${uuidv4()}`;

    const existing = await this.investmentRepository.findOne({
      where: { reference },
    });
    if (existing) throw new BadRequestException('Reference already exists');

    const request = this.investmentRepository.create({
      ...dto,
      userId,
      reference,
      status: InvestmentStatus.PENDING,
    });

    const saved = await this.investmentRepository.save(request);

    // TODO: Emit "INVESTMENT_CREATED" event to Kafka
    // this.kafkaClient.emit('INVESTMENT_CREATED', saved);

    return saved;
  }

  async findAll(userId: string) {
    return this.investmentRepository.find({
      where: { userId },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number, userId: string) {
    return this.investmentRepository.findOne({ where: { id, userId } });
  }

  async updateStatus(
    id: number,
    status: InvestmentStatus,
    adminNotes?: string,
  ) {
    await this.investmentRepository.update(id, {
      status,
      admin_notes: adminNotes,
    });
    return this.investmentRepository.findOne({ where: { id } });
  }
}
