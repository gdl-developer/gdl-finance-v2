import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AbstractService } from "src/common/abstracts/abstract.service";
import {
  APIResponseTypes,
  CallTypes,
  SymplusAPICallCategories,
  SymplusApiRequest,
} from "./entities/symplus-api-request.entity";
import { Repository } from "typeorm";
import { SynchronousApiCalls } from "src/common/external-api-calls/sychronous-api-calls-for-payment-gateways.service";
import { encrypt } from "src/common/utils/crypto-hash-helper";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sha256 = require("sha256");

import * as dotenv from "dotenv";
dotenv.config();

const synchronousApiCalls = new SynchronousApiCalls();
const LOG_EKY = process.env.LOG_EKY;
const SYMPLUS_BASEURL = process.env.SYMPLUS_BASEURL;
const SYMPLUS_CLIENT_KEY = process.env.SYMPLUS_CLIENT_KEY;
const SYMPLUS_PRIVATE_KEY = process.env.SYMPLUS_PRIVATE_KEY;
const SYMPLUS_FUND = process.env.SYMPLUS_FUND;
const SYMPLUS_FUND_ID = process.env.SYMPLUS_FUND_ID;
let SYMPLUS_PUBLIC_KEY = process.env.SYMPLUS_PUBLIC_KEY;

@Injectable()
export class SymplusApiRequestsService extends AbstractService {
  constructor(
    @InjectRepository(SymplusApiRequest)
    private readonly symplusApiRequestRepo: Repository<SymplusApiRequest>
  ) {
    super(symplusApiRequestRepo);
  }

