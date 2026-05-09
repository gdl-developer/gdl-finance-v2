import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AbstractService } from 'src/common/abstract.service';
import { getRepository, In, Repository } from 'typeorm';
import { AdminPermission } from '../permission/entities/permission.entity';
import { AdminRole } from './entities/role.entity';

@Injectable()
export class RoleService extends AbstractService {
  constructor(
    @InjectRepository(AdminRole)
    private roleRepository: Repository<AdminRole>,
  ) {
    super(roleRepository);
  }

  async create(data: any): Promise<any> {
    const permissions = await getRepository(AdminPermission).find({
      where: { id: In(data.permissions) },
    });
    console.log('permissions', permissions);
    const roleObj = await this.repository.save({
      name: data.name,
      description: data.description,
      permissions: permissions,
    });
    return roleObj;
  }
}
