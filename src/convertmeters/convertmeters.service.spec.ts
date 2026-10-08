import { Test, TestingModule } from '@nestjs/testing';
import { ConvertmetersService } from './convertmeters.service.js';

describe('ConvertmetersService', () => {
  let service: ConvertmetersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConvertmetersService],
    }).compile();

    service = module.get<ConvertmetersService>(ConvertmetersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
