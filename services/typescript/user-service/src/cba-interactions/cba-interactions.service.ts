import {
  Injectable,
  NotAcceptableException,
  NotImplementedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateSymplusIndividualCustomerDto } from './dto/create-symplus-individual-customer.dto';
import { CreateBankOneAccountQuickDto } from './dto/create-bankone-account-quick.dto';
import { CreateBankOneCustomerNAccountDto } from './dto/create-bankone-customer-n-account.dto';
import { GenderTypes, UserAccount } from 'src/user/user/entities/user.entity';
import { AbstractService } from 'src/common/abstract.service';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CBAAccountTypes,
  CbaInteraction,
} from './entities/cba-interaction.entity';
import { Repository } from 'typeorm';
import { ExternalApiCallsService } from 'src/common/external-api-calls/external-api-calls.service';
import { NubanAccountsService } from 'src/sidecars/nuban-accounts/nuban-accounts.service';
import { CreateNubanAccountDto } from 'src/sidecars/nuban-accounts/dto/create-nuban-account.dto';
import { NUBANSource } from 'src/sidecars/nuban-accounts/entities/nuban-account.entity';
import { WalletsService } from 'src/sidecars/wallets/wallets.service';

@Injectable()
export class CbaInteractionsService extends AbstractService {
  private readonly bankOneBaseUrl: string;
  private readonly symplusBaseUrl: string;

  constructor(
    @InjectRepository(CbaInteraction)
    private readonly cbaInteractionsRepo: Repository<CbaInteraction>,
    private readonly externalApiCallsService: ExternalApiCallsService,
    private readonly nubanAccountsService: NubanAccountsService,
    private readonly walletsService: WalletsService,
    private readonly configService: ConfigService,
  ) {
    super(cbaInteractionsRepo);
    this.bankOneBaseUrl = this.configService.get<string>(
      'BANKONE_SERVICE_BASE_URL',
    );
    this.symplusBaseUrl = this.configService.get<string>(
      'SYMPLUS_SERVICE_BASE_URL',
    );
  }

  async createCBACustomerAccounts(user: UserAccount) {
    try {
      const bvn_status = await this.walletsService.validateBVNStatus({
        user_id: user.id,
        wallet_ref: user.user_txn_ref,
      });

      if (!bvn_status) {
        console.log(
          `User BVN for user ${user.id} not yet validated - CBA actions deferred.`,
        );
        return;
      }

      console.log(
        `BVN verified for user ${user.id}. Proceeding with CBA account checks.`,
      );
      const cbaRecord = await this.validateExistingUserCBARecord(user.id);
      const userNubanRecords = await this.checkUserNubanRecords(user.id);

      if (!cbaRecord && !userNubanRecords) {
        await this.createAllAccounts(user);
      } else if (cbaRecord && !cbaRecord.bankone_customer_id) {
        await this.updateBankOneCustomerDetails(user);
      } else if (cbaRecord?.bankone_customer_id && !userNubanRecords) {
        await this.reattemptCreateUserNubanRecords(user);
      } else if (cbaRecord && !cbaRecord.symplus_customer_id) {
        await this.updateSymplusCustomerDetails(user);
      } else {
        console.log('Customer CBA Records Already Exist');
      }
    } catch (error) {
      console.error('Error in createCBACustomerAccounts:', error.message);
      // Re-throw to allow higher-level handling if necessary
      throw error;
    }
  }

  async createAllAccounts(user: UserAccount) {
    console.log('[CbaService] Creating all accounts for user:', user.id);
    const customer = await this.createBankOneQuickAccount(user);
    console.log('[CbaService] BankOne Quick Account Created:', customer);
    // await this.createSymplusCustomerAccount(user);
  }

  async updateBankOneCustomerDetails(user: UserAccount) {
    const customer = await this.createBankOneQuickAccount(user);
    const customerId = customer.CustomerID || customer.customerID;

    await this.updateBankOneCBARecord({
      user_id: user.id,
      user: { id: user.id },
      bankone_customer_id: customerId,
      bankone_account_number: customer.BankoneAccountNumber,
    });
  }

