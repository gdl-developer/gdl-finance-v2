import { PartialType } from "@nestjs/swagger";
import { CreateSymplusApiRequestDto } from "./create-symplus-api-request.dto";

export class UpdateSymplusApiRequestDto extends PartialType(
  CreateSymplusApiRequestDto
) {}
