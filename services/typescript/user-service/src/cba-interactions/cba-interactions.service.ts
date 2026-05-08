import {
  Injectable,
  NotAcceptableException,
  NotImplementedException,
} from '@nestjs/common';
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
// import { UpdateBankOneCustomerDto } from './dto/update-bankone-customer.dto';
// import { CreateSymplusCorporateCustomerDto } from './dto/create-symplus-corporate-account.dto';
// import { CreateOrganizationCustomerDto } from './dto/create-bankone-organization-customer.dto';
// import { CreateBankOneCustomerDto } from './dto/create-bankone-customer.dto';

import * as dotenv from 'dotenv';
import { WalletsService } from 'src/sidecars/wallets/wallets.service';
dotenv.config();

const BANKONE_SERVICE_BASE_URL = process.env.BANKONE_SERVICE_BASE_URL;
const SYMPLUS_SERVICE_BASE_URL = process.env.SYMPLUS_SERVICE_BASE_URL;

@Injectable()
export class CbaInteractionsService extends AbstractService {
  constructor(
    @InjectRepository(CbaInteraction)
    private readonly cbaInteractionsRepo: Repository<CbaInteraction>,
    private readonly externalApiCallsService: ExternalApiCallsService,
    private readonly nubanAccountsService: NubanAccountsService,
    private readonly walletsService: WalletsService,
  ) {
    super(cbaInteractionsRepo);
  }

  async createCBACustomerAccounts(user: UserAccount) {
    try {
      const bvn_status = await this.walletsService.validateBVNStatus({
        user_id: user.id,
        wallet_ref: user.user_txn_ref,
      });

      if (bvn_status) {
        console.log(
          `BVN verified for user ${user.id}. Proceeding with CBA account checks.`,
        );
        // check user bvn here -- add a wallet side car
        const cbaRecord = await this.validateExistingUserCBARecord(user.id);
        const userNubanRecords = await this.checkUserNubanRecords(user.id);

        console.log('cbaRecord', cbaRecord);
        console.log('userNubanRecords', userNubanRecords);

        if (!cbaRecord && !userNubanRecords) {
          console.log('to createAllAccounts()');
          await this.createAllAccounts(user);
        } else if (cbaRecord && !cbaRecord.bankone_customer_id) {
          console.log('to call updateBankOneCustomerDetails');
          await this.updateBankOneCustomerDetails(user);
        } else if (cbaRecord.bankone_customer_id && !userNubanRecords) {
          console.log('to call reattemptCreateUserNubanRecords');
          await this.reattemptCreateUserNubanRecords(user);
        } else if (cbaRecord && !cbaRecord.symplus_customer_id) {
          console.log('to call updateSymplusCustomerDetails');
          // await this.updateSymplusCustomerDetails(user);
        } else {
          console.log('Customer CBA Records Already Exist');
        }
      } else {
        console.log(
          `User BVN for user ${user.id} not yet validated/supplied - No CBA actions taken`,
        );
      }
    } catch (error) {
      console.error('Error creating CBA customer accounts:', error);
    }
  }

  // Helper function to create all accounts when no records exist
  async createAllAccounts(user: UserAccount) {
    const customer = await this.createBankOneQuickAccount(user);
    console.log('customer', customer);
    // await this.createSymplusCustomerAccount(user);
  }

  // Helper function to update BankOne customer details
  async updateBankOneCustomerDetails(user: UserAccount) {
    const customer = await this.createBankOneQuickAccount(user);

    await this.updateBankOneCBARecord({
      user_id: user.id,
      user: { id: user.id },
      bankone_customer_id: customer.CustomerID,
      bankone_account_number: customer.BankoneAccountNumber,
    });
  }

  // Helper function to reattempt creating user NUBAN records
  async reattemptCreateUserNubanRecords(user: UserAccount) {
    const customer = await this.createBankOneQuickAccount(user);

    console.log('Reattempting to create User NUBAN Records');
    await this.validateUserNubanRecord({
      user_id: user.id,
      user_account_ref: user.user_txn_ref,
      nuban_account: customer[0].Accounts[0].AccountNumber,
      nuban_source: NUBANSource.BANKONE,
    });
  }

  // Helper function to update Symplus customer details
  async updateSymplusCustomerDetails(user: UserAccount) {
    console.log('Creating Symplus account');

    const customer = await this.createSymplusCustomerAccount(user);

    await this.updateSymplusCBARecord({
      symplus_customer_id: customer.reference.CustomerID,
      user_id: user.id,
    });
  }

