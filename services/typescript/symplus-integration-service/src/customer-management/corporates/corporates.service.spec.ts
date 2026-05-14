import { Test, TestingModule } from "@nestjs/testing";
import { CorporatesService } from "./corporates.service";

describe("CorporatesService", () => {
  let service: CorporatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CorporatesService],
    }).compile();

    service = module.get<CorporatesService>(CorporatesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