  async reattemptCreateUserNubanRecords(user: UserAccount) {
    const customer = await this.createBankOneQuickAccount(user);

    // BankOne can return customer as an array or object
    const customerData = Array.isArray(customer) ? customer[0] : customer;

    if (!customerData?.Accounts?.[0]?.AccountNumber) {
      console.error('[CbaService] No NUBAN found in customer data');
      return;
    }

    await this.validateUserNubanRecord({
      user_id: user.id,
      user_account_ref: user.user_txn_ref,
      nuban_account: customerData.Accounts[0].AccountNumber,
      nuban_source: NUBANSource.BANKONE,
    });
  }

  async updateSymplusCustomerDetails(user: UserAccount) {
    const customer = await this.createSymplusCustomerAccount(user);
    if (customer?.reference?.CustomerID) {
      await this.updateSymplusCBARecord({
        symplus_customer_id: customer.reference.CustomerID,
        user_id: user.id,
      });
    }
  }

  async validateExistingUserCBARecord(
    user_id: number,
  ): Promise<CbaInteraction> {
    const cba_record = await this.validateExisting({ user_id });
    return cba_record as CbaInteraction;
  }

  async createSymplusCustomerAccount(user: UserAccount) {
    const create_symplus_customer_data =
      await this.prepareCreateSymplusCustomerAccountData(user);

    let customer = await this.getSymplusCustomerByEmail(
      create_symplus_customer_data.primary_email_address,
    );

    if (!customer || (Array.isArray(customer) && customer.length === 0)) {
      const new_customer = await this.createIndividualSymplusAccount(
        create_symplus_customer_data,
      );

      if (new_customer?.reference?.CustomerID) {
        await this.updateSymplusCBARecord({
          symplus_customer_id: new_customer.reference.CustomerID,
          user_id: user.id,
        });
      }
      customer = new_customer;
    }
    return customer;
  }

  async createBankOneQuickAccount(user: UserAccount) {
    try {
      const lookupResponse = await this.getBankOneCustomerByPhoneNumber(
        user.phone,
      );

      // BankOne "Not Found" logic varies by implementation, usually IsSuccessful is false
      if (!lookupResponse?.IsSuccessful) {
        console.log('[CbaService] No BankOne customer found. Creating new...');
        const createData = await this.prepareCreateBankOneQuickAcctData(user);
        const newCustomer = await this.createIndBankOneQuickAccount(createData);

        if (newCustomer?.IsSuccessful) {
          await this.updateBankOneCBARecord({
            user_id: user.id,
            user: { id: user.id },
            bankone_customer_id: newCustomer.Message.CustomerID,
            bankone_account_number: newCustomer.Message.BankoneAccountNumber,
          });
          return newCustomer;
        } else {
          throw new InternalServerErrorException(
            'BankOne account creation failed.',
          );
        }
      }

      console.log('[CbaService] Existing BankOne customer found.');
      await this.processExistingCustomer(user, lookupResponse);
      return lookupResponse;
    } catch (error) {
      console.error(
        '[CbaService] createBankOneQuickAccount failed:',
        error.message,
      );
      throw error;
    }
  }

  private async processExistingCustomer(user: UserAccount, customer: any) {
    const customers = Array.isArray(customer) ? customer : [customer];

    for (const entry of customers) {
      const customerId = entry.CustomerID || entry.customerID;
      const customerName =
        entry.FullName || `${entry.LastName} ${entry.FirstName}`;
      const customerEmail = entry.Email || entry.primary_email_address;

      if (customerId) {
        await this.handleNubanValidation(
          user,
          entry,
          customerName,
          customerEmail,
        );
      }
    }
  }