  async validateExistingUserCBARecord(
    user_id: number,
  ): Promise<CbaInteraction> {
    const cba_record = await this.validateExisting({
      user_id: user_id,
    });

    return cba_record;
  }

  async createSymplusCustomerAccount(user: UserAccount) {
    let customer: any;

    const create_symplus_customer_data =
      await this.prepareCreateSymplusCustomerAccountData(user);

    customer = await this.getSymplusCustomerByEmail(
      create_symplus_customer_data.primary_email_address,
    );

    // TO DO: - Make adjustments for those who already have accounts on BankOne and Symplus. I.e. Migrating old customers to the app
    if (customer.length < 1) {
      const new_customer = await this.createIndividualSymplusAccount(
        create_symplus_customer_data,
      );

      if (new_customer.reference.CustomerID) {
        // update CBA - integrations DB with Symplus Customer ID
        await this.updateSymplusCBARecord({
          symplus_customer_id: new_customer.reference.CustomerID,
          user_id: user.id,
        });
      } else {
        console.log('Symplus Account Creation Failed');
      }

      customer = new_customer;
    } else {
      console.log('Symplus Customer Already Exist');
    }

    return customer;
  }

  async createBankOneQuickAccount(user: UserAccount) {
    try {
      let customer = await this.getBankOneCustomerByPhoneNumber(user.phone);

      console.log('Existing BankOne customer:', customer);

      // If customer lookup was unsuccessful
      if (customer.IsSuccessful == false) {
        console.log('No BankOne customer found, creating a new customer.');

        const createData = await this.prepareCreateBankOneQuickAcctData(user);
        const newCustomer = await this.createIndBankOneQuickAccount(createData);

        console.log('New BankOne customer creation result:', newCustomer);

        if (newCustomer.IsSuccessful) {
          const updatedCustomer = await this.updateBankOneCBARecord({
            user_id: user.id,
            user: { id: user.id },
            bankone_customer_id: newCustomer.Message.CustomerID,
            bankone_account_number: newCustomer.Message.BankoneAccountNumber,
          });
          console.log('updatedCustomer', updatedCustomer);

          customer = newCustomer;
        } else {
          console.log('BankOne account creation failed.');
          throw new Error('Failed to create BankOne account.');
        }
      } else {
        console.log('BankOne customer found, checking NUBAN records.');

        await this.processExistingCustomer(user, customer);
      }

      return customer;
    } catch (error) {
      console.error('Error creating BankOne quick account:', error.message);
      throw new Error('BankOne quick account creation process failed.');
    }
  }

  // Separate function to handle existing customer logic
  private async processExistingCustomer(user: UserAccount, customer: any) {
    const customerId = customer.CustomerID || customer.customerID;
    // Case where CustomerID is present
    if (customerId) {
      console.log('proccesing account for when customer.CustomerID');
      await this.handleNubanValidation(
        user,
        customer,
        customer.FullName,
        customer.Email,
      );
    }

    console.log('customer here', customer);

    // Case where customer is in an array format
    if (
      Array.isArray(customer) &&
      customer.length > 0 &&
      (customer[0].customerID || customer[0].CustomerID)
    ) {
      console.log('Handling NUBAN for customer in array format');
      const customerDetails = customer[0];
      await this.handleNubanValidation(
        user,
        customerDetails,
        customerDetails.LastName,
        customerDetails.Email,
      );
    }
  }

  // Handles NUBAN validation logic
  private async handleNubanValidation(
    user: UserAccount,
    customer: any,
    customerName: string,
    customerEmail: string,
  ) {
    const userFullName = `${user.last_name} ${user.first_name}`;
    console.log('handleNubanValidation');

    // If name and email match, proceed with validation
    if (
      customerName === userFullName ||
      customerEmail.toLowerCase() === user.email.toLowerCase()
    ) {
      console.log(
        'matched customerName == userFullName || customerEmail == user.email',
      );

      await this.validateUserNubanRecord({
        user_id: user.id,
        user_account_ref: user.user_txn_ref,
        nuban_account: customer.Accounts[0].AccountNumber,
        nuban_source: NUBANSource.BANKONE,
      });
    } else {
      throw new NotAcceptableException(
        'Nuban account with this phone number already exists but belongs to a different user.',
      );
    }
  }

  async getSymplusCustomerByEmail(user_email: string) {
    const url_path = `customer/email/${user_email}`;

    const customer = await this.symplusServiceGetCall(url_path);
    return customer.GetCustomerByEmail;
  }

