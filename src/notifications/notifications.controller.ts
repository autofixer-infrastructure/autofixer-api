import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Notifications')
@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unreadOnly', new DefaultValuePipe(false)) unreadOnly: boolean,
  ) {
    return this.notificationsService.getUserNotifications(userId, { page, limit, unreadOnly });
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const result = await this.notificationsService.getUserNotifications(userId, {
      page: 1,
      limit: 1,
      unreadOnly: true,
    });
    return { count: result.meta.unreadCount };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.delete(id, userId);
  }

  // Admin endpoints for sending bulk notifications
  @Post('send')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send notification to user (Admin only)' })
  async send(
    @Body() sendNotificationDto: SendNotificationDto & { userId: string },
  ) {
    return this.notificationsService.sendToUser(sendNotificationDto.userId, {
      type: sendNotificationDto.type,
      title: sendNotificationDto.title,
      message: sendNotificationDto.message,
      data: sendNotificationDto.data,
      channel: sendNotificationDto.channel,
    });
  }

  @Post('send-bulk')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send bulk notifications (Admin only)' })
  async sendBulk(
    @Body() body: { userIds: string[] } & SendNotificationDto,
  ) {
    return this.notificationsService.sendBulk(body.userIds, {
      type: body.type,
      title: body.title,
      message: body.message,
      data: body.data,
      channel: body.channel,
    });
  }
}
