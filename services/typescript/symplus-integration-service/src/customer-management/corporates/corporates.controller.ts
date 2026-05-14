import { Controller, Get, Param } from "@nestjs/common";
import { CorporatesService } from "./corporates.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Corporte Accounts")
@Controller("corporates")
export class CorporatesController {
  constructor(private readonly corporatesService: CorporatesService) {}

  @Get()
  async findAll() {
    const ress = await this.corporatesService.findAll();
    return { data: ress };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const ress = await this.corporatesService.findOne(+id);
    return { data: ress };
  }
}
