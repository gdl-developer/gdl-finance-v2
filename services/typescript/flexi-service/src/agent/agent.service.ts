import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlexiAgent } from '../entities/agent.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { CreateAgentDto } from './dto/create-agent.dto';
import { LoginAgentDto } from './dto/login-agent.dto';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(FlexiAgent)
    private agentRepository: Repository<FlexiAgent>,
    private jwtService: JwtService,
  ) {}

  async createAgent(dto: CreateAgentDto) {
    const existing = await this.agentRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException('Email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const agent = this.agentRepository.create({
      ...dto,
      password: hashedPassword,
      otp_code: Math.floor(100000 + Math.random() * 900000).toString(),
      otp_expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
    });

    await this.agentRepository.save(agent);

    // In V2, we emit an event to Kafka for the Notification Service to pick up
    // For now, we return success
    return {
      success: true,
      message: 'Agent created. Please verify your email.',
    };
  }

  async login(dto: LoginAgentDto) {
    const agent = await this.agentRepository.findOne({
      where: { email: dto.email },
    });
    if (!agent) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, agent.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    if (!agent.is_email_verified)
      throw new UnauthorizedException('Email not verified');

    const payload = { sub: agent.id, email: agent.email, type: 'agent' };
    return {
      access_token: this.jwtService.sign(payload),
      agent: {
        id: agent.id,
        email: agent.email,
        first_name: agent.first_name,
        last_name: agent.last_name,
      },
    };
  }
}