  async createIndividualSymplusAccount(
    createSymplusIndividualCustomerDto: CreateSymplusIndividualCustomerDto,
  ) {
    const url_path = `customer/new/individual/account`;

    try {
      const customer = await this.symplusServicePostCall(
        createSymplusIndividualCustomerDto,
        url_path,
      );

      if (!customer) {
        console.log('createIndividualSymplusAccount Failed. An Error Occured');
      }

      return customer;
    } catch (error) {
      console.log(
        'createIndividualSymplusAccount Failed. An Error Occured',
        error,
      );
    }
  }

  async createIndBankOneQuickAccount(
    createBankOneAccountQuickDto: CreateBankOneAccountQuickDto,
  ) {
    const url_path = `accounts/create/quick/account`;

    const customer = await this.bankOneServicePostCall(
      createBankOneAccountQuickDto,
      url_path,
    );

    if (!customer) {
      throw new NotImplementedException(
        'CreateBankOneAccountQuick Failed. An Error Occured',
      );
    }

    return customer;
  }

  async createIndBankOneCustomerNAccount(
    createBankOneCustomerNAccountDto: CreateBankOneCustomerNAccountDto,
  ) {
    const url_path = `accounts/create/customer/n/account`;

    const customer = await this.bankOneServicePostCall(
      createBankOneCustomerNAccountDto,
      url_path,
    );

    if (!customer) {
      throw new NotImplementedException(
        'createIndBankOneCustomerNAccount Failed. An Error Occured',
      );
    }

    return customer;
  }

  // async updateBankOneCustomer(
  //   updateBankOneustomerDto: UpdateBankOneCustomerDto,
  // ) {
  //   const url_path = `accounts/create/customer/n/account`;

  //   const customer = await this.bankOneServicePostCall(
  //     {
  //       ...updateBankOneustomerDto,
  //       AccountOfficerCode: 'GD0691', // from Bankone GetAccountOfficer api for officer "GDL",
  //     },
  //     url_path,
  //   );

  //   if (!customer) {
  //     throw new NotImplementedException(
  //       'createIndBankOneCustomerNAccount Failed. An Error Occured',
  //     );
  //   }

  //   return customer;
  // }

  async getBankOneCustomerByPhoneNumber(phone_number: string) {
    const url_path = `customer/by/phone/number?phoneNumber=${phone_number}`;

    const customer = await this.bankOneServiceGetCall(url_path);
    return customer;
  }

  async symplusServicePostCall(data: any, url_path: string): Promise<any> {
    const call_ress = await this.postData(
      `${SYMPLUS_SERVICE_BASE_URL}/${url_path}`,
      data,
    );

    if (!call_ress)
      throw new NotImplementedException(
        'An Error Occured in symplusServicePostCall',
      );

    return call_ress.data;
  }

  async symplusServiceGetCall(url_path: string): Promise<any> {
    const fetch_res = await this.fetchData(
      `${SYMPLUS_SERVICE_BASE_URL}/${url_path}`,
    );

    if (!fetch_res)
      throw new NotImplementedException(
        'An Error Occured in symplusServiceGetCall',
      );

    return fetch_res.data;
  }

  async bankOneServicePostCall(data: any, url_path: string): Promise<any> {
    const call_ress = await this.postData(
      `${BANKONE_SERVICE_BASE_URL}/${url_path}`,
      data,
    );

    if (!call_ress)
      throw new NotImplementedException(
        'An Error Occured in bankOneServicePostCall',
      );

    return call_ress.data;
  }

  async bankOneServiceGetCall(url_path: string): Promise<any> {
    const fetch_res = await this.fetchData(
      `${BANKONE_SERVICE_BASE_URL}/${url_path}`,
    );

    if (!fetch_res)
      throw new NotImplementedException(
        'An Error Occured in bankOneServiceGetCall',
      );

    return fetch_res.data;
  }

  async postData(url: string, data: any) {
    const post_res = await this.externalApiCallsService.postData(url, data);

    return post_res;
  }

  async fetchData(url: string) {
    const fetch_res = await this.externalApiCallsService.getData(url);

    return fetch_res;
  }

  async genBankOneTransactionTrackingRef(
    user_txn_ref: string,
  ): Promise<string> {
    return `${user_txn_ref}_${Math.floor(Math.random() * 100233 + 100881)}`;
  }

