import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import type { JwtPayload } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const ALL_ROLES = ['admin', 'marketing_manager', 'marketing_agent', 'production_manager', 'production_agent'] as const;

@ApiTags('chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Send a message to the AI assistant and get a reply' })
  async sendMessage(@Body() dto: SendMessageDto, @CurrentUser() user: JwtPayload) {
    const result = await this.chatbotService.chat(dto, user);
    return { data: result };
  }
}
