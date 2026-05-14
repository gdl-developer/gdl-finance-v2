import { Test, TestingModule } from "@nestjs/testing";
import { CorporatesController } from "./corporates.controller";
import { CorporatesService } from "./corporates.service";

describe("CorporatesController", () => {
  let controller: CorporatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CorporatesController],
      providers: [CorporatesService],
    }).compile();

    controller = module.get<CorporatesController>(CorporatesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
