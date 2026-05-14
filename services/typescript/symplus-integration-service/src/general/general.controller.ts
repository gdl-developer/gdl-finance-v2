import { Controller } from "@nestjs/common";
import { GeneralService } from "./general.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("General")
@Controller("general")
export class GeneralController {
  constructor(private readonly generalService: GeneralService) {}
}
