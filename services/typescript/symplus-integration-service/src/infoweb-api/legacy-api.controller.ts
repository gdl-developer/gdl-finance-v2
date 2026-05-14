import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiParam } from "@nestjs/swagger";
import { InfowebApiService } from "./infoweb-api.service";
import { FundAccountDto } from "./dto/create-customer.dto";

@ApiTags("Legacy API")
@Controller("api/json")
export class LegacyApiController {
  constructor(private readonly infowebApiService: InfowebApiService) {}

  @Get("FundAccount2")
  @ApiOperation({ summary: "Fund Account (Legacy Endpoint)" })
  @ApiParam({ name: "Session", description: "Session ID", required: true })
  async fundAccount(@Query() query: FundAccountDto) {
    // Remove sessionId from query if present to avoid confusion, though service handles it
    const { ...params } = query;
    return this.infowebApiService.fundAccount(params);
  }
}
