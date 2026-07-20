import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'MAILER_CONFIG',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        host: config.get<string>('SMTP_HOST'),
        port: config.get<number>('SMTP_PORT'),
        secure: config.get<boolean>('SMTP_SECURE'),
        user: config.get<string>('SMTP_USER'),
        password: config.get<string>('SMTP_PASSWORD'),
        from: config.get<string>('SMTP_FROM'),
      }),
    },
  ],
  exports: ['MAILER_CONFIG'],
})
export class MailerModule {}
