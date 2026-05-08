import { Controller, Post, Body } from '@nestjs/common';
import { AgentService } from './agent.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { LoginAgentDto } from './dto/login-agent.dto';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('create')
  create(@Body() dto: CreateAgentDto) {
    return this.agentService.createAgent(dto);
  }

  @Post('login')
  login(@Body() dto: LoginAgentDto) {
    return this.agentService.login(dto);
  }
}