  async prepareCreateBankOneCustomerNAccountData(user: UserAccount) {
    return {
      TransactionTrackingRef: user.user_txn_ref, //user_trans_tracking_ref,
      AccountOpeningTrackingRef: user.user_txn_ref,
      ProductCode: '202', // CURRENT ACCOUNT INDIVIDUAL,
      LastName: user.last_name,
      OtherNames: user.other_names,
      // BVN: `000`, // from user wallet,
      PhoneNo: user.phone,
      Gender: user.gender,
      PlaceOfBirth: user.place_of_birth,
      DateOfBirth: user.date_of_birth,
      Address: user.address,
      NationalIdentityNo: user.nin,
      HasSufficientInfoOnAccountInfo: true,
      NextOfKinPhoneNo: user.next_of_kin_phone_no,
      NextOfKinName: user.next_of_kin_name,
      ReferralPhoneNo: user.user_referree_phone_number,
      ReferralName: user.user_referree_name,
      AccountOfficerCode: 'GD0691', // from Bankone GetAccountOfficer api
      Email: user.email,
      CustomerImage: '',
      CustomerSignature: '',
      IdentificationImage: '',
      NotificationPreference: `3`,
      TransactionPermission: '0',
      AccountTier: 1,
      AccountInformationSource: 0,
      OtherAccountInformationSource: 'app',
    };
  }

  async prepareCreateBankOneQuickAcctData(user: UserAccount) {
    let gender;
    user.gender == GenderTypes.MALE ? (gender = 0) : (gender = 1);

    return {
      TransactionTrackingRef: user.user_txn_ref,
      AccountOpeningTrackingRef: user.user_txn_ref,
      ProductCode: '202', // CURRENT ACCOUNT INDIVIDUAL,
      LastName: user.last_name,
      OtherNames: `${user.first_name}`,
      PhoneNo: user.phone,
      Gender: gender,
      PlaceOfBirth: user.place_of_birth,
      DateOfBirth: user.date_of_birth,
      Address: user.address,
      AccountOfficerCode: 'GD0691', // from Bankone GetAccountOfficer api for officer "GDL",
      Email: user.email,
      NotificationPreference: 3,
      TransactionPermission: '0',
      AccountTier: `1`,
    };
  }

  async prepareCreateSymplusCustomerAccountData(user: UserAccount) {
    let country = '';
    if (user.country == 'NG') {
      country = 'NGA';
    } else {
      country = 'NGA';
    }

    const date_of_birth = await this.formatSymplusDate(user.date_of_birth);

    return {
      last_name: user.last_name,
      first_name: user.first_name,
      gender_cd: user.gender || null,
      marital_status_cd: user.marital_status || null,
      birth_date: date_of_birth,
      nationality_cd: 'NGA',
      mobile_phone_no: user.phone,
      primary_email_address: user.email,
      address_street: user.address,
      address_country_cd: country,
      address_city: user.city || 'Lagos',
      officer_id: '000037',
    };
  }

  async saveUserCBARecords(data: any): Promise<CbaInteraction> {
    let cba_records: CbaInteraction = await this.validateExisting({
      user_id: data.user_id,
    });

    if (!cba_records) {
      const new_records: CbaInteraction = await this.create(data);
      if (!new_records) {
        throw new NotImplementedException('New CBA Record Creation Failed');
      }

      console.log('data.cba_account_type', data.cba_account_type);

      if (data.cba_account_type == CBAAccountTypes.BANKONE) {
        // create nuban account here for a user on the sidecar nuban_account db
        await this.storeUserNubanAccounts({
          user_id: data.user_id,
          user_account_ref: data.user_account_ref,
          nuban_account: data.nuban_account_number,
          nuban_source: NUBANSource.BANKONE,
        });
      }

      cba_records = new_records;
      console.log('CBA Record Created Successfully');
    }

    return cba_records;
  }

  async validateExisting(condition: any) {
    const existing = await this.findOne(condition);

    if (existing) {
      console.log('User CBA Records Already Saved');
      return existing;
    } else if (!existing) {
      return false;
    }
  }

  async updateCBARecord(
    id: number,
    data_to_update: any,
  ): Promise<CbaInteraction> {
    console.log('id', id);
    console.log('data_to_update', data_to_update);

    const updated = await this.update(id, data_to_update);

    return updated;
  }

  async updateBankOneCBARecord(data: any) {
    const cba_record = await this.saveUserCBARecords(data);

    if (!cba_record.bankone_customer_id) {
      console.log('No BankOne CBA Record Found. Updating Record');
      const record = await this.updateCBARecord(cba_record.id, data);

      if (record) {
        console.log('BankOne CBA Record Updated Successfully');
      }
    }
  }

  async updateSymplusCBARecord(data: any) {
    const cba_record = await this.saveUserCBARecords(data);

    console.log('cba_record', cba_record);

    if (!cba_record.symplus_customer_id) {
      console.log('No Symplus CBA Record Found. Updating Record');
      const record = await this.updateCBARecord(cba_record.id, {
        symplus_customer_id: data.symplus_customer_id,
      });

      if (record) {
        console.log('Symplus CBA Record Updated Successfully');
      }
    }
  }

