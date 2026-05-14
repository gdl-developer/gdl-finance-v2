import { Test, TestingModule } from "@nestjs/testing";
import { SymplusApiRequestsService } from "./symplus-api-requests.service";

describe("SymplusApiRequestsService", () => {
  let service: SymplusApiRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymplusApiRequestsService],
    }).compile();

    service = module.get<SymplusApiRequestsService>(SymplusApiRequestsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
