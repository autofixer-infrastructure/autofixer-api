import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Google ID token from OAuth flow',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;
}