  async storeUserNubanAccounts(createNubanAccountDto: CreateNubanAccountDto) {
    const account = await this.nubanAccountsService.storeUserNuban(
      createNubanAccountDto,
    );

    if (account) {
      console.log('User Nuban Account Successfully Saved');
    }
  }

  async validateUserNubanRecord(createNubanAccountDto: CreateNubanAccountDto) {
    const { user_id } = createNubanAccountDto;

    const user_nuban = await this.checkUserNubanRecords(user_id);

    if (!user_nuban) {
      console.log('Recreating User Nuban Record');
      await this.storeUserNubanAccounts(createNubanAccountDto);
    } else if (user_nuban) {
      console.log('Bankone Customer and Nuban Records Already Exist');
    }
  }

  async checkUserNubanRecords(user_id: number) {
    const user_nuban =
      await this.nubanAccountsService.fetchUserNubanDetails(user_id);

    return user_nuban;
  }

  async formatSymplusDate(date_of_birth: Date) {
    const user_date_of_birth = new Date(`${date_of_birth}`);
    const year = user_date_of_birth.getFullYear();
    const month = ('0' + (user_date_of_birth.getMonth() + 1)).slice(-2);
    const day = ('0' + user_date_of_birth.getDate()).slice(-2);
    const formatted_date = `${year}-${month}-${day}`;

    return formatted_date;
  }

  // async createBankOneQuickAccount(user: UserAccount) {
  //   let customer: any;

  //   customer = await this.getBankOneCustomerByPhoneNumber(user.phone);
  //   console.log('existing bankone customer', customer);
  //   console.log('customer.IsSuccessful', customer.IsSuccessful);

  //   // just modified
  //   if (customer.IsSuccessful == false) {
  //     console.log('No Bankone Customer Exist');
  //     console.log('Creating new Bankone Customer');

  //     const create_bankone_quick = await this.prepareCreateBankOneQuickAcctData(
  //       user,
  //     );

  //     const new_customer = await this.createIndBankOneQuickAccount(
  //       create_bankone_quick,
  //     );

  //     console.log('new_customer created', new_customer);

  //     if (new_customer.IsSuccessful) {
  //       await this.updateBankOneCBARecord({
  //         user_id: user.id,
  //         user: { id: user.id },
  //         bankone_customer_id: new_customer.Message.CustomerID,
  //         bankone_account_number: new_customer.Message.BankoneAccountNumber,
  //       });
  //     } else {
  //       console.log(
  //         'Bankone Account Creation Not Done, No Specified Condition Match.',
  //       );
  //     }

  //     customer = new_customer;
  //   } else if (customer.CustomerID && customer.CustomerID !== '') {
  //     // can you also reattempt to create the nuban records here?
  //     console.log('reattempt to create Nuban Records for customer:', customer);

  //     // check if the name of the user is the same with the name on the nuban,
  //     // else, its not the same user so shouldnt be assigned.
  //     if (
  //       customer.FullName == `${user.last_name} ${user.first_name}` ||
  //       customer.Email == user.email
  //     ) {
  //       await this.validateUserNubanRecord({
  //         user_id: user.id,
  //         user_account_ref: user.user_txn_ref,
  //         nuban_account: customer[0].Accounts[0].AccountNumber,
  //         nuban_source: NUBANSource.BANKONE,
  //       });
  //     } else {
  //       throw new NotAcceptableException(
  //         'Nuban Account with phone Number already exist',
  //       );
  //     }
  //   } else if (customer && customer.length > 0) {
  //     if (customer[0].CustomerID && customer[0].CustomerID !== '') {
  //       // can you also reattempt to create the nuban records here?
  //       console.log(
  //         'reattempt to create Nuban Records for customer[0]:',
  //         customer,
  //       );

  //       if (
  //         customer.LastName == user.last_name &&
  //         customer.Email == user.email
  //       ) {
  //         await this.validateUserNubanRecord({
  //           user_id: user.id,
  //           user_account_ref: user.user_txn_ref,
  //           nuban_account: customer[0].Accounts[0].AccountNumber,
  //           nuban_source: NUBANSource.BANKONE,
  //         });
  //       } else {
  //         throw new NotAcceptableException(
  //           'Nuban Account with phone Number already exist',
  //         );
  //       }
  //     }
  //   }

  //   return customer;
  // }

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
}
