import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Notification type' })
  type: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Notification title' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Notification message' })
  message: string;

  @IsObject()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Additional data payload' })
  data?: Record<string, any>;

  @IsEnum(['email', 'push', 'both'])
  @IsOptional()
  @ApiPropertyOptional({ enum: ['email', 'push', 'both'], default: 'both' })
  channel?: 'email' | 'push' | 'both';
}
