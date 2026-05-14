import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { CustomerManagementService } from "./customer-management.service";
import { CreateCustomerDto } from "./dto/create-individual-customer.dto";
import { ApiTags } from "@nestjs/swagger";
import { CreateCorporateDto } from "./corporates/dto/create-corporate.dto";
import { CreateJointAccountDTO } from "./dto/create-joint-acct.dto";
import { RemoveIndividualEmploymentDto } from "./dto/remove-individual-employment.dto";
import { UpdateCustomerAddressDTO } from "./dto/update-customer-address.dto";
import { UpdateCustomerEmailDTO } from "./dto/update-customer-email.dto";
import { UpdateCustomerEmploymentDTO } from "./dto/update-customer-employment.dto";
import { UpdateCustomerIDDTO } from "./dto/update-customer-identity.dto";

@ApiTags("Customer Management")
@Controller("customer")
export class CustomerManagementController {
  constructor(
    private readonly customerManagementService: CustomerManagementService
  ) {}

  @Get("one/:customerid")
  async getCustomerByID(@Param("customerid") customerid: string) {
    const customer = await this.customerManagementService.getCustomerByID(
      customerid
    );

    return { data: customer };
  }

  @Get("/account/:accountno")
  async getCustomerByAccountNumber(@Param("accountno") accountno: string) {
    const customer =
      await this.customerManagementService.getCustomerByAccountNumber(
        accountno
      );

    return { data: customer };
  }

  @Get("email/:email")
  async getCustomerByEmail(@Param("email") email: string) {
    const customer = await this.customerManagementService.getCustomerByEmail(
      email
    );

    return { data: customer };
  }

  @Get("/name/:name")
  async getCustomerByName(@Param("name") name: string) {
    const customer = await this.customerManagementService.getCustomerByName(
      name
    );

    return { data: customer };
  }

  @Get("/phone/:phone")
  async getCustomerByPhone(@Param("phone") phone: string) {
    const customer = await this.customerManagementService.getCustomerByPhone(
      phone
    );

    return { data: customer };
  }

  @Get("/account/plan/:productid")
  async getCustomersByAccountPlan(@Param("productid") productid: string) {
    const customer =
      await this.customerManagementService.getCustomersByAccountPlan(productid);

    return { data: customer };
  }

  @Get("/all")
  async getAllCustomers() {
    const customer = await this.customerManagementService.getAllCustomers();

    return { data: customer };
  }

  @Get("/bank/:bvn")
  async getCustomerByBank(@Param("bvn") bvn: string) {
    const customer = await this.customerManagementService.getCustomerByBank(
      bvn
    );

    return { data: customer };
  }

  @Get("/position/:customerid")
  async getCustomerPosition(@Param("customerid") customerid: string) {
    const customer = await this.customerManagementService.getCustomerPosition(
      customerid
    );

    return { data: customer };
  }

  @Get("/position2/:customerid")
  async getCustomerPosition2(@Param("customerid") customerid: string) {
    const customer = await this.customerManagementService.getCustomerPosition2(
      customerid
    );

    return { data: customer };
  }

  @Post("new/individual/account")
  async createNewIndividualCustomer(
    @Body() createNewIndCustomerDto: CreateCustomerDto
  ) {
    const customer =
      await this.customerManagementService.createNewIndividualCustomer(
        createNewIndCustomerDto
      );

    return { data: customer };
  }

  @Post("new/corporate/account")
  async createNewCorporateCustomer(
    @Body() createNewCorporateAcctDto: CreateCorporateDto
  ) {
    const customer =
      await this.customerManagementService.createNewCorporateCustomer(
        createNewCorporateAcctDto
      );

    return { data: customer };
  }

  @Post("new/joint/account")
  async createNewJointAccount(
    @Body() createJointAccountDTO: CreateJointAccountDTO
  ) {
    const customer = await this.customerManagementService.createNewJointAccount(
      createJointAccountDTO
    );

    return { data: customer };
  }

  @Post("update/email")
  async updateIndividualCustomerEmail(
    @Body() updateCustomerEmailDTO: UpdateCustomerEmailDTO
  ) {
    const customer =
      await this.customerManagementService.updateIndividualCustomerEmail(
        updateCustomerEmailDTO
      );

    return { data: customer };
  }

  @Post("update/address")
  async updateIndividualCustomerAddress(
    @Body() updateCustomerAddressDTO: UpdateCustomerAddressDTO
  ) {
    const customer =
      await this.customerManagementService.updateIndividualCustomerAddress(
        updateCustomerAddressDTO
      );

    return { data: customer };
  }

  @Post("update/id")
  async updateIndividualCustomerID(
    @Body() updateCustomerIDDTO: UpdateCustomerIDDTO
  ) {
    const customer =
      await this.customerManagementService.updateIndividualCustomerID(
        updateCustomerIDDTO
      );

    return { data: customer };
  }

  @Post("update/employment")
  async updateIndividualCustomerEmployment(
    @Body() updateCustomerEmploymentDTO: UpdateCustomerEmploymentDTO
  ) {
    const customer =
      await this.customerManagementService.updateIndividualCustomerEmployment(
        updateCustomerEmploymentDTO
      );

    return { data: customer };
  }

  @Post("remove/employment")
  async removeIndividualEmployment(
    @Body() removeIndividualEmploymentDto: RemoveIndividualEmploymentDto
  ) {
    const customer =
      await this.customerManagementService.removeIndividualEmployment(
        removeIndividualEmploymentDto
      );

    return { data: customer };
  }
}
