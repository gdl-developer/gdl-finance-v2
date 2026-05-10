import {
  Injectable,
  Logger,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalApiCallsService } from '../../common/external-api-calls/external-api-calls.service';
import { EnvService } from '../../common/env.service';
import { UserAccount, GenderTypes } from '../user/entities/user.entity';
import { VirtualWallet } from './entities/virtual-wallet.entity';
import {
  CreateSymplusCustomerDto,
  SymplusCustomerResponseDto,
  DecryptedSymplusCustomerDto,
} from './dto/symplus-customer.dto';
import { encrypt, decrypt } from '../../common/utils/crypto-hash-helper';
import { InfowareService } from '../infoware-request/infoware-request.service';

@Injectable()
export class SymplusService {
  private readonly logger = new Logger(SymplusService.name);
  private readonly symplusBaseUrl: string;
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(UserAccount)
    private readonly userRepository: Repository<UserAccount>,
    @InjectRepository(VirtualWallet)
    private readonly virtualWalletRepository: Repository<VirtualWallet>,
    private readonly externalApiCallsService: ExternalApiCallsService,
    private readonly envService: EnvService,
    @Inject(forwardRef(() => InfowareService))
    private readonly infowareService: InfowareService,
  ) {
    const envData = this.envService.read();
    this.symplusBaseUrl = envData.SYMPLUS_SERVICE_BASE_URL;
    this.encryptionKey = envData.EKY;
    this.logger.log(
      `Initialized SymplusService with base URL: ${this.symplusBaseUrl}`,
    );
  }

  async createSymplusCustomer(
    userId: number,
    virtualWalletId: number,
    wallet: any,
    fetchUserNuban: any,
  ): Promise<DecryptedSymplusCustomerDto> {
    this.logger.log(
      `Creating Symplus customer for user ID: ${userId}, wallet ID: ${virtualWalletId}`,
    );

    try {
      // Step 1: Get user information
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new InternalServerErrorException('User not found');
      }

      const customerPayload = this.createSymplusPayload(
        user,
        fetchUserNuban,
        wallet,
      );
      console.log(
        `Created Symplus payload:`,
        JSON.stringify(customerPayload, null, 2),
      );

      // ------------------------------------------------------------------
      // EXPLICIT UPSTREAM CHECK: Check if user exists before creation
      // ------------------------------------------------------------------
      try {
        const emailCheckUrl = `${this.symplusBaseUrl}/customer/email/${user.email}`;
        console.log(`Checking existence via email: ${emailCheckUrl}`);
        const emailResponse = await this.externalApiCallsService.getData(
          emailCheckUrl,
        );
        console.log('emailResponse', emailResponse);
        if (
          emailResponse &&
          !emailResponse.error &&
          emailResponse.data &&
          emailResponse.data.reference &&
          emailResponse.data.reference.CustomerID
        ) {
          const existingId = emailResponse.data.reference.CustomerID;
          console.log(`User already exists on Symplus. ID: ${existingId}`);

          // Encrypt and store existing CustomerID
          // Note: Logic assumes the ID returned is raw and needs encryption if we are treating it as such,
          // or if the service expects us to just store it.
          // Similar to creation flow, we update the wallet.

          await this.updateVirtualWalletWithSymplusData(
            virtualWalletId,
            existingId,
            '00', // Mock success code
            'User already exists, linked successfully',
          );

          return {
            customer_id: existingId,
            status_code: '00',
            remarks: 'User already exists',
            created_at: new Date(),
          };
        }
      } catch (checkError) {
        console.warn(
          `Upstream existence check failed, proceeding to creation: ${checkError.message}`,
        );
        // Proceed to creation
      }

      const apiUrl = `${this.symplusBaseUrl}/customer/new/individual/account`;
      console.log(`Sending request to Symplus API: ${apiUrl}`);

      const response = await this.externalApiCallsService.postData(
        apiUrl,
        customerPayload,
      );
      console.log('response from Symplus API:', response);
      const validatedResponse = this.validateSymplusResponse(response);

      // Step 5: Encrypt and store CustomerID
      const encryptedCustomerId = validatedResponse.data.reference.CustomerID;
      console.log(
        `Encrypted CustomerID for secure storage`,
        validatedResponse.data,
      );
      console.log(`Encrypted CustomerID for secure storage`, validatedResponse);

      // Step 6: Update virtual wallet with Symplus data
      // Step 6: Update virtual wallet with Symplus data
      await this.updateVirtualWalletWithSymplusData(
        virtualWalletId,
        encryptedCustomerId,
        validatedResponse.data.code,
        validatedResponse.data.remarks,
      );

      this.logger.log(
        `Successfully created Symplus customer and updated wallet for user ID: ${userId}`,
      );

      return {
        customer_id: validatedResponse?.data?.reference?.CustomerID,
        status_code: validatedResponse?.data?.code,
        remarks: validatedResponse?.data?.remarks,
        created_at: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Symplus customer for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to create Symplus customer: ${error.message}`,
      );
    }
  }

  async createInfowareCustomer(
    userId: number,
    virtualWalletId: number,
    wallet: any,
    fetchUserNuban: any,
  ): Promise<any> {
    this.logger.log(
      `Creating Symplus customer for user ID: ${userId}, wallet ID: ${virtualWalletId}`,
    );

    try {
      // Step 1: Get user information
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new InternalServerErrorException('User not found');
      }

      this.logger.log(
        `Retrieved user data for Symplus customer creation: ${user.email}`,
      );

      const customerPayload = this.createInfowarePayload(
        user,
        fetchUserNuban,
        wallet,
      );
      console.log(
        `Created infoware payload:`,
        JSON.stringify(customerPayload, null, 2),
      );

      const response = await this.infowareService.createCustomer(
        customerPayload,
      );
      console.log(
        `Created infoware payload:`,
        JSON.stringify(response, null, 2),
      );

      const validatedResponse = this.validateInfowareResponse(response);

      // Step 5: Encrypt and store CustomerID
      this.logger.log(`Encrypted CustomerID for secure storage`);

      // Step 6: Update virtual wallet with Symplus data
      await this.updateVirtualWalletWithInfowareData(
        virtualWalletId,
        validatedResponse.OutValue,
      );

      this.logger.log(
        `Successfully created Symplus customer and updated wallet for user ID: ${userId}`,
      );

      return {
        customer_id: validatedResponse.OutValue,
        created_at: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Symplus customer for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to create Symplus customer: ${error.message}`,
      );
    }
  }

  async getDecryptedCustomerId(
    virtualWalletId: number,
  ): Promise<string | null> {
    this.logger.log(
      `Retrieving decrypted CustomerID for wallet ID: ${virtualWalletId}`,
    );

    try {
      const wallet = await this.virtualWalletRepository.findOne({
        where: { id: virtualWalletId },
        select: ['id', 'encrypted_symplus_customer_id'], // optimize query
      });

      if (!wallet) {
        this.logger.warn(`Wallet not found for ID ${virtualWalletId}`);
        return null;
      }

      console.log(`Fetched wallet data:`, wallet);

      if (
        !wallet.encrypted_symplus_customer_id ||
        wallet.encrypted_symplus_customer_id.trim() === ''
      ) {
        this.logger.warn(
          `No encrypted CustomerID found for wallet ID: ${virtualWalletId}`,
        );
        return null;
      }

      // 🧠 Decrypt
      const decryptedCustomerId = wallet.encrypted_symplus_customer_id;
      // Note: User requested to stop encrypting/decrypting this field (2026-01-30)

      console.log(`decryptedCustomerId (raw):`, decryptedCustomerId);

      if (!decryptedCustomerId || decryptedCustomerId.trim() === '') {
        this.logger.warn(
          `Decrypted CustomerID is empty for wallet ID: ${virtualWalletId}`,
        );
        return null;
      }

      this.logger.log(
        `Successfully retrieved CustomerID for wallet ID ${virtualWalletId}: ${decryptedCustomerId}`,
      );
      return decryptedCustomerId;
    } catch (error) {
      this.logger.error(
        `Unexpected error decrypting CustomerID for wallet ID: ${virtualWalletId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error decrypting Symplus CustomerID',
      );
    }
  }

  private createSymplusPayload(
    user: UserAccount,
    fetchUserNuban: any,
    wallet: any,
  ): any {
    this.logger.log(`Creating Symplus payload for user: ${user.email}`);

    // Map gender
    let genderCode = 'M';
    if (user.gender === GenderTypes.FEMALE) genderCode = 'F';
    else if (user.gender === GenderTypes.OTHER) genderCode = 'O';

    // Date of Birth
    const birthDate = user.date_of_birth
      ? user.date_of_birth.toISOString().split('T')[0]
      : '1990-01-01';

    // Wedding Anniversary
    const weddingAnniversary = user.wedding_anniversary_date
      ? user.wedding_anniversary_date.toISOString().split('T')[0]
      : undefined;

    // Format phone numbers
    let phoneNumber = user.phone;
    if (phoneNumber && !phoneNumber.startsWith('+')) {
      phoneNumber = '+234' + phoneNumber.replace(/^0/, '');
    }

    let altPhone = user.alternate_phone_no;
    if (altPhone && !altPhone.startsWith('+')) {
      altPhone = '+234' + altPhone.replace(/^0/, '');
    }

    // Country
    const countryCode = 'NGA';

    const payload: any = {
      // Required core identity
      last_name: user.last_name || 'Unknown',
      first_name: user.first_name || 'Unknown',
      gender_cd: genderCode,
      marital_status_cd: user.marital_status || 'SINGLE',
      birth_date: birthDate,
      nationality_cd: countryCode,
      mobile_phone_no: phoneNumber || '+2348000000000',
      primary_email_address: user.email,
      address_street: user.address || 'Unknown Address',
      address_city: user.city || 'Lagos',
      address_country_cd: countryCode,

      // Optional – only include if present
      ...(user.other_names && { other_names: user.other_names }),
      ...(user.mother_maiden_name && {
        mother_maiden_name: user.mother_maiden_name,
      }),
      ...(weddingAnniversary && {
        wedding_anniversary_date: weddingAnniversary,
      }),
      ...(altPhone && { alternate_phone_no: altPhone }),
      ...(user.alternate_email_address && {
        alternate_email_address: user.alternate_email_address,
      }),
      ...(user.state && { address_state_cd: 'LAG' }),
      ...(user.zip_code && { address_zip_code: user.zip_code }),
      ...(user.occupation && { occupation: user.occupation }),

      // Bank Details
      // ...(fetchUserNuban?.nuban_source && { bank_cd: fetchUserNuban.nuban_source }),
      // bank_account_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      // ...(fetchUserNuban?.nuban_account && { bank_account_no: fetchUserNuban.nuban_account }),
      // bank_branch_name: 'MAIN',
      // bank_address_details: user.address || 'Unknown Address',
      ...(wallet?.bvn && { bank_bvn_no: wallet.bvn }),

      // Next of Kin
      ...(user.next_of_kin_name && {
        next_of_kin_last_name: user.next_of_kin_name,
      }),
      ...(user.next_of_kin_phone_no && {
        next_of_kin_telephone: user.next_of_kin_phone_no,
      }),
      ...(user.next_of_kin_email && {
        next_of_kin_email_address: user.next_of_kin_email,
      }),
      ...(user.address && { next_of_kin_address_street: user.address }),
      ...(user.city && { next_of_kin_address_city: user.city }),
      ...(countryCode && { next_of_kin_address_country_cd: countryCode }),

      // References
      ...(wallet?.wallet_ref && { external_reference1: wallet.wallet_ref }),
      ...(user.user_txn_ref && { external_reference2: user.user_txn_ref }),
    };

    return payload;
  }

  private createInfowarePayload(
    user: UserAccount,
    fetchUserNuban: any,
    wallet: any,
  ): any {
    this.logger.log(`Creating Infoware payload for user: ${user.email}`);

    // --- Gender Mapping ---
    let gender = 'M';
    if (user.gender === GenderTypes.FEMALE) gender = 'F';
    else if (user.gender === GenderTypes.OTHER) gender = 'O';

    // --- Title ---
    const title = 'MR';

    // --- Date of Birth ---
    const dateOfBirth = user.date_of_birth
      ? user.date_of_birth.toISOString().split('T')[0]
      : '1990-01-01';

    // --- Phone Normalization ---
    let phoneNumber = user.phone;
    if (phoneNumber && !phoneNumber.startsWith('+')) {
      phoneNumber = '+234' + phoneNumber.replace(/^0/, '');
    }

    // --- Alternate Phone ---
    let altPhone = user.alternate_phone_no;
    if (altPhone && !altPhone.startsWith('+')) {
      altPhone = '+234' + altPhone.replace(/^0/, '');
    }

    // --- Default Country ---
    const country = user.country || 'Nigeria';
    const nationality = user.country;

    // --- Bank Info ---
    const bankCode = fetchUserNuban?.nuban_source || wallet?.bankCode || '057';
    const bankAcctNumber =
      fetchUserNuban?.nuban_account || wallet?.accountNumber || '0000000000';
    const bankAcctName = `${user.first_name || ''} ${user.other_names || ''} ${
      user.last_name || ''
    }`.trim();

    // --- Construct Payload ---
    const payload: any = {
      AccountType: 'IND',
      Title: title,
      lastName: user.last_name || 'Unknown',
      firstName: user.first_name || 'Unknown',
      ...(user.other_names && { Othernames: user.other_names }),
      Sex: gender === 'M' ? 1 : 0,
      DateOfBirth: dateOfBirth,
      PermanentAddress: user.address || 'Unknown Address',
      Nationality: nationality,
      phone: phoneNumber || '+2348000000000',
      email: user.email,
      BankAcctNumber: bankAcctNumber,
      BankCode: bankCode,
      NextOfKin: user.next_of_kin_name || 'Not Provided',
      BankAcctName: bankAcctName || 'Unknown Account Name',
      City: user.city || 'Lagos',
      State: user.state || 'Lagos',
      Country: country,
      BranchCode: '001',

      // --- Optional or Conditional Fields ---
      ...(altPhone && { AlternatePhone: altPhone }),
      ...(user.zip_code && { PostalCode: user.zip_code }),
      ...(user.occupation && { Occupation: user.occupation }),
    };

    return payload;
  }

  private validateSymplusResponse(response: any): SymplusCustomerResponseDto {
    if (!response) {
      throw new InternalServerErrorException(
        'Invalid response from Symplus service',
      );
    }

    // Check for error response
    if (response.error || response.statusCode >= 400) {
      this.logger.error(
        `Symplus API returned error:`,
        JSON.stringify(response, null, 2),
      );
      throw new InternalServerErrorException(
        response.message ||
          response.error ||
          'Symplus customer creation failed',
      );
    }

    // Validate successful response structure
    if (
      !response.data ||
      !response.data.reference ||
      !response.data.reference.CustomerID
    ) {
      this.logger.error(
        `Invalid Symplus response structure:`,
        JSON.stringify(response, null, 2),
      );
      throw new InternalServerErrorException(
        'Invalid response structure from Symplus service',
      );
    }

    this.logger.log('Symplus response validation successful');
    return response as SymplusCustomerResponseDto;
  }

  private validateInfowareResponse(response: any): any {
    if (!response) {
      throw new InternalServerErrorException(
        'Invalid response from Symplus service',
      );
    }

    // Check for error response
    if (response.error || response.statusCode >= 400) {
      this.logger.error(
        `Symplus API returned error:`,
        JSON.stringify(response, null, 2),
      );
      throw new InternalServerErrorException(
        response.message ||
          response.error ||
          'Symplus customer creation failed',
      );
    }

    // Validate successful response structure
    if (!response.data || !response.data.OutValue || !response.data.OutValue) {
      this.logger.error(
        `Invalid Symplus response structure:`,
        JSON.stringify(response, null, 2),
      );
      throw new InternalServerErrorException('An Eerror Occurred');
    }

    this.logger.log('Symplus response validation successful');
    return response.data;
  }

  private async updateVirtualWalletWithSymplusData(
    virtualWalletId: number,
    encryptedCustomerId: string,
    statusCode: string,
    remarks: string,
  ): Promise<void> {
    this.logger.log(
      `Updating virtual wallet ${virtualWalletId} with Symplus data`,
    );

    try {
      await this.virtualWalletRepository.update(virtualWalletId, {
        encrypted_symplus_customer_id: encryptedCustomerId,
        symplus_status_code: statusCode,
        symplus_remarks: remarks,
        symplus_created_at: new Date(),
      });

      this.logger.log(
        `Successfully updated virtual wallet ${virtualWalletId} with Symplus data`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update virtual wallet ${virtualWalletId} with Symplus data`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to update wallet with Symplus data',
      );
    }
  }

  private async updateVirtualWalletWithInfowareData(
    virtualWalletId: number,
    customerId: string,
  ): Promise<void> {
    this.logger.log(
      `Updating virtual wallet ${virtualWalletId} with Symplus data`,
    );

    try {
      await this.virtualWalletRepository.update(virtualWalletId, {
        encrypted_infoware_customer_id: customerId,
      });

      this.logger.log(
        `Successfully updated virtual wallet ${virtualWalletId} with Symplus data`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update virtual wallet ${virtualWalletId} with Symplus data`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to update wallet with Symplus data',
      );
    }
  }
}
