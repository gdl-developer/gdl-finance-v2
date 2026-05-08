import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class SyncSchemaMigration1000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Table: admin
    await this.ensureTable(queryRunner, 'admin', [
      {
        name: 'staffId',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'staffFirstName', type: 'varchar', length: '255' },
      { name: 'staffLastName', type: 'varchar', length: '255' },
      { name: 'avatar', type: 'varchar', length: '255', isNullable: true },
      { name: 'password', type: 'varchar', length: '255' },
      { name: 'activationStatus', type: 'tinyint', default: '0' },
      { name: 'staffEmail', type: 'varchar', length: '255' },
      {
        name: 'referral_code',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      { name: 'last_login', type: 'datetime', isNullable: true },
      { name: 'user_type', type: 'varchar', length: '50', default: "'ADMIN'" },
      { name: 'business_unit_id', type: 'int', isNullable: true },
      { name: 'branch_id', type: 'int', isNullable: true },
      {
        name: 'account_status',
        type: 'varchar',
        length: '50',
        default: "'ACTIVE'",
      },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'roles_id', type: 'int', isNullable: true },
      {
        name: 'refresh_token',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
    ]);

    // Table: auth_actions
    await this.ensureTable(queryRunner, 'auth_actions', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int' },
      { name: 'request_type', type: 'varchar', length: '50' },
      { name: 'request_token', type: 'varchar', length: '255' },
      { name: 'request_otp', type: 'varchar', length: '10', isNullable: true },
      { name: 'email', type: 'varchar', length: '255' },
      { name: 'expires_at', type: 'timestamp', isNullable: false },
      { name: 'is_used', type: 'tinyint', default: '0' },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: business_unit
    await this.ensureTable(queryRunner, 'business_unit', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'business_unit_name', type: 'varchar', length: '255' },
      { name: 'description', type: 'text' },
      { name: 'created_by', type: 'int' },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: company_profile
    await this.ensureTable(queryRunner, 'company_profile', [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      { name: 'name', type: 'varchar', length: '200' },
      { name: 'tradingName', type: 'varchar', length: '100', isNullable: true },
      { name: 'businessType', type: 'varchar', length: '50' },
      { name: 'rcNumber', type: 'varchar', length: '20', isUnique: true },
      { name: 'tinNumber', type: 'varchar', length: '20', isNullable: true },
      { name: 'vatNumber', type: 'varchar', length: '20', isNullable: true },
      { name: 'cacStatus', type: 'varchar', length: '50', isNullable: true },
      { name: 'incorporationDate', type: 'date', isNullable: true },
      { name: 'businessAddress', type: 'text' },
      { name: 'city', type: 'varchar', length: '100' },
      { name: 'state', type: 'varchar', length: '50' },
      { name: 'postalCode', type: 'varchar', length: '10', isNullable: true },
      { name: 'approvalType', type: 'varchar', length: '50', default: "'ALL'" },
      { name: 'country', type: 'varchar', length: '50', default: "'Nigeria'" },
      { name: 'email', type: 'varchar', length: '150' },
      { name: 'phone', type: 'varchar', length: '20' },
      { name: 'website', type: 'varchar', length: '200', isNullable: true },
      { name: 'businessDescription', type: 'text', isNullable: true },
      { name: 'industry', type: 'varchar', length: '100', isNullable: true },
      { name: 'status', type: 'varchar', length: '50', default: "'PENDING'" },
      { name: 'complianceStatus', type: 'json', isNullable: true },
      { name: 'isActive', type: 'tinyint', default: '1' },
      { name: 'isVerified', type: 'tinyint', default: '0' },
      { name: 'verifiedAt', type: 'datetime', isNullable: true },
      { name: 'verifiedBy', type: 'varchar', length: '36', isNullable: true },
      { name: 'verificationNotes', type: 'text', isNullable: true },
      { name: 'settings', type: 'json', isNullable: true },
      { name: 'metadata', type: 'json', isNullable: true },
      {
        name: 'businessModel',
        type: 'varchar',
        length: '100',
        isNullable: true,
      },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: directors
    await this.ensureTable(queryRunner, 'directors', [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      { name: 'name', type: 'varchar', length: '200' },
      { name: 'position', type: 'varchar', length: '150' },
      { name: 'nin', type: 'varchar', length: '512', isNullable: true },
      { name: 'bvn', type: 'varchar', length: '512', isNullable: true },
      { name: 'nationality', type: 'varchar', length: '80', isNullable: true },
      { name: 'dob', type: 'date', isNullable: true },
      { name: 'phone', type: 'varchar', length: '40', isNullable: true },
      { name: 'email', type: 'varchar', length: '200', isNullable: true },
      {
        name: 'residentialAddress',
        type: 'varchar',
        length: '300',
        isNullable: true,
      },
      { name: 'companyId', type: 'varchar', length: '36', isNullable: true },
    ]);

    // Table: director_documents
    await this.ensureTable(queryRunner, 'director_documents', [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      { name: 'documentType', type: 'varchar', length: '50' },
      { name: 'url', type: 'varchar', length: '300' },
      { name: 'name', type: 'varchar', length: '200', isNullable: true },
      {
        name: 'approvalStatus',
        type: 'varchar',
        length: '50',
        default: "'PENDING'",
      },
      { name: 'directorId', type: 'varchar', length: '36', isNullable: true },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: document_approvals
    await this.ensureTable(queryRunner, 'document_approvals', [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      { name: 'comment', type: 'varchar', length: '200', isNullable: true },
      {
        name: 'approvalStatus',
        type: 'varchar',
        length: '50',
        default: "'PENDING'",
      },
      { name: 'approvedById', type: 'int' },
      { name: 'documentId', type: 'varchar', length: '36' },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: documents (Company Documents)
    await this.ensureTable(queryRunner, 'documents', [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      { name: 'documentType', type: 'varchar', length: '100' },
      { name: 'url', type: 'varchar', length: '300' },
      { name: 'name', type: 'varchar', length: '200', isNullable: true },
      {
        name: 'approvalStatus',
        type: 'varchar',
        length: '50',
        default: "'PENDING'",
      },
      { name: 'companyId', type: 'varchar', length: '36', isNullable: true },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: scuml_certificates
    await this.ensureTable(queryRunner, 'scuml_certificates', [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      { name: 'number', type: 'varchar', length: '100' },
      { name: 'issueDate', type: 'date', isNullable: true },
      { name: 'expiryDate', type: 'date', isNullable: true },
      { name: 'company_id', type: 'char', length: '36', isNullable: true },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: office_branch
    await this.ensureTable(queryRunner, 'office_branch', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'branch_name', type: 'varchar', length: '255' },
      { name: 'branch_code', type: 'varchar', length: '50' },
      { name: 'created_by', type: 'int' },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: admin_permission
    await this.ensureTable(queryRunner, 'admin_permission', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'name', type: 'varchar', length: '255' },
      { name: 'description', type: 'varchar', length: '255', isNullable: true },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: admin_role
    await this.ensureTable(queryRunner, 'admin_role', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'name', type: 'varchar', length: '255' },
      { name: 'description', type: 'varchar', length: '255', isNullable: true },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: cba_interaction
    await this.ensureTable(queryRunner, 'cba_interaction', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int' },
      {
        name: 'symplus_customer_id',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      {
        name: 'bankone_customer_id',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      {
        name: 'bankone_account_number',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      {
        name: 'cba_account_type',
        type: 'varchar',
        length: '50',
        default: "'BANKONE | SYMPLUS'",
      },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: audit_logger
    await this.ensureTable(queryRunner, 'audit_logger', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int', isNullable: true },
      { name: 'user_type', type: 'varchar', length: '50' },
      { name: 'user_name', type: 'varchar', length: '255' },
      { name: 'roles', type: 'varchar', length: '255' },
      { name: 'action_performed', type: 'varchar', length: '255' },
      { name: 'ip_address', type: 'varchar', length: '255' },
      { name: 'attributes', type: 'text' },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: company_user_account_settings
    await this.ensureTable(queryRunner, 'company_user_account_settings', [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      {
        name: 'companyUserId',
        type: 'varchar',
        length: '36',
        isNullable: true,
      },
      { name: 'loginNotifications', type: 'tinyint', default: '1' },
      { name: 'transactionNotifications', type: 'tinyint', default: '1' },
      { name: 'passwordChangeNotifications', type: 'tinyint', default: '0' },
      { name: 'accountLockedNotifications', type: 'tinyint', default: '0' },
      {
        name: 'requireTwoFactorForTransactions',
        type: 'tinyint',
        default: '0',
      },
      { name: 'sessionTimeoutMinutes', type: 'int', default: '30' },
      {
        name: 'loginNotificationPreference',
        type: 'varchar',
        length: '50',
        default: "'EMAIL'",
      },
      {
        name: 'transactionNotificationPreference',
        type: 'varchar',
        length: '50',
        default: "'EMAIL'",
      },
      {
        name: 'securityNotificationPreference',
        type: 'varchar',
        length: '50',
        default: "'EMAIL'",
      },
      { name: 'theme', type: 'varchar', length: '50', default: "'LIGHT'" },
      { name: 'language', type: 'varchar', length: '10', default: "'en'" },
      { name: 'timezone', type: 'varchar', length: '50', default: "'UTC'" },
      {
        name: 'preferredCurrency',
        type: 'varchar',
        length: '10',
        default: "'USD'",
      },
      { name: 'showProfilePicture', type: 'tinyint', default: '1' },
      { name: 'allowDataCollection', type: 'tinyint', default: '0' },
      { name: 'allowMarketingEmails', type: 'tinyint', default: '1' },
      {
        name: 'dailyTransactionLimit',
        type: 'decimal',
        precision: 15,
        scale: 2,
        isNullable: true,
      },
      {
        name: 'monthlyTransactionLimit',
        type: 'decimal',
        precision: 15,
        scale: 2,
        isNullable: true,
      },
      { name: 'maxDailyTransactions', type: 'int', default: '10' },
      { name: 'backupCodes', type: 'json', isNullable: true },
      {
        name: 'recoveryEmail',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      {
        name: 'recoveryPhone',
        type: 'varchar',
        length: '20',
        isNullable: true,
      },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: company_user_auth_actions
    await this.ensureTable(queryRunner, 'company_user_auth_actions', [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      {
        name: 'companyUserId',
        type: 'varchar',
        length: '36',
        isNullable: true,
      },
      { name: 'email', type: 'varchar', length: '100' },
      { name: 'actionType', type: 'varchar', length: '50' },
      { name: 'requestToken', type: 'varchar', length: '50' },
      { name: 'requestOtp', type: 'varchar', length: '10' },
      { name: 'isUsed', type: 'tinyint', default: '0' },
      { name: 'usedAt', type: 'datetime', isNullable: true },
      { name: 'expiresAt', type: 'datetime' },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: company_users
    await this.ensureTable(queryRunner, 'company_users', [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      { name: 'firstName', type: 'varchar', length: '100' },
      { name: 'lastName', type: 'varchar', length: '100' },
      { name: 'middleName', type: 'varchar', length: '100', isNullable: true },
      { name: 'email', type: 'varchar', length: '100', isUnique: true },
      { name: 'phone', type: 'varchar', length: '20', isUnique: true },
      { name: 'password', type: 'varchar', length: '255' },
      { name: 'role', type: 'varchar', length: '50' },
      { name: 'status', type: 'varchar', length: '50', default: "'PENDING'" },
      {
        name: 'approvalLevel',
        type: 'varchar',
        length: '50',
        isNullable: true,
      },
      { name: 'companyId', type: 'varchar', length: '36', isNullable: true },
      { name: 'emailVerified', type: 'tinyint', default: '0' },
      { name: 'hasTransactionPin', type: 'tinyint', default: '0' },
      {
        name: 'transactionPin',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      { name: 'lastPasswordChange', type: 'date', isNullable: true },
      { name: 'lastLogin', type: 'date', isNullable: true },
      { name: 'deviceHash', type: 'varchar', length: '50', isNullable: true },
      {
        name: 'refreshToken',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      { name: 'metadata', type: 'json', isNullable: true },
      { name: 'failedLoginAttempts', type: 'int', default: '0' },
      { name: 'forcePasswordChange', type: 'tinyint', default: '0' },
      { name: 'twoFactorEnabled', type: 'tinyint', default: '0' },
      {
        name: 'twoFactorSecret',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      {
        name: 'profilePicture',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      { name: 'accountLockedUntil', type: 'datetime', isNullable: true },
      { name: 'isAccountLocked', type: 'tinyint', default: '0' },
      { name: 'accountSettings', type: 'json', isNullable: true },
      { name: 'lastFailedLoginAttempt', type: 'datetime', isNullable: true },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: kyc_level
    await this.ensureTable(queryRunner, 'kyc_level', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'level_number', type: 'int' },
      { name: 'level_name', type: 'varchar', length: '50' },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: security_question
    await this.ensureTable(queryRunner, 'security_question', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'question', type: 'varchar', length: '255' },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: seeding
    await this.ensureTable(queryRunner, 'seeding', [
      { name: 'id', type: 'varchar', length: '255', isPrimary: true },
      {
        name: 'creationDate',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: nuban_account
    await this.ensureTable(queryRunner, 'nuban_account', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int', isUnique: true },
      {
        name: 'user_account_ref',
        type: 'varchar',
        length: '255',
        isUnique: true,
      },
      { name: 'nuban_account', type: 'varchar', length: '15', isUnique: true },
      { name: 'account_type', type: 'varchar', length: '50', isNullable: true },
      {
        name: 'available_balance',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: '0.00',
      },
      {
        name: 'ledger_balance',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: '0.00',
      },
      {
        name: 'withdrawable_balance',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: '0.00',
      },
      { name: 'nuban_source', type: 'varchar', length: '50' },
      {
        name: 'wallet_type',
        type: 'varchar',
        length: '50',
        default: "'NUBAN'",
      },
      {
        name: 'withdrawable_to',
        type: 'varchar',
        length: '50',
        default: "'Other Banks'",
      },
      { name: 'currency', type: 'varchar', length: '10', default: "'NGN'" },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: wallet
    await this.ensureTable(queryRunner, 'wallet', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int', isUnique: true },
      { name: 'email', type: 'varchar', length: '50', isUnique: true },
      { name: 'wallet_type', type: 'varchar', length: '50', default: "'MAIN'" },
      { name: 'currency', type: 'varchar', length: '10', default: "'NGN'" },
      {
        name: 'current_balance',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: '0.00',
      },
      {
        name: 'locked_balance',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: '0.00',
      },
      {
        name: 'bvn',
        type: 'varchar',
        length: '20',
        isUnique: true,
        isNullable: true,
      },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: account_setting
    await this.ensureTable(queryRunner, 'account_setting', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int' },
      {
        name: 'settlement_account_number',
        type: 'varchar',
        length: '30',
        isUnique: true,
        isNullable: true,
      },
      {
        name: 'settlement_account_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      {
        name: 'settlement_bank_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: devices
    await this.ensureTable(queryRunner, 'devices', [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      { name: 'browserName', type: 'varchar', length: '100' },
      { name: 'userAgent', type: 'text' },
      { name: 'os', type: 'varchar', length: '100' },
      { name: 'platform', type: 'varchar', length: '100' },
      { name: 'deviceHash', type: 'varchar', length: '255' },
      { name: 'userId', type: 'varchar', length: '36', isUnique: true },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: daily_accrual_logs
    await this.ensureTable(queryRunner, 'daily_accrual_logs', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'pool_id', type: 'int' },
      { name: 'investment_type', type: 'varchar', length: '50' },
      { name: 'admin_id', type: 'int', isNullable: true },
      {
        name: 'admin_first_name',
        type: 'varchar',
        length: '50',
        isNullable: true,
      },
      {
        name: 'admin_last_name',
        type: 'varchar',
        length: '50',
        isNullable: true,
      },
      {
        name: 'admin_department',
        type: 'varchar',
        length: '100',
        isNullable: true,
      },
      {
        name: 'accrued_gain',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: "'0.00'",
      },
      {
        name: 'accrued_loss',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: "'0.00'",
      },
      {
        name: 'balance_with_gain_or_loss',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: "'0.00'",
      },
      { name: 'accrual_date', type: 'date', default: '(CURRENT_DATE)' },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: user_investment_pools
    await this.ensureTable(queryRunner, 'user_investment_pools', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'type', type: 'varchar', length: '50' },
      {
        name: 'total_invested',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: "'0.00'",
      },
      {
        name: 'total_redeemed',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: "'0.00'",
      },
      {
        name: 'current_balance',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: "'0.00'",
      },
      { name: 'status', type: 'varchar', length: '50', default: "'ACTIVE'" },
      { name: 'is_visible', type: 'tinyint', default: '1' },
      {
        name: 'accrued_gain',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: "'0.00'",
      },
      {
        name: 'accrued_loss',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: "'0.00'",
      },
      {
        name: 'balance_with_gain_or_loss',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: "'0.00'",
      },
      {
        name: 'yield_rate',
        type: 'decimal',
        precision: 10,
        scale: 4,
        default: "'0.0000'",
      },
      {
        name: 'nav',
        type: 'decimal',
        precision: 20,
        scale: 4,
        default: "'0.0000'",
      },
      { name: 'description', type: 'varchar', length: '255', isNullable: true },
      { name: 'user_id', type: 'int' },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: transaction_audits
    await this.ensureTable(queryRunner, 'transaction_audits', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int' },
      { name: 'reference', type: 'varchar', length: '64' },
      { name: 'type', type: 'varchar', length: '50' },
      { name: 'amount', type: 'decimal', precision: 20, scale: 2 },
      { name: 'balance_before', type: 'decimal', precision: 20, scale: 2 },
      { name: 'balance_after', type: 'decimal', precision: 20, scale: 2 },
      {
        name: 'related_entity',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      { name: 'status', type: 'varchar', length: '50', default: "'PENDING'" },
      { name: 'meta', type: 'text', isNullable: true },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: mmf_investment_request
    await this.ensureTable(queryRunner, 'mmf_investment_request', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int' },
      { name: 'first_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'last_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'account', type: 'varchar', length: '100' },
      { name: 'date', type: 'date' },
      { name: 'price', type: 'decimal', precision: 20, scale: 2 },
      { name: 'quantity', type: 'decimal', precision: 20, scale: 2 },
      { name: 'reference', type: 'varchar', length: '100', isUnique: true },
      { name: 'status', type: 'varchar', length: '20', default: "'PENDING'" },
      { name: 'admin_notes', type: 'text', isNullable: true },
      { name: 'approved_by', type: 'int', isNullable: true },
      { name: 'approved_at', type: 'timestamp', isNullable: true },
      { name: 'FundAccountNo', type: 'text', isNullable: true },
      { name: 'CashAccountNo', type: 'text', isNullable: true },
      { name: 'rejected_by', type: 'int', isNullable: true },
      { name: 'rejected_at', type: 'timestamp', isNullable: true },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: fund_redemption_mmf_requests
    await this.ensureTable(queryRunner, 'fund_redemption_mmf_requests', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_identity', type: 'int' },
      { name: 'investment_request_id', type: 'int', isNullable: true },
      { name: 'first_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'last_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'account', type: 'varchar', length: '100' },
      { name: 'redemption_date', type: 'date' },
      { name: 'amount', type: 'decimal', precision: 20, scale: 2 },
      {
        name: 'quantity',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: '0',
      },
      { name: 'reference', type: 'varchar', length: '100', isUnique: true },
      {
        name: 'status',
        type: 'varchar',
        length: '20',
        default: "'PROCESSING'",
      },
      { name: 'approved_by', type: 'int', isNullable: true },
      { name: 'approved_at', type: 'timestamp', isNullable: true },
      { name: 'rejected_by', type: 'int', isNullable: true },
      { name: 'rejected_at', type: 'timestamp', isNullable: true },
      { name: 'admin_notes', type: 'text', isNullable: true },
      { name: 'fund_account_no', type: 'text', isNullable: true },
      { name: 'cash_account_no', type: 'text', isNullable: true },
      { name: 'transaction_response', type: 'text', isNullable: true },
      { name: 'completed_at', type: 'timestamp', isNullable: true },
      { name: 'failed_at', type: 'timestamp', isNullable: true },
      { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
    ]);

    // Table: fund_redemption_canary_request
    await this.ensureTable(queryRunner, 'fund_redemption_canary_request', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_identity', type: 'int' },
      { name: 'investment_request_id', type: 'int', isNullable: true },
      { name: 'first_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'last_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'account', type: 'varchar', length: '100' },
      { name: 'redemption_date', type: 'date' },
      { name: 'amount', type: 'decimal', precision: 20, scale: 2 },
      {
        name: 'quantity',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: '0',
      },
      { name: 'reference', type: 'varchar', length: '100', isUnique: true },
      {
        name: 'status',
        type: 'varchar',
        length: '20',
        default: "'PROCESSING'",
      },
      { name: 'approved_by', type: 'int', isNullable: true },
      { name: 'approved_at', type: 'timestamp', isNullable: true },
      { name: 'rejected_by', type: 'int', isNullable: true },
      { name: 'rejected_at', type: 'timestamp', isNullable: true },
      { name: 'admin_notes', type: 'text', isNullable: true },
      { name: 'fund_account_no', type: 'text', isNullable: true },
      { name: 'cash_account_no', type: 'text', isNullable: true },
      { name: 'transaction_response', type: 'text', isNullable: true },
      { name: 'completed_at', type: 'timestamp', isNullable: true },
      { name: 'failed_at', type: 'timestamp', isNullable: true },
      { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
    ]);

    // Table: fund_redemption_income_request
    await this.ensureTable(queryRunner, 'fund_redemption_income_request', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_identity', type: 'int' },
      { name: 'investment_request_id', type: 'int', isNullable: true },
      { name: 'first_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'last_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'account', type: 'varchar', length: '100' },
      { name: 'redemption_date', type: 'date' },
      { name: 'amount', type: 'decimal', precision: 20, scale: 2 },
      {
        name: 'quantity',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: '0',
      },
      { name: 'reference', type: 'varchar', length: '100', isUnique: true },
      {
        name: 'status',
        type: 'varchar',
        length: '20',
        default: "'PROCESSING'",
      },
      { name: 'approved_by', type: 'int', isNullable: true },
      { name: 'approved_at', type: 'timestamp', isNullable: true },
      { name: 'rejected_by', type: 'int', isNullable: true },
      { name: 'rejected_at', type: 'timestamp', isNullable: true },
      { name: 'admin_notes', type: 'text', isNullable: true },
      { name: 'fund_account_no', type: 'text', isNullable: true },
      { name: 'cash_account_no', type: 'text', isNullable: true },
      { name: 'transaction_response', type: 'text', isNullable: true },
      { name: 'completed_at', type: 'timestamp', isNullable: true },
      { name: 'failed_at', type: 'timestamp', isNullable: true },
      { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
    ]);

    // Table: canary_investment_request
    await this.ensureTable(queryRunner, 'canary_investment_request', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int' },
      { name: 'first_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'last_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'account', type: 'varchar', length: '100' },
      { name: 'date', type: 'date' },
      { name: 'price', type: 'decimal', precision: 20, scale: 2 },
      { name: 'quantity', type: 'decimal', precision: 20, scale: 2 },
      { name: 'reference', type: 'varchar', length: '100', isUnique: true },
      { name: 'status', type: 'varchar', length: '20', default: "'PENDING'" },
      { name: 'admin_notes', type: 'text', isNullable: true },
      { name: 'approved_by', type: 'int', isNullable: true },
      { name: 'approved_at', type: 'timestamp', isNullable: true },
      { name: 'rejected_by', type: 'int', isNullable: true },
      { name: 'rejected_at', type: 'timestamp', isNullable: true },
      { name: 'FundAccountNo', type: 'text', isNullable: true },
      { name: 'CashAccountNo', type: 'text', isNullable: true },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: income_investment_request
    await this.ensureTable(queryRunner, 'income_investment_request', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int' },
      { name: 'first_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'last_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'account', type: 'varchar', length: '100' },
      { name: 'date', type: 'date' },
      { name: 'price', type: 'decimal', precision: 20, scale: 2 },
      { name: 'quantity', type: 'decimal', precision: 20, scale: 2 },
      { name: 'reference', type: 'varchar', length: '100', isUnique: true },
      { name: 'status', type: 'varchar', length: '20', default: "'PENDING'" },
      { name: 'admin_notes', type: 'text', isNullable: true },
      { name: 'approved_by', type: 'int', isNullable: true },
      { name: 'approved_at', type: 'timestamp', isNullable: true },
      { name: 'rejected_by', type: 'int', isNullable: true },
      { name: 'rejected_at', type: 'timestamp', isNullable: true },
      { name: 'FundAccountNo', type: 'text', isNullable: true },
      { name: 'CashAccountNo', type: 'text', isNullable: true },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: login_history
    await this.ensureTable(queryRunner, 'login_history', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int' },
      { name: 'user_ip', type: 'varchar', length: '255' },
      {
        name: 'user_location',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      { name: 'longitude', type: 'varchar', length: '255' },
      { name: 'latitude', type: 'varchar', length: '255' },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: owner_doc
    await this.ensureTable(queryRunner, 'owner_doc', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int' },
      { name: 'full_name', type: 'varchar', length: '50', isNullable: true },
      {
        name: 'identification_doc',
        type: 'varchar',
        length: '50',
        isNullable: true,
      },
      {
        name: 'identification_number',
        type: 'varchar',
        length: '250',
        isNullable: true,
      },
      {
        name: 'identification_doc_url',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      {
        name: 'proof_of_address_doc',
        type: 'varchar',
        length: '250',
        isNullable: true,
      },
      {
        name: 'proof_of_address_url',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      {
        name: 'owner_docs_verification_status',
        type: 'varchar',
        length: '50',
        default: "'NOT_VERIFIED'",
      },
      { name: 'verified_by', type: 'int', isNullable: true },
      { name: 'verification_date', type: 'datetime', isNullable: true },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: user_account
    await this.ensureTable(queryRunner, 'user_account', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'first_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'last_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'other_name', type: 'varchar', length: '30', isNullable: true },
      { name: 'email', type: 'varchar', length: '50', isUnique: true },
      { name: 'phone_number', type: 'varchar', length: '20', isUnique: true },
      { name: 'password', type: 'varchar', length: '255' },
      { name: 'user_txn_ref', type: 'varchar', length: '50', isNullable: true },
      {
        name: 'user_referral_code',
        type: 'varchar',
        length: '20',
        isNullable: true,
      },
      { name: 'gender', type: 'varchar', length: '10', isNullable: true },
      { name: 'has_identity_documents', type: 'tinyint', default: '0' },
      { name: 'has_adress_documents', type: 'tinyint', default: '0' },
      { name: 'kyc_level_id', type: 'int', isNullable: true },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Table: virtual_wallet
    await this.ensureTable(queryRunner, 'virtual_wallet', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int', isUnique: true },
      {
        name: 'virtual_account_number',
        type: 'varchar',
        length: '20',
        isUnique: true,
      },
      { name: 'virtual_account_name', type: 'varchar', length: '100' },
      { name: 'bank_code', type: 'varchar', length: '10' },
      { name: 'amount_control', type: 'varchar', length: '50' },
      {
        name: 'current_balance',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: '0.00',
      },
      {
        name: 'total_credited',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: '0.00',
      },
      {
        name: 'total_debited',
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: '0.00',
      },
      { name: 'status', type: 'varchar', length: '50', default: "'ACTIVE'" },
      { name: 'response_code', type: 'varchar', length: '10', default: "'00'" },
      { name: 'response_message', type: 'text', isNullable: true },
      {
        name: 'callback_url',
        type: 'varchar',
        length: '255',
        isNullable: true,
      },
      { name: 'FundAccountNo', type: 'text', isNullable: true },
      { name: 'CashAccountNo', type: 'text', isNullable: true },
      { name: 'extra_data', type: 'text', isNullable: true },
      { name: 'last_transaction_date', type: 'timestamp', isNullable: true },
      { name: 'is_primary', type: 'tinyint', default: '0' },
      { name: 'encrypted_symplus_customer_id', type: 'text', isNullable: true },
      {
        name: 'encrypted_infoware_customer_id',
        type: 'text',
        isNullable: true,
      },
      {
        name: 'symplus_status_code',
        type: 'varchar',
        length: '10',
        isNullable: true,
      },
      { name: 'symplus_remarks', type: 'text', isNullable: true },
      { name: 'symplus_created_at', type: 'timestamp', isNullable: true },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: virtual_wallet_transaction
    await this.ensureTable(queryRunner, 'virtual_wallet_transaction', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'virtual_wallet_id', type: 'int' },
      { name: 'user_id', type: 'int' },
      {
        name: 'transaction_reference',
        type: 'varchar',
        length: '150',
        isUnique: true,
      },
      {
        name: 'external_reference',
        type: 'varchar',
        length: '50',
        isNullable: true,
      },
      { name: 'transaction_type', type: 'varchar', length: '50' },
      { name: 'amount', type: 'decimal', precision: 20, scale: 2 },
      { name: 'balance_before', type: 'decimal', precision: 20, scale: 2 },
      { name: 'balance_after', type: 'decimal', precision: 20, scale: 2 },
      { name: 'description', type: 'varchar', length: '200', isNullable: true },
      { name: 'sender_name', type: 'varchar', length: '100', isNullable: true },
      {
        name: 'sender_account',
        type: 'varchar',
        length: '100',
        isNullable: true,
      },
      {
        name: 'sender_bank_code',
        type: 'varchar',
        length: '10',
        isNullable: true,
      },
      {
        name: 'receiver_name',
        type: 'varchar',
        length: '100',
        isNullable: true,
      },
      {
        name: 'receiver_account',
        type: 'varchar',
        length: '100',
        isNullable: true,
      },
      {
        name: 'receiver_bank_code',
        type: 'varchar',
        length: '10',
        isNullable: true,
      },
      {
        name: 'status',
        type: 'varchar',
        length: '50',
        default: "'SUCCESSFUL'",
      },
      { name: 'response_code', type: 'varchar', length: '10', default: "'00'" },
      { name: 'response_message', type: 'text', isNullable: true },
      { name: 'metadata', type: 'text', isNullable: true },
      { name: 'processed_at', type: 'timestamp', isNullable: true },
      {
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ]);

    // Table: user_security_question
    await this.ensureTable(queryRunner, 'user_security_question', [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'user_id', type: 'int' },
      { name: 'question', type: 'varchar', length: '255' },
      { name: 'answer', type: 'varchar', length: '255' },
      { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP(6)' },
    ]);

    // Join Table for AdminRole and AdminPermission (many-to-many)
    await this.ensureTable(
      queryRunner,
      'admin_role_permissions_admin_permission',
      [
        { name: 'adminRoleId', type: 'int' },
        { name: 'adminPermissionId', type: 'int' },
      ],
    );
  }

  private async ensureTable(
    queryRunner: QueryRunner,
    tableName: string,
    columns: any[],
  ): Promise<void> {
    const hasTable = await queryRunner.hasTable(tableName);

    if (!hasTable) {
      // Create table
      const columnStrings = columns
        .map((c) => {
          let s = `\`${c.name}\` ${c.type}`;
          if (c.length) s += `(${c.length})`;
          if (c.precision && c.scale) s += `(${c.precision},${c.scale})`;
          if (
            (c.type === 'timestamp' || c.type === 'datetime') &&
            c.default &&
            c.default.includes('(6)') &&
            !c.length
          )
            s += '(6)';
          if (c.isPrimary) s += ' PRIMARY KEY';
          if (c.isGenerated && c.generationStrategy === 'increment')
            s += ' AUTO_INCREMENT';
          if (!c.isNullable && !c.isPrimary) s += ' NOT NULL';
          if (c.default) s += ` DEFAULT ${c.default}`;
          if (c.isUnique) s += ` UNIQUE`;
          return s;
        })
        .join(', ');

      await queryRunner.query(
        `CREATE TABLE \`${tableName}\` (${columnStrings})`,
      );
      console.log(`Table ${tableName} created.`);
    } else {
      // Check columns
      for (const col of columns) {
        const hasColumn = await queryRunner.hasColumn(tableName, col.name);
        if (!hasColumn) {
          let s = `ALTER TABLE \`${tableName}\` ADD \`${col.name}\` ${col.type}`;
          if (col.length) s += `(${col.length})`;
          if (col.precision && col.scale)
            s += `(${col.precision},${col.scale})`;
          if (
            (col.type === 'timestamp' || col.type === 'datetime') &&
            col.default &&
            col.default.includes('(6)') &&
            !col.length
          )
            s += '(6)';
          if (!col.isNullable) s += ' NOT NULL';
          if (col.default) s += ` DEFAULT ${col.default}`;
          if (col.isUnique) s += ` UNIQUE`;

          try {
            await queryRunner.query(s);
            console.log(`Column ${col.name} added to ${tableName}.`);
          } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
              console.warn(
                `Warning: Could not add UNIQUE/NOT NULL constraint to column ${col.name} in table ${tableName} due to existing data. Adding column as NULLable without UNIQUE constraint.`,
              );

              let sRetry = `ALTER TABLE \`${tableName}\` ADD \`${col.name}\` ${col.type}`;
              if (col.length) sRetry += `(${col.length})`;
              if (col.precision && col.scale)
                sRetry += `(${col.precision},${col.scale})`;
              if (
                (col.type === 'timestamp' || col.type === 'datetime') &&
                col.default &&
                col.default.includes('(6)') &&
                !col.length
              )
                sRetry += '(6)';

              if (col.default) sRetry += ` DEFAULT ${col.default}`;

              await queryRunner.query(sRetry);
              console.log(
                `Column ${col.name} added to ${tableName} (relaxed constraints).`,
              );
            } else {
              throw error;
            }
          }
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Migration down is typically not used for schema sync as it's meant to be additive and safe
  }
}
