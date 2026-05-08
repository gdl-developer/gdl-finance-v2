import { Injectable, NotImplementedException } from '@nestjs/common';
import { ExternalApiCallsService } from 'src/common/external-api-calls/external-api-calls.service';
import { CreateFixedDepositDto } from './dto/create-fixed-deposit.dto';
import { TopUpFixedDepositDto } from './dto/top-up-fixed-deposit.dto';
import { GetFixedDepositAccountByLiquidationAccountDto } from './dto/get-fixed-deposit-by-liquidation-account.dto';
import { EnvService } from 'src/common/env.service';

@Injectable()
export class FixedDepositService {
  private readonly BANKONE_SERVICE_BASE_URL: string;

  constructor(
    private readonly externalApiCallsService: ExternalApiCallsService,
    private readonly envService: EnvService,
  ) {
    this.BANKONE_SERVICE_BASE_URL =
      this.envService.read().BANKONE_SERVICE_BASE_URL;
  }

  async getFixedDepositByPhoneNumber(phone: string): Promise<any> {
    const url = `${this.BANKONE_SERVICE_BASE_URL}/fixed-deposits/get/by/phone/number?phoneNumber=${phone}`;
    try {
      const response = await this.externalApiCallsService.getData(url);
      return response;
    } catch (error) {
      throw new NotImplementedException(
        `Error retrieving fixed deposit by phone: ${error.message}`,
      );
    }
  }

  async findAll(): Promise<any> {
    const url = `${this.BANKONE_SERVICE_BASE_URL}/fixed-deposits`;
    try {
      const response = await this.externalApiCallsService.getData(url);
      return response;
    } catch (error) {
      throw new NotImplementedException(
        `Error retrieving all fixed deposits: ${error.message}`,
      );
    }
  }

  async findOne(id: string): Promise<any> {
    const url = `${this.BANKONE_SERVICE_BASE_URL}/fixed-deposits/${id}`;
    try {
      const response = await this.externalApiCallsService.getData(url);
      return response;
    } catch (error) {
      throw new NotImplementedException(
        `Error retrieving fixed deposit by ID: ${error.message}`,
      );
    }
  }

  async createFixedDeposit(
    createFixedDepositDto: CreateFixedDepositDto,
  ): Promise<any> {
    const url = `${this.BANKONE_SERVICE_BASE_URL}/fixed-deposits/create`;
    try {
      const response = await this.externalApiCallsService.postData(
        url,
        createFixedDepositDto,
      );
      return response;
    } catch (error) {
      throw new NotImplementedException(
        `Error creating fixed deposit: ${error.message}`,
      );
    }
  }

  async getFixedDepositByLiquidationAccount(
    getDto: GetFixedDepositAccountByLiquidationAccountDto,
  ): Promise<any> {
    const url = `${this.BANKONE_SERVICE_BASE_URL}/fixed-deposits/get/by/liquidation/account?accountNumber=${getDto.accountNumber}`;
    try {
      const response = await this.externalApiCallsService.getData(url);
      return response;
    } catch (error) {
      throw new NotImplementedException(
        `Error retrieving fixed deposit by liquidation account: ${error.message}`,
      );
    }
  }

  async topUpFixedDeposit(
    topUpFixedDepositDto: TopUpFixedDepositDto,
  ): Promise<any> {
    const url = `${this.BANKONE_SERVICE_BASE_URL}/fixed-deposits/top-up`;
    try {
      const response = await this.externalApiCallsService.postData(
        url,
        topUpFixedDepositDto,
      );
      return response;
    } catch (error) {
      throw new NotImplementedException(
        `Error topping up fixed deposit: ${error.message}`,
      );
    }
  }
}