  private async handleNubanValidation(
    user: UserAccount,
    customer: any,
    customerName: string,
    customerEmail: string,
  ) {
    const localFullName = `${user.last_name} ${user.first_name}`
      .toLowerCase()
      .trim();
    const remoteFullName = (customerName || '').toLowerCase().trim();
    const localEmail = user.email.toLowerCase().trim();
    const remoteEmail = (customerEmail || '').toLowerCase().trim();

    const isMatch =
      remoteFullName === localFullName || remoteEmail === localEmail;

    if (!isMatch) {
      throw new NotAcceptableException(
        'Identity mismatch: CBA record exists for this phone number but details do not match.',
      );
    }

    if (!customer?.Accounts?.length) {
      console.warn('[CbaService] Customer exists but has no linked accounts');
      return;
    }

    await this.validateUserNubanRecord({
      user_id: user.id,
      user_account_ref: user.user_txn_ref,
      nuban_account: customer.Accounts[0].AccountNumber,
      nuban_source: NUBANSource.BANKONE,
    });
  }

  async getSymplusCustomerByEmail(user_email: string) {
    const url_path = `customer/email/${user_email}`;
    const customer = await this.symplusServiceGetCall(url_path);
    return customer?.GetCustomerByEmail;
  }

  async createIndividualSymplusAccount(
    dto: CreateSymplusIndividualCustomerDto,
  ) {
    const url_path = `customer/new/individual/account`;
    return this.symplusServicePostCall(dto, url_path);
  }

  async createIndBankOneQuickAccount(dto: CreateBankOneAccountQuickDto) {
    const url_path = `accounts/create/quick/account`;
    return this.bankOneServicePostCall(dto, url_path);
  }

  async getBankOneCustomerByPhoneNumber(phone_number: string) {
    const url_path = `customer/by/phone/number?phoneNumber=${phone_number}`;
    return this.bankOneServiceGetCall(url_path);
  }

  async symplusServicePostCall(data: any, url_path: string): Promise<any> {
    const res = await this.postData(`${this.symplusBaseUrl}/${url_path}`, data);
    return res?.data;
  }

  async symplusServiceGetCall(url_path: string): Promise<any> {
    const res = await this.fetchData(`${this.symplusBaseUrl}/${url_path}`);
    return res?.data;
  }

  async bankOneServicePostCall(data: any, url_path: string): Promise<any> {
    const res = await this.postData(`${this.bankOneBaseUrl}/${url_path}`, data);
    return res?.data;
  }

  async bankOneServiceGetCall(url_path: string): Promise<any> {
    const res = await this.fetchData(`${this.bankOneBaseUrl}/${url_path}`);
    return res?.data;
  }

  async postData(url: string, data: any) {
    return this.externalApiCallsService.postData(url, data);
  }

  async fetchData(url: string) {
    return this.externalApiCallsService.getData(url);
  }

  async prepareCreateBankOneQuickAcctData(user: UserAccount) {
    const gender = user.gender === GenderTypes.MALE ? 0 : 1;
    return {
      TransactionTrackingRef: user.user_txn_ref,
      AccountOpeningTrackingRef: user.user_txn_ref,
      ProductCode: '202',
      LastName: user.last_name,
      OtherNames: user.first_name,
      PhoneNo: user.phone,
      Gender: gender,
      PlaceOfBirth: user.place_of_birth,
      DateOfBirth: user.date_of_birth,
      Address: user.address,
      AccountOfficerCode: 'GD0691',
      Email: user.email,
      NotificationPreference: 3,
      TransactionPermission: '0',
      AccountTier: '1',
    };
  }

  async prepareCreateSymplusCustomerAccountData(user: UserAccount) {
    const dob = await this.formatSymplusDate(user.date_of_birth);
    return {
      last_name: user.last_name,
      first_name: user.first_name,
      gender_cd: user.gender || null,
      marital_status_cd: user.marital_status || null,
      birth_date: dob,
      nationality_cd: 'NGA',
      mobile_phone_no: user.phone,
      primary_email_address: user.email,
      address_street: user.address,
      address_country_cd: 'NGA',
      address_city: user.city || 'Lagos',
      officer_id: '000037',
    };
  }

