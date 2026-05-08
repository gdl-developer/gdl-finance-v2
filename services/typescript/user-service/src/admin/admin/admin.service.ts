import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { Admin, UserType } from './entities/admin.entity';
import { getConnection, getRepository, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AbstractService } from 'src/common/abstract.service';
import { AdminRole } from '../role/entities/role.entity';
import { ModelNotFound } from 'src/common/Exceptions/model-not-found.exception';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { EnvService } from 'src/common/env.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PasswordResetDto } from 'src/user/auth/dto/reset-password.dto';
import { auth_actions_html } from 'src/common/utils/notification-templates/auth-actions-helper';
import { ExternalApiCallsService } from 'src/common/external-api-calls/external-api-calls.service';
import { AdminWelcomePasswordResetDto } from './dto/admin-welcome-password-reset.dto';
import { BusinessUnit } from '../business-units/entities/business-unit.entity';
import { OfficeBranch } from '../office-branches/entities/office-branch.entity';

@Injectable()
export class AdminService extends AbstractService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private externalApiCallsService: ExternalApiCallsService,
    private envService: EnvService,
  ) {
    super(adminRepository);
  }

  async createAdmin(createAdminDto: CreateAdminDto): Promise<any> {
    const { user_type, staffEmail, business_unit, office_branch, role } =
      createAdminDto;

    // Validate email domain
    if (!staffEmail.endsWith('@housemoni.ng')) {
      throw new NotAcceptableException(
        'Admin email must belong to the @housemoni.ng domain',
      );
    }
    // Ensure email uniqueness
    await this.validateExistingUser(staffEmail);

    // Auto-generate secure random password for all admins
    // (Previously Super Admin provided their own, but now unified for consistent onboarding)
    const plainTextPassword = this.generateSecurePassword();

    // Hash the password for storage
    const hashedPassword = await this.hashPassword(plainTextPassword);

    // Update DTO with hashed password for creation
    createAdminDto.password = hashedPassword;
    const data = createAdminDto;

    // Fetch the role entity
    const roleEntity = await this.validateRole(createAdminDto);

    // Build the new admin object
    const admin = await this.create({
      ...data,
      roles: roleEntity, // relation
      business_unit: { id: business_unit } as BusinessUnit, // relation by id
      office_branch: { id: office_branch } as OfficeBranch, // relation by id
      activationStatus: false, // New admins must reset password on first login
    });

    // Save to DB
    const savedAdmin = await this.adminRepository.save(admin);

    // Send welcome email with PLAIN TEXT password
    await this.adminWelcome({
      email: savedAdmin.staffEmail,
      old_password: plainTextPassword,
    });

    // Strip sensitive fields before returning
    return this.deleteAdminFields(savedAdmin);
  }

  async adminWelcome(adminWelcomePassRsetDto: AdminWelcomePasswordResetDto) {
    const { email, old_password } = adminWelcomePassRsetDto;
    const user = await this.findOne({
      staffEmail: email,
    });

    if (!user) throw new NotFoundException('User Not Found');

    const user_id = user.staffId;
    const { FRONT_END_BASE_URL, TEST_ADMIN_FRONTEND } = this.envService.read();
    const testAdminFrontend = TEST_ADMIN_FRONTEND || FRONT_END_BASE_URL;

    const message1 = `We're excited to welcome you to GDL Admin Plafform.`;
    const message2 = `Your admin account has been created successfully. Please login to activate your account.<br><br>
    <b>Login Credentials:</b><br><br>
    <b>URL:</b> <a href="${testAdminFrontend}">${testAdminFrontend}</a><br>
    <b>Email:</b> ${email}<br>
    <b>Temporary Password:</b> ${old_password}<br><br>
    You will be required to change this password upon your first login, login and update your password`;
    const data = {
      heading_logo: ``,
      heading: `Welcome To GDL Admin Platform`,
      message1: message1,
      message2: message2,
      message3: ``,
      request_otp: old_password,
      url: `${testAdminFrontend}/auth/login`,
      type: `WELCOME`,
    };

    const html = auth_actions_html(data);
    const request_ref = await this.genNotificationRef();

    const admin_welcome_notification = {
      sender: 'GDL',
      title: 'Welcome To GDL Admin Platform',
      description: 'Welcome To GDL Admin Platform',
      notification_type: 'IMPORTANT_ACTION',
      notification_mode: 'SINGLE',
      notification_channel: 'EMAIL',
      recipients_user_id: user_id,
      recipients_email: email,
      recipients_phone_number: 'null',
      request_ref: `PASSRESET_${request_ref}`,
      message: `${message1} ${message2}`,
      html: null,
      complete_html_body: html,
      show_advert: false,
    };

    await this.sendUserNotification(admin_welcome_notification);
    console.log('welcome notification action completed');
  }

  async genNotificationRef(): Promise<number> {
    return Math.floor(Math.random() * 1000000883 + 1000000441);
  }

  async sendUserNotification(notification_data: any) {
    const notify_data = await this.sendUserAuthNotifications(notification_data);

    if (!notify_data)
      throw new NotImplementedException('User Notification Not Sent');

    console.log('Successfully sent user notification');
    return notify_data;
  }

  async sendUserAuthNotifications(data: any): Promise<any> {
    const NOTN_BASE_URL = this.envService.read().NOTN_BASE_URL;
    const user_notn = await this.postData(
      `${NOTN_BASE_URL}/notifications/send`,
      data,
    );

    if (!user_notn)
      throw new NotImplementedException(
        'User Notification Could Not Be Sent. An Error Occured',
      );

    return user_notn.data;
  }

  async postData(url: string, data: any) {
    const notify = await this.externalApiCallsService.postData(url, data);

    return notify;
  }

  async validateRole(createAdminDto: CreateAdminDto) {
    const role = await getRepository(AdminRole).findOne({
      id: createAdminDto.role,
      // where: { id: In(createAdminDto.roles) },
    });

    if (!role) {
      throw new NotFoundException('Role Not Found');
    }

    console.log('role', role);

    return role;
  }

  async validateExistingUser(email: string) {
    const admin = await this.findOne({
      staffEmail: email,
    });

    if (admin) {
      throw new NotAcceptableException('Admin Already Exist');
    }
  }

  async getDefaultPassword(createAdminDto: CreateAdminDto) {
    const { user_type } = createAdminDto;

    let password: string;

    if (user_type == UserType.SUPER_ADMIN) {
      password = createAdminDto.password;
    } else {
      password = this.envService.read().DEFAULT_PASSWORD;
    }

    const hashed_password = await this.hashPassword(password);
    createAdminDto.password = hashed_password;

    return createAdminDto;
  }

  async update(id: number, data: UpdateAdminDto): Promise<any> {
    const admin = await this.adminRepository.findOne(id, {
      relations: ['roles', 'business_unit', 'office_branch'],
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    const {
      role,
      business_unit,
      office_branch,
      password,
      staffEmail,
      ...otherData
    } = data;

    // Handle password update if provided
    if (password) {
      admin.password = await this.hashPassword(password);
    }

    // Handle email update and uniqueness
    if (staffEmail && staffEmail !== admin.staffEmail) {
      if (!staffEmail.endsWith('@housemoni.ng')) {
        throw new NotAcceptableException(
          'Admin email must belong to the @housemoni.ng domain',
        );
      }
      await this.validateExistingUser(staffEmail);
      admin.staffEmail = staffEmail;
    }

    // Handle relations
    if (role) {
      admin.roles = await getRepository(AdminRole).findOne(role);
      if (!admin.roles) throw new NotFoundException('Role not found');
    }

    if (business_unit) {
      const bu = await getRepository(BusinessUnit).findOne(business_unit);
      if (!bu) throw new NotFoundException('Business Unit not found');
      admin.business_unit = bu;
    }

    if (office_branch) {
      const branch = await getRepository(OfficeBranch).findOne(office_branch);
      if (!branch) throw new NotFoundException('Office Branch not found');
      admin.office_branch = branch;
    }

    // Update other fields
    Object.assign(admin, otherData);

    const savedAdmin = await this.adminRepository.save(admin);
    return this.deleteAdminFields(savedAdmin);
  }

  async updateLastLogin(staffId: number, dateTime: any) {
    await this.adminRepository.update(
      { staffId: staffId },
      { last_login: dateTime },
    );
  }

  async findAllAdmin(query: any = {}) {
    const { page, per_page, search, startDate, endDate } = query;

    if (search || page || per_page) {
      const take = +per_page || 15;
      const skip = ((+page || 1) - 1) * take;

      const queryBuilder = this.adminRepository
        .createQueryBuilder('admin')
        .leftJoinAndSelect('admin.roles', 'roles')
        .leftJoinAndSelect('admin.business_unit', 'business_unit')
        .leftJoinAndSelect('admin.office_branch', 'office_branch')
        .orderBy('admin.createdAt', 'DESC')
        .take(take)
        .skip(skip);

      if (search) {
        queryBuilder.andWhere(
          '(admin.staffFirstName LIKE :search OR admin.staffLastName LIKE :search OR admin.staffEmail LIKE :search)',
          { search: `%${search}%` },
        );
      }

      if (startDate && endDate) {
        const { start_date, end_date } = await this.getDateRange(
          startDate,
          endDate,
        );
        queryBuilder.andWhere('admin.createdAt BETWEEN :start AND :end', {
          start: start_date,
          end: end_date,
        });
      }

      const [data, total] = await queryBuilder.getManyAndCount();

      for (const admin of data) {
        await this.deleteAdminFields(admin);
      }

      return {
        data,
        meta: {
          total,
          page: +page || 1,
          last_page: Math.ceil(total / take),
        },
      };
    }

    // Default behavior if no pagination/search (keeping it for backward compatibility if any)
    const admins = await this.findAllV2([
      'roles',
      'business_unit',
      'office_branch',
    ]);

    if (admins.length > 0) {
      for (let i = 0; i < admins.length; i++) {
        await this.deleteAdminFields(admins[i]);
      }
    }

    return admins;
  }

  async findByUsername(username: string) {
    const user = await getConnection()
      .createQueryBuilder(Admin, 'admin')
      .leftJoinAndSelect('admin.roles', 'roles')
      .leftJoinAndSelect('admin.business_unit', 'business_unit')
      .leftJoinAndSelect('admin.office_branch', 'office_branch')
      .where('admin.staffEmail = :username', { username })
      .getOne();

    if (!user) {
      throw new ModelNotFound('Invalid admin user');
    }

    const permissions = await this.getPermissions(user.staffId);
    user.permissions = permissions;

    // const u_admin = await this.deleteAdminFields(user);
    return user;
  }

  async getPermissions(staffId: number) {
    return await this.repository.query(
      'SELECT ap.* FROM admin_permission ap JOIN admin_role_permissions_admin_permission arpap ON' +
        ' ap.id = arpap.adminPermissionId JOIN admin_role ar ON arpap.adminRoleId = ar.id JOIN admin_roles_admin_role arar ON' +
        ' ar.id = arar.adminRoleId WHERE arar.adminStaffId = ?',
      [staffId],
    );
  }

  toggle(id: number) {
    return this.adminRepository.update(id, {
      activationStatus: () => '!activationStatus',
    });
  }

  async getApprovers(): Promise<Admin[]> {
    return this.adminRepository.find({
      where: { activationStatus: true },
      relations: ['roles', 'business_unit', 'office_branch'],
      order: { staffFirstName: 'ASC' },
    });
  }

  async getUser(user_id: number) {
    if (isNaN(user_id)) {
      throw new NotFoundException('Invalid User ID');
    }
    const admin = await this.adminRepository.findOne(user_id, {
      relations: ['roles', 'business_unit', 'office_branch'],
    });

    if (!admin) {
      throw new NotFoundException('User Not Found');
    }

    admin.permissions = await this.getPermissions(+user_id);

    const u_admin = await this.deleteAdminFields(admin);
    return u_admin;
  }

  async validateUser(username: string, pass: string): Promise<Admin> {
    const user = await this.findByUsername(username);

    if (!user) throw new NotFoundException('Incorrect User Details');

    const isMatch = bcrypt.compareSync(`${pass}`, user.password);

    if (user && isMatch) {
      return user;
    }
    return null;
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  /**
   * Generate a secure random password
   * Format: 12 characters with uppercase, lowercase, numbers, and symbols
   */
  private generateSecurePassword(): string {
    const length = 10;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-?';
    const allChars = uppercase + lowercase + numbers + symbols;

    // Ensure at least one character from each category
    let password = '';
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += symbols[crypto.randomInt(0, symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password
      .split('')
      .sort(() => crypto.randomInt(-1, 2))
      .join('');
  }

  async resetPassword(passwordResetDto: PasswordResetDto) {
    const { email, old_password, new_password } = passwordResetDto;
    const user = await this.validateUser(email, old_password);

    if (!user) {
      throw new NotAcceptableException(
        'Invalid old password or user not found',
      );
    }

    // The update method automatically hashes the password
    const update = await this.update(user.staffId, {
      password: new_password,
      last_login: new Date().toISOString(),
      activationStatus: true,
    } as any);

    return update;
  }

  async regenerateAdminPassword(id: number): Promise<any> {
    const admin = await this.adminRepository.findOne(id);
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    const plainTextPassword = this.generateSecurePassword();
    const hashedPassword = await this.hashPassword(plainTextPassword);

    admin.password = hashedPassword;
    const savedAdmin = await this.adminRepository.save(admin);

    try {
      await this.adminWelcome({
        email: savedAdmin.staffEmail,
        old_password: plainTextPassword,
      });
    } catch (error) {
      console.error(
        `Failed to send welcome email during password regeneration for admin ${id}:`,
        error,
      );
      // We still return the admin because the password was updated in DB
    }

    return this.deleteAdminFields(savedAdmin);
  }

  async updateAdmin(condition: any, data: any) {
    const updated = await this.adminRepository.update(condition, data);

    if (!updated) {
      throw new NotImplementedException('Update Action Failed');
    }
    const admin = await this.repository.findOne(condition);
    return admin;
  }

  async deleteAdminFields(admin: Admin) {
    delete admin.password;

    return admin;
  }

  async findUserByReferalCode(referral_code: string) {
    const admin: Admin = await this.findOne({
      referral_code: referral_code,
    });

    if (!admin) {
      throw new NotFoundException('Admin Not Found');
    }

    return {
      staff_name: `${admin.staffLastName} ${admin.staffFirstName}`,
    };
  }

  async deleteAdmin(id: number) {
    const admin = await this.findOne(id);
    if (!admin) {
      throw new NotFoundException('Admin Not Found');
    }
    await this.adminRepository.softDelete(id);
    return { message: 'Admin deleted successfully' };
  }

  /**
   * Delete all records from all entities in the database
   * This is a destructive operation and should be used with extreme caution
   * Only allowed in development and staging environments
   * @returns Object containing deletion summary
   */
  async deleteAllRecords(): Promise<any> {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const appEnv = process.env.APP_ENV || 'development';

    if (nodeEnv === 'production' || appEnv === 'production') {
      throw new NotAcceptableException(
        'Delete all records operation is not allowed in production.',
      );
    }

    if (nodeEnv === 'staging' || appEnv === 'staging') {
      console.warn('⚠️ WARNING: Deleting all records in STAGING environment.');
    }

    const connection = getConnection();
    const entities = connection.entityMetadatas;

    const summary = {
      environment: nodeEnv,
      totalEntities: entities.length,
      deletedEntities: [],
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      console.log(`🗑️ Starting deletion of all records...`);

      await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

      for (const entity of entities) {
        try {
          const tableName = entity.tableName;

          // Use TypeORM query builder for safe deletion
          const countResult = await connection
            .createQueryBuilder()
            .select('COUNT(*)', 'cnt')
            .from(entity.target, entity.name)
            .getRawOne();

          const countBefore = countResult?.cnt || 0;

          // Delete using query builder (safe from SQL injection)
          await connection
            .createQueryBuilder()
            .delete()
            .from(entity.target)
            .execute();

          summary.deletedEntities.push({
            entityName: entity.name,
            tableName,
            recordsDeleted: countBefore,
          });

          console.log(`✅ Deleted ${countBefore} from ${tableName}`);
        } catch (error) {
          summary.errors.push({
            entityName: entity.name,
            tableName: entity.tableName,
            error: error.message,
          });

          console.error(
            `❌ Error deleting from ${entity.tableName}:`,
            error.message,
          );
        }
      }

      await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

      return {
        success: true,
        message: 'All records deleted successfully',
        summary,
      };
    } catch (error) {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

      throw new NotImplementedException(
        `Failed to delete all records: ${error.message}`,
      );
    }
  }
}
