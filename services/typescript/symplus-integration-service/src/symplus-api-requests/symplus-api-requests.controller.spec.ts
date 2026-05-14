import { Test, TestingModule } from "@nestjs/testing";
import { SymplusApiRequestsController } from "./symplus-api-requests.controller";
import { SymplusApiRequestsService } from "./symplus-api-requests.service";

describe("SymplusApiRequestsController", () => {
  let controller: SymplusApiRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SymplusApiRequestsController],
      providers: [SymplusApiRequestsService],
    }).compile();

    controller = module.get<SymplusApiRequestsController>(
      SymplusApiRequestsController
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
