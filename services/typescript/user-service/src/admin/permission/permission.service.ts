import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AbstractService } from 'src/common/abstract.service';
import { Repository } from 'typeorm';
import { AdminPermission } from './entities/permission.entity';

@Injectable()
export class PermissionService extends AbstractService {
  constructor(
    @InjectRepository(AdminPermission)
    private permissionRepository: Repository<AdminPermission>,
  ) {
    super(permissionRepository);
  }
}
