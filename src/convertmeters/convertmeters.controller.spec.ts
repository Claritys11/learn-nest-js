import { Test, TestingModule } from '@nestjs/testing';
import { ConvertmetersController } from './convertmeters.controller.js';
import { ConvertmetersService } from './convertmeters.service.js';

describe('ConvertmetersController', () => {
  let controller: ConvertmetersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConvertmetersController],
      providers: [ConvertmetersService],
    }).compile();

    controller = module.get<ConvertmetersController>(ConvertmetersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
