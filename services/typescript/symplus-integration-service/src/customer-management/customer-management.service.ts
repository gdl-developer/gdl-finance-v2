import { Injectable, NotImplementedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AbstractService } from "src/common/abstracts/abstract.service";
import { CustomerManagement } from "./entities/customer-management.entity";
import { Repository } from "typeorm";
import { CreateCustomerDto } from "./dto/create-individual-customer.dto";
import { CreateCorporateDto } from "./corporates/dto/create-corporate.dto";
import { CreateJointAccountDTO } from "./dto/create-joint-acct.dto";
import { UpdateCustomerEmailDTO } from "./dto/update-customer-email.dto";
import { UpdateCustomerAddressDTO } from "./dto/update-customer-address.dto";
import { UpdateCustomerIDDTO } from "./dto/update-customer-identity.dto";
import { UpdateCustomerEmploymentDTO } from "./dto/update-customer-employment.dto";
import { RemoveIndividualEmploymentDto } from "./dto/remove-individual-employment.dto";
import { SymplusApiRequestsService } from "src/symplus-api-requests/symplus-api-requests.service";
import { SymplusAPICallCategories } from "src/symplus-api-requests/entities/symplus-api-request.entity";

const call_category = SymplusAPICallCategories.CUSTOMER_MANAGEMENT;

@Injectable()
export class CustomerManagementService extends AbstractService {
  constructor(
    @InjectRepository(CustomerManagement)
    private readonly customerManagementRepo: Repository<CustomerManagement>,
    private readonly symplusRequestsService: SymplusApiRequestsService
  ) {
    super(customerManagementRepo);
  }