  async saveUserCBARecords(data: any): Promise<CbaInteraction> {
    let record = (await this.validateExisting({
      user_id: data.user_id,
    })) as CbaInteraction;

    if (!record) {
      record = await this.create(data);
      if (data.cba_account_type === CBAAccountTypes.BANKONE) {
        await this.storeUserNubanAccounts({
          user_id: data.user_id,
          user_account_ref: data.user_account_ref,
          nuban_account: data.nuban_account_number,
          nuban_source: NUBANSource.BANKONE,
        });
      }
    }
    return record;
  }

  async validateExisting(condition: any) {
    return this.findOne(condition);
  }

  async updateCBARecord(id: number, data: any): Promise<CbaInteraction> {
    return this.update(id, data);
  }

  async updateBankOneCBARecord(data: any) {
    const record = await this.saveUserCBARecords(data);
    if (!record.bankone_customer_id) {
      await this.updateCBARecord(record.id, data);
    }
  }

  async updateSymplusCBARecord(data: any) {
    const record = await this.saveUserCBARecords(data);
    if (!record.symplus_customer_id) {
      await this.updateCBARecord(record.id, {
        symplus_customer_id: data.symplus_customer_id,
      });
    }
  }

  async storeUserNubanAccounts(dto: CreateNubanAccountDto) {
    await this.nubanAccountsService.storeUserNuban(dto);
  }

  async validateUserNubanRecord(dto: CreateNubanAccountDto) {
    const existing = await this.checkUserNubanRecords(dto.user_id);
    if (!existing) {
      await this.storeUserNubanAccounts(dto);
    }
  }

  async checkUserNubanRecords(user_id: number) {
    return this.nubanAccountsService.fetchUserNubanDetails(user_id);
  }

  async formatSymplusDate(date: Date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
}

// async createCorporateSymplusAccount(
//   createSymplusCorporateCustomerDto: CreateSymplusCorporateCustomerDto,
// ) {
//   //
// }

// async createIndividualBankOneCustomer(
//   createBankOneCustomerDto: CreateBankOneCustomerDto,
// ) {
//   //
// }

// async createCorporateBankOneAccount(
//   createOrganizationCustomerDto: CreateOrganizationCustomerDto,
// ) {
//   //
// }

// async createBankOneCustomerQuick(
//   createBankOneAccountQuickDto: CreateBankOneAccountQuickDto,
// ) {
//   //
// }

// async createCBACustomerAccounts(user: UserAccount) {
//   const cba_record = await this.validateExistingUserCBARecord(user.id);
//   const user_nuban_records = await this.checkUserNubanRecords(user.id);

//   console.log('user nuban records', user_nuban_records);

//   if (!cba_record || !user_nuban_records) {
//     await this.createBankOneQuickAccount(user);
//     await this.createSymplusCustomerAccount(user);
//     //
//   } else if (cba_record && !cba_record.bankone_customer_id) {
//     const customer = await this.createBankOneQuickAccount(user);

//     // update the cba record to udate the bankone customer details
//     await this.updateBankOneCBARecord({
//       user_id: user.id,
//       user: { id: user.id },
//       bankone_customer_id: customer.CustomerID,
//       bankone_account_number: customer.BankoneAccountNumber,
//     });
//   } else if (cba_record.bankone_customer_id && !user_nuban_records) {
//     const customer = await this.createBankOneQuickAccount(user);

//     // can you also reattempt to create the nuban records here?
//     console.log('reattempting to create User Nuban Records');

//     await this.validateUserNubanRecord({
//       user_id: user.id,
//       user_account_ref: user.user_txn_ref,
//       nuban_account: customer[0].Accounts[0].AccountNumber,
//       nuban_source: NUBANSource.BANKONE,
//     });
//   } else if (cba_record && !cba_record.symplus_customer_id) {
//     console.log('to create symplus account');
//     const customer = await this.createSymplusCustomerAccount(user);

//     // update the cba record to udate the Symplus customer details
//     await this.updateSymplusCBARecord({
//       symplus_customer_id: customer.reference.CustomerID,
//       user_id: user.id,
//     });
//   } else {
//     console.log('Customer CBA Records Already Exist');
//   }
// }
