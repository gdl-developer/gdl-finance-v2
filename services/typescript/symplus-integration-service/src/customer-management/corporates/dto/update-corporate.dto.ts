import { PartialType } from "@nestjs/swagger";
import { CreateCorporateDto } from "./create-corporate.dto";

export class UpdateCorporateDto extends PartialType(CreateCorporateDto) {}
