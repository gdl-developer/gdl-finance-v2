import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { SymplusApiRequestsService } from "./symplus-api-requests.service";
import { ApiTags } from "@nestjs/swagger";
import { FundAccountDto } from "./dto/fund-account.dto";
import { FundSubscriptionDto } from "./dto/fund-subscription.dto";
import { FundRedemptionDto } from "./dto/fund-redemption.dto";

@ApiTags("Symplus API Requests")
@Controller("symplus/api/requests")
export class SymplusApiRequestsController {
  constructor(
    private readonly symplusApiRequestsService: SymplusApiRequestsService
  ) {}

  @Get()
  async findAll() {
    const ress = await this.symplusApiRequestsService.findAll();
    return { data: ress };
  }

  @Get("get-funds")
  async getFunds() {
    const ress = await this.symplusApiRequestsService.getFunds();
    console.log(ress);
    return { data: ress };
  }

  @Get("get-countries")
  async getCountries() {
    const ress = await this.symplusApiRequestsService.getCountries();
    return { data: ress };
  }

  @Post("fund-account")
  async fundAccount(@Body() fundAccountDto: FundAccountDto) {
    const ress = await this.symplusApiRequestsService.fundAccount(
      fundAccountDto
    );
    return { data: ress };
  }

  @Post("fund-subscription")
  async fundSubscription(@Body() fundSubscriptionDto: FundSubscriptionDto) {
    const ress = await this.symplusApiRequestsService.fundSubscription(
      fundSubscriptionDto
    );
    return { data: ress };
  }

  @Get("get-fund-price")
  async getFundPrice() {
    const ress = await this.symplusApiRequestsService.getFundPrice();
    return { data: ress };
  }

  @Post("fund-redemption")
  async fundRedemption(@Body() fundRedemptionDto: FundRedemptionDto) {
    const ress = await this.symplusApiRequestsService.fundRedemption(
      fundRedemptionDto
    );
    return { data: ress };
  }

  @Get("get-fund-accounts/:customerId")
  async getFundAccounts(@Param("customerId") customerId: string) {
    const ress = await this.symplusApiRequestsService.getFundAccounts(
      customerId
    );
    return { data: ress };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const ress = await this.symplusApiRequestsService.findOne(id);
    return { data: ress };
  }

  @Post("cash-deposit")
  async doCashDeposit(@Body() dto: any) {
    return this.symplusApiRequestsService.doCashDeposit(dto);
  }
}