  async getCustomerByID(customerid: string) {
    const url_path = `/GetCustomerByID/${customerid}`;
    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Get Customer By ID. An Error Occurred"
      );
    }

    return customer;
  }

  async getCustomerByAccountNumber(accountno: string) {
    const url_path = `/GetCustomerByCashAccount/${accountno}`;

    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Get Customer By Account Number. An Error Occurred"
      );
    }

    return customer;
  }

  async getCustomerByEmail(email: string) {
    const url_path = `/GetCustomerByEmail/${email}/`;

    const response = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!response) {
      throw new NotImplementedException(
        "Failed To Get Customer By Email. An Error Occurred"
      );
    }

    // Transform response to match User-Service expectation
    // Upstream returns: { GetCustomerByEmail: [ { CUSTOMER_ID: "...", ... } ] }
    // We need to return: { reference: { CustomerID: "..." }, code: "00", remarks: "Success" }

    if (
      response.GetCustomerByEmail &&
      Array.isArray(response.GetCustomerByEmail) &&
      response.GetCustomerByEmail.length > 0
    ) {
      const customerData = response.GetCustomerByEmail[0];
      return {
        reference: {
          CustomerID: customerData.CUSTOMER_ID,
          ...customerData, // optionally include other data
        },
        code: "00",
        remarks: "Success",
      };
    }

    return response;
  }

  async getCustomerByEmailV3(email: string) {
    const full_url = `https://clientportal.gdl.com.ng/ords/api/core/v3/GetCustomerByEmail/${email}/`;

    const headers = {
      authorization_key: "svfdlkndfklfd",
      client_key: "vfdklndfkdf",
    };

    const customer =
      await this.symplusRequestsService.synchronousGetCallWithCustomHeaders(
        call_category,
        full_url,
        headers
      );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Get Customer By Email V3. An Error Occurred"
      );
    }

    return customer;
  }

  async getCustomerByName(name: string) {
    const url_path = `/GetCustomerByName/${name}`;

    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Get Customer By Name. An Error Occurred"
      );
    }

    return customer;
  }

  async getCustomerByPhone(phone: string) {
    const url_path = `/GetCustomerByPhone/${phone}`;

    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Get Customer By Phone. An Error Occurred"
      );
    }

    return customer;
  }

  async getCustomersByAccountPlan(productid: string) {
    const url_path = `/GetCustomersByAccountPlan/${productid}`;

    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Get Customer By Account Plan. An Error Occurred"
      );
    }

    return customer;
  }

  async getAllCustomers() {
    const url_path = `/GetCustomers`;

    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Get All Customers. An Error Occurred"
      );
    }

    return customer;
  }

  async getCustomerByBank(bvn: string) {
    const url_path = `/GetCustomerByBank/${bvn}/`;

    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Get Customer By BVN. An Error Occurred"
      );
    }

    return customer;
  }

  async getCustomerPosition(customerid: string) {
    const url_path = `/GetCustomerPosition/${customerid}/`;

    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Get Customer Position. An Error Occurred"
      );
    }

    return customer;
  }

  async getCustomerPosition2(customerid: string) {
    const url_path = `/GetCustomerDetails/${customerid}/`;

    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Get Customer Details. An Error Occurred"
      );
    }

    return customer;
  }

  async getCustomerDetails(customerid: string) {
    const url_path = `/GetCustomerDetails/${customerid}/`;

    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Get Customer Details. An Error Occurred"
      );
    }

    return customer;
  }

  async getCustomerDetailsByLoginID(loginid: string) {
    const url_path = `/GetCustomerDetailsByLoginID/${loginid}/`;

    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Get Customer Details ByLogin ID. An Error Occurred"
      );
    }

    return customer;
  }

  async getIsValidLoginID(loginid: string) {
    const url_path = `/GetIsValidLoginID/${loginid}/`;

    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Check Valid Login ID. An Error Occurred"
      );
    }

    return customer;
  }

  async GetIsValidCustomerID(customerid: string) {
    const url_path = `/GetIsValidCustomerID/${customerid}/`;

    const customer = await this.symplusRequestsService.synchronousGetCall(
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Check Valid Customer ID. An Error Occurred"
      );
    }

    return customer;
  }

  async createNewIndividualCustomer(
    createNewIndCustomerDto: CreateCustomerDto
  ) {
    const url_path = `/DoNewIndividual/`;

    // ------------------------------------------------------------------
    // PRE-CHECK: Check if customer already exists before attempting creation
    // ------------------------------------------------------------------

    // 2. Check by Email
    if (createNewIndCustomerDto.primary_email_address) {
      try {
        console.log(
          `🔍 Pre-check: Checking for existing customer by Email: ${createNewIndCustomerDto.primary_email_address}`
        );
        const userByEmail = await this.getCustomerByEmail(
          createNewIndCustomerDto.primary_email_address
        );
        console.log("userByEmail", userByEmail);
        if (userByEmail && !userByEmail.error) {
          console.log("✅ Pre-check found customer by Email.");
          return userByEmail;
        }
      } catch (e) {
        // Continue to next check
      }
    }

    // 1. Check by BVN
    if (createNewIndCustomerDto.bank_bvn_no) {
      try {
        console.log(
          `🔍 Pre-check: Checking for existing customer by BVN: ${createNewIndCustomerDto.bank_bvn_no}`
        );
        const userByBVN = await this.getCustomerByBank(
          createNewIndCustomerDto.bank_bvn_no
        );
        console.log("userByBVN", userByBVN);
        if (userByBVN && !userByBVN.error) {
          console.log("✅ Pre-check found customer by BVN.");
          return userByBVN;
        }
      } catch (e) {
        // Continue to next check
      }
    }

    // 3. Check by Phone
    if (createNewIndCustomerDto.mobile_phone_no) {
      try {
        console.log(
          `🔍 Pre-check: Checking for existing customer by Phone: ${createNewIndCustomerDto.mobile_phone_no}`
        );
        const userByPhone = await this.getCustomerByPhone(
          createNewIndCustomerDto.mobile_phone_no
        );
        console.log("userByPhone", userByPhone);
        if (userByPhone && !userByPhone.error) {
          console.log("✅ Pre-check found customer by Phone.");
          return userByPhone;
        }
      } catch (e) {
        // Continue to creation
      }
    }

    // ------------------------------------------------------------------
    // PROCEED WITH CREATION
    // ------------------------------------------------------------------
    try {
      console.log("🔧 Creating new customer via:", url_path);

      const payload = {
        customer: [
          {
            ...createNewIndCustomerDto,
          },
        ],
      };

      const new_customer =
        await this.symplusRequestsService.synchronousPostCall(
          payload,
          call_category,
          url_path,
          null
        );

      if (
        new_customer &&
        (new_customer.code == "502" || new_customer.code === 502) &&
        new_customer.remarks &&
        typeof new_customer.remarks === "string" &&
        new_customer.remarks.includes("BVN NO") &&
        new_customer.remarks.includes("already exists")
      ) {
        // Double check fallback just in case pre-checks missed something (race condition etc.)
        console.log("⚠️ Customer BVN exists error returned. Retrying fetch...");
        try {
          const userByBVNRetry = await this.getCustomerByBank(
            createNewIndCustomerDto.bank_bvn_no
          );
          return userByBVNRetry;
        } catch (bvnError) {
          // Fallback to Email V3 check from original code logic which seemed to be a catch-all
          console.log(
            "⚠️ Retry fetch by BVN failed. Attempting Email V3 fallback..."
          );
        }
      }

      if (!new_customer) {
        throw new NotImplementedException(
          "Failed To Create New Individual Customer. No response received."
        );
      }

      return new_customer;
    } catch (error) {
      console.error("❌ Error in createNewIndividualCustomer:", error);

      // Fallback: Check if customer already exists (Code 502)
      if (
        error &&
        (error.code == "502" || error.code === 502) &&
        error.remarks &&
        typeof error.remarks === "string" &&
        error.remarks.includes("already exists")
      ) {
        console.log(
          "⚠️ Customer exists. Falling back to getCustomerByEmailV3..."
        );
        try {
          return await this.getCustomerByEmailV3(
            createNewIndCustomerDto.primary_email_address
          );
        } catch (fallbackError) {
          console.error(
            "❌ Fallback to getCustomerByEmailV3 failed:",
            fallbackError
          );
          throw fallbackError;
        }
      }

      throw new NotImplementedException(
        "Failed To Create New Individual Customer. An error occurred processing your request."
      );
    }
  }

  async createNewCorporateCustomer(
    createNewCorporateAcctDto: CreateCorporateDto
  ) {
    const url_path = `/DoNewCorporate`;

    const customer = await this.symplusRequestsService.synchronousPostCall(
      {
        ...createNewCorporateAcctDto,
      },
      call_category,
      url_path,
      null
    );

    if (!customer) {
      throw new NotImplementedException(
        "Failed To Create New Corporate customer. An Error Occured"
      );
    }

    return customer;
  }

  async createNewJointAccount(createJointAccountDTO: CreateJointAccountDTO) {
    const url_path = `/DoNewJoint`;

    const account = await this.symplusRequestsService.synchronousPostCall(
      {
        ...createJointAccountDTO,
      },
      call_category,
      url_path,
      null
    );

    if (!account) {
      throw new NotImplementedException(
        "Failed To Create New Joint customer. An Error Occured"
      );
    }

    return account;
  }

  async updateIndividualCustomerEmail(
    updateCustomerEmailDTO: UpdateCustomerEmailDTO
  ) {
    const url_path = `/DoUpdateIndividualEmail`;

    const email = await this.symplusRequestsService.synchronousPostCall(
      {
        ...updateCustomerEmailDTO,
      },
      call_category,
      url_path,
      null
    );

    if (!email) {
      throw new NotImplementedException(
        "Failed To Update Individual Customer Email. An Error Occured"
      );
    }

    return email;
  }

  async updateIndividualCustomerAddress(
    updateCustomerAddressDTO: UpdateCustomerAddressDTO
  ) {
    const url_path = `/DoUpdateIndividualAddress/`;

    const address = await this.symplusRequestsService.synchronousPostCall(
      {
        ...updateCustomerAddressDTO,
      },
      call_category,
      url_path,
      null
    );

    if (!address) {
      throw new NotImplementedException(
        "Failed To Update Individual Address. An Error Occured"
      );
    }

    return address;
  }

  async updateIndividualCustomerID(updateCustomerIDDTO: UpdateCustomerIDDTO) {
    const url_path = `/DoUpdateIndividualID/`;

    const identity = await this.symplusRequestsService.synchronousPostCall(
      {
        ...updateCustomerIDDTO,
      },
      call_category,
      url_path,
      null
    );

    if (!identity) {
      throw new NotImplementedException(
        "Failed To Update Individual Identity. An Error Occured"
      );
    }

    return identity;
  }

  async updateIndividualCustomerEmployment(
    updateCustomerEmploymentDTO: UpdateCustomerEmploymentDTO
  ) {
    const url_path = `/DoUpdateIndividualEmploy`;

    const employment = await this.symplusRequestsService.synchronousPostCall(
      {
        ...updateCustomerEmploymentDTO,
      },
      call_category,
      url_path,
      null
    );

    if (!employment) {
      throw new NotImplementedException(
        "Failed To Update Individual Employment. An Error Occured"
      );
    }

    return employment;
  }

  async removeIndividualEmployment(
    removeIndividualEmploymentDto: RemoveIndividualEmploymentDto
  ) {
    const url_path = `/DoRemoveIndividualEmploy`;

    const employment = await this.symplusRequestsService.synchronousPostCall(
      {
        ...removeIndividualEmploymentDto,
      },
      call_category,
      url_path,
      null
    );

    if (!employment) {
      throw new NotImplementedException(
        "Failed To Remove Individual Employment. An Error Occured"
      );
    }

    return employment;
  }
}
