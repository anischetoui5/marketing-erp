import { Test, TestingModule } from '@nestjs/testing';
import { AiInsightsService } from './ai-insights.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  ai_insights: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

describe('AiInsightsService', () => {
  let service: AiInsightsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiInsightsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AiInsightsService>(AiInsightsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getInsights', () => {
    it('returns formatted insights', async () => {
      const now = new Date();
      mockPrismaService.ai_insights.findMany.mockResolvedValue([
        {
          id: 'insight-1',
          summary: 'Strong performance this month.',
          insights: [{ title: 'High CTR', body: 'CTR above average.' }],
          recommendations: [
            { title: 'Increase budget', body: 'Scale top campaigns.' },
          ],
          generated_at: now,
          prompt_tokens: 1500,
          completion_tokens: 800,
          cost_usd: 0.0165,
          failed: false,
          error_msg: null,
        },
      ]);

      const result = await service.getInsights('project-id');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('insight-1');
      expect(result[0].summary).toBe('Strong performance this month.');
      expect(result[0].failed).toBe(false);
    });

    it('returns empty array when no insights', async () => {
      mockPrismaService.ai_insights.findMany.mockResolvedValue([]);
      const result = await service.getInsights('project-id');
      expect(result).toHaveLength(0);
    });
  });

  describe('getLatestInsight', () => {
    it('returns null when no insight exists', async () => {
      mockPrismaService.ai_insights.findFirst.mockResolvedValue(null);
      const result = await service.getLatestInsight('project-id');
      expect(result).toBeNull();
    });

    it('returns formatted insight when found', async () => {
      const now = new Date();
      mockPrismaService.ai_insights.findFirst.mockResolvedValue({
        id: 'insight-latest',
        summary: 'Latest summary',
        insights: [],
        recommendations: [],
        generated_at: now,
        prompt_tokens: 1000,
        completion_tokens: 500,
        cost_usd: 0.01,
        failed: false,
        error_msg: null,
      });
      const result = await service.getLatestInsight('project-id');
      expect(result?.id).toBe('insight-latest');
    });
  });
});