  async synchronousPostCall(
    postCallBody: any,
    call_category: SymplusAPICallCategories,
    url_path?: string,
    full_url?: string,
    headers?: { authorization_key: string; client_key: string }
  ): Promise<any> {
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        let SYMPLUS_AUTHKEY;
        let CLIENT_KEY;

        if (headers) {
          SYMPLUS_AUTHKEY = headers.authorization_key;
          CLIENT_KEY = headers.client_key;
        } else {
          SYMPLUS_AUTHKEY = await this.generateHash();
          CLIENT_KEY = SYMPLUS_CLIENT_KEY;
        }

        const call_data = {
          url: full_url || `${SYMPLUS_BASEURL}${url_path}`,
          body: JSON.stringify({ ...postCallBody }),
          authorization_key: SYMPLUS_AUTHKEY,
          client_key: CLIENT_KEY,
        };

        if (attempt > 1) {
          console.log(
            `🔄 Retrying POST attempt ${attempt} for ${call_data.url}`
          );
        }

        const call_res = await synchronousApiCalls.postCall(call_data);

        // Handle ECONNABORTED (Timeout)
        if (call_res && call_res.code === "ECONNABORTED") {
          console.log(
            `⚠️ Attempt ${attempt} failed: Timeout detected (ECONNABORTED) in POST.`
          );
          if (attempt < maxAttempts) continue;
        }

        // Check for 401 in the response object
        const is401Response =
          (call_res && call_res.response && call_res.response.status === 401) ||
          (call_res &&
            call_res.result &&
            call_res.result[0] &&
            call_res.result[0].code === "00401");

        if (is401Response && !headers && attempt < maxAttempts) {
          console.log(
            `⚠️ Attempt ${attempt} failed: Access Denied (401) in POST. Rotating key and retrying...`
          );
          await this.getNewPublicKey();
          continue;
        }

        await this.saveApiRequestNResponse(
          call_data.url,
          JSON.stringify(call_res),
          call_category,
          CallTypes.POST,
          postCallBody ? JSON.stringify(postCallBody) : null,
          attempt > 1 ? `RETRY_ATTEMPT_${attempt}` : undefined
        );

        if (!call_res || (!call_res.result && !call_res.Security)) {
          // If ORDS returned an error body (as seen in the logs)
          const errorMsg =
            call_res?.message ||
            call_res?.title ||
            call_res?.code ||
            "Invalid response format from synchronousApiCalls.postCall";

          const errorStatus = call_res?.status || 500;

          throw {
            message: errorMsg,
            status: errorStatus,
            response: call_res,
          };
        }

        // Return the first result if available, or the whole response if Security is present (key rotation)
        return call_res.result ? call_res.result[0] : call_res;
      } catch (error: any) {
        lastError = error;
        console.error(
          `❌ POST attempt ${attempt} failed:`,
          error.message || error
        );

        // Check if we should retry 401 from catch block
        const is401 =
          (error.response && error.response.status === 401) ||
          (error.result && error.result[0] && error.result[0].code === "00401");

        if (is401 && !headers && attempt < maxAttempts) {
          console.log(
            "⚠️ Access Denied (401) in POST catch. Rotating key and retrying..."
          );
          try {
            await this.getNewPublicKey();
            continue;
          } catch (rotateError) {
            console.error(
              "❌ Failed to rotate public key in POST:",
              rotateError
            );
          }
        }

        if (attempt < maxAttempts) {
          continue;
        }
        break;
      }
    }

    // Failure logging
    await this.saveApiRequestNResponse(
      full_url || `${SYMPLUS_BASEURL}${url_path}`,
      JSON.stringify({ error: lastError?.message || "Max attempts reached" }),
      call_category,
      CallTypes.POST,
      postCallBody ? JSON.stringify(postCallBody) : null,
      "FAILED_AFTER_RETRIES"
    );

    throw lastError || new Error("POST call failed after max attempts");
  }

  async synchronousGetCall(
    call_category: SymplusAPICallCategories,
    url_path?: string,
    full_url?: string
  ): Promise<any> {
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const authKey = await this.generateHash();
        const call_data = {
          url: full_url || `${SYMPLUS_BASEURL}${url_path}`,
          authorization_key: authKey,
          client_key: SYMPLUS_CLIENT_KEY,
        };

        if (attempt > 1) {
          console.log(
            `🔄 Retrying GET attempt ${attempt} for ${call_data.url}`
          );
        }

        const call_res = await synchronousApiCalls.getCall(call_data);

        // Handle ECONNABORTED (Timeout)
        if (call_res && call_res.code === "ECONNABORTED") {
          console.log(
            `⚠️ Attempt ${attempt} failed: Timeout detected (ECONNABORTED) in GET.`
          );
          if (attempt < maxAttempts) continue;
        }

        // Check for 401 in the response object
        const is401Response =
          (call_res && call_res.response && call_res.response.status === 401) ||
          (call_res &&
            call_res.result &&
            call_res.result[0] &&
            call_res.result[0].code === "00401");

        if (is401Response && attempt < maxAttempts) {
          console.log(
            `⚠️ Attempt ${attempt} failed: Access Denied (401) in GET. Rotating key and retrying...`
          );
          await this.getNewPublicKey();
          continue;
        }

        await this.saveApiRequestNResponse(
          call_data.url,
          JSON.stringify(call_res),
          call_category,
          CallTypes.GET,
          undefined,
          attempt > 1 ? `RETRY_ATTEMPT_${attempt}` : undefined
        );

        if (!call_res || (!call_res.result && !call_res.Security)) {
          const errorMsg =
            call_res?.message ||
            call_res?.title ||
            call_res?.code ||
            "Invalid response format from synchronousApiCalls.getCall";

          const errorStatus = call_res?.status || 500;

          throw {
            message: errorMsg,
            status: errorStatus,
            response: call_res,
          };
        }

        return call_res.result ? call_res.result[0] : call_res;
      } catch (error: any) {
        lastError = error;
        console.error(
          `❌ GET attempt ${attempt} failed:`,
          error.message || error
        );

        const is401 =
          (error.response && error.response.status === 401) ||
          (error.result && error.result[0] && error.result[0].code === "00401");

        if (is401 && attempt < maxAttempts) {
          console.log(
            "⚠️ Access Denied (401) in GET catch. Rotating key and retrying..."
          );
          try {
            await this.getNewPublicKey();
            continue;
          } catch (rotateError) {
            console.error(
              "❌ Failed to rotate public key in GET:",
              rotateError
            );
          }
        }

        if (attempt < maxAttempts) {
          continue;
        }
        break;
      }
    }

    // Failure logging
    await this.saveApiRequestNResponse(
      full_url || `${SYMPLUS_BASEURL}${url_path}`,
      JSON.stringify({ error: lastError?.message || "Max attempts reached" }),
      call_category,
      CallTypes.GET,
      undefined,
      "FAILED_AFTER_RETRIES"
    );

    throw lastError || new Error("GET call failed after max attempts");
  }

  async synchronousGetCallWithCustomHeaders(
    call_category: SymplusAPICallCategories,
    full_url: string,
    headers: { authorization_key: string; client_key: string }
  ): Promise<any> {
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: any = null;

    const call_data = {
      url: full_url,
      authorization_key: headers.authorization_key,
      client_key: headers.client_key,
    };

    while (attempt < maxAttempts) {
      attempt++;
      try {
        if (attempt > 1) {
          console.log(
            `🔄 Retrying custom GET attempt ${attempt} for ${full_url}`
          );
        }

        const call_res = await synchronousApiCalls.getCall(call_data);

        // Handle ECONNABORTED (Timeout)
        if (call_res && call_res.code === "ECONNABORTED") {
          console.log(
            `⚠️ Attempt ${attempt} failed: Timeout detected (ECONNABORTED) in custom GET.`
          );
          if (attempt < maxAttempts) continue;
        }

        await this.saveApiRequestNResponse(
          call_data.url,
          JSON.stringify(call_res),
          call_category,
          CallTypes.GET,
          undefined,
          attempt > 1 ? `RETRY_ATTEMPT_${attempt}` : undefined
        );

        return call_res;
      } catch (error: any) {
        lastError = error;
        console.error(
          `❌ Custom GET attempt ${attempt} failed:`,
          error.message || error
        );

        if (attempt < maxAttempts) {
          continue;
        }
        break;
      }
    }

    return { error: lastError?.message || "Max attempts reached" };
  }

  async getFunds() {
    return this.synchronousGetCall(
      SymplusAPICallCategories.MUTUAL_FUNDS,
      "/GetFunds/"
    );
  }

  async getCountries() {
    return this.synchronousGetCall(
      SymplusAPICallCategories.GENERAL,
      "/lov/GetCountries/"
    );
  }

  async fundAccount(fundAccountDto: any) {
    return this.synchronousPostCall(
      fundAccountDto,
      SymplusAPICallCategories.MUTUAL_FUNDS,
      "/DoFundAccount/"
    );
  }

  async getFundAccounts(customerId: string) {
    return this.synchronousGetCall(
      SymplusAPICallCategories.MUTUAL_FUNDS,
      `/GetFundAccounts/${customerId}/` // Added trailing slash to fix 301 error
    );
  }

  async fundSubscription(fundSubscriptionDto: any) {
    // Set default fund from environment if not provided
    if (
      fundSubscriptionDto.subscription &&
      fundSubscriptionDto.subscription.length > 0
    ) {
      fundSubscriptionDto.subscription.forEach((item: any) => {
        if (!item.fund) {
          item.fund = SYMPLUS_FUND;
        }
      });
    }
    return this.synchronousPostCall(
      fundSubscriptionDto,
      SymplusAPICallCategories.MUTUAL_FUNDS,
      "/DoFundSubscription/"
    );
  }

  async getFundPrice() {
    return this.synchronousGetCall(
      SymplusAPICallCategories.MUTUAL_FUNDS,
      `/GetFundPrice/${SYMPLUS_FUND_ID}/`
    );
  }

  async fundRedemption(fundRedemptionDto: any) {
    // Set default fund from environment if not provided
    if (
      fundRedemptionDto.redemption &&
      fundRedemptionDto.redemption.length > 0
    ) {
      fundRedemptionDto.redemption.forEach((item: any) => {
        if (!item.fund) {
          item.fund = SYMPLUS_FUND;
        }
      });
    }
    return this.synchronousPostCall(
      fundRedemptionDto,
      SymplusAPICallCategories.MUTUAL_FUNDS,
      "/DoFundRedemption/"
    );
  }

  async doCashDeposit(cashDepositDto: any) {
    /**
     * Symplus Cash Deposit
     * POST: /DoCashDeposit/
     * Payload: {
     *   "deposit": [
     *     {
     *       "customer": "string",
     *       "account": "string",
     *       "date": "string",
     *       "amount": "string",
     *       "description": "string",
     *       "reference": "string",
     *       "contra": "string"
     *     }
     *   ]
     * }
     */

    // ✅ Validate payload format
    if (!cashDepositDto.deposit || !Array.isArray(cashDepositDto.deposit)) {
      throw new Error(
        'Invalid cashDepositDto format: "deposit" array is required.'
      );
    }

    // ✅ Optional preprocessing or default values (e.g. timestamp)
    cashDepositDto.deposit.forEach((item: any) => {
      if (!item.date) {
        item.date = new Date().toISOString();
      }
    });

    // ✅ Make the API call using the existing generic synchronous POST handler
    return this.synchronousPostCall(
      cashDepositDto,
      SymplusAPICallCategories.MUTUAL_FUNDS, // You can also define a new enum if needed, e.g. SymplusAPICallCategories.CASH_DEPOSIT
      "/DoCashDeposit/"
    );
  }

  async saveApiRequestNResponse(
    api_url: string,
    api_response: string,
    call_category: SymplusAPICallCategories,
    call_type: CallTypes,
    request_body?: string,
    request_ref?: string
  ) {
    const api_req_res = await this.create({
      api_url,
      request_ref,
      request_body: await encrypt(request_body, LOG_EKY),
      api_response: await encrypt(api_response, LOG_EKY),
      call_category,
      call_type,
      response_type: APIResponseTypes.Normal_API_Response,
    });

    if (!api_req_res) {
      // console.log('saveApiRequestNResponse action failed'); // Removed as per instruction
    } else {
      // console.log('Api Request and Response Saved Successfully'); // Removed as per instruction
    }
  }

  async getFullQueryUrl(dto: any, url_path: string) {
    // Iterate through key-value pairs in searchTransactionsDto and append them to the URL
    Object.entries(dto).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url_path += `&${key}=${encodeURIComponent(value.toString())}`;
      }
    });

    return url_path;
  }

  async generateHash() {
    const combinedString = `${SYMPLUS_PUBLIC_KEY}${SYMPLUS_CLIENT_KEY}${SYMPLUS_PRIVATE_KEY}`;
    // console.log('SYMPLUS_PUBLIC_KEY', SYMPLUS_PUBLIC_KEY)

    const hash = sha256(combinedString);
    return hash;
  }

  async getNewPublicKey() {
    try {
      console.log("🔄 Fetching new public key...");
      const url = `https://clientportal.housemoni.ng/ords/api/core/v3/GetKey/${SYMPLUS_CLIENT_KEY}/`;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const axios = require("axios");
      const response = await axios.get(url, {
        headers: {
          accept: "application/json",
        },
      });

      let newKey = null;
      if (response.data) {
        if (typeof response.data === "string") newKey = response.data;
        else if (response.data.public_key) newKey = response.data.public_key;
        else if (response.data.key) newKey = response.data.key;
        else if (response.data.data)
          newKey = response.data.data; // Check .data wrapper
        else if (response.data.result) {
          if (Array.isArray(response.data.result) && response.data.result[0]) {
            const firstResult = response.data.result[0];
            if (firstResult.public_key) newKey = firstResult.public_key;
            else if (firstResult.key) newKey = firstResult.key;
            // Check for nested Security array structure from recent response
            else if (
              firstResult.Security &&
              Array.isArray(firstResult.Security) &&
              firstResult.Security[0]
            ) {
              newKey = firstResult.Security[0].PublicKey;
            }
          } else if (response.data.result.public_key) {
            newKey = response.data.result.public_key;
          }
        }
      }

      if (newKey) {
        // Simple validation to ensure it looks like a key (not an error message)
        if (newKey.length > 20) {
          SYMPLUS_PUBLIC_KEY = newKey;
          console.log(
            "✅ SYMPLUS_PUBLIC_KEY updated successfully. New Key Length:",
            newKey.length
          );
        } else {
          console.error("❌ Extracted key seems invalid (too short):", newKey);
        }
      } else {
        console.error(
          "❌ Could not extract public key from response. Check structure above."
        );
      }
    } catch (e: any) {
      console.error("❌ Failed to rotate public key:", e);
      if (e.response) {
        console.error(
          "❌ Error Response Data:",
          JSON.stringify(e.response.data)
        );
      }
    }
  }
}
