import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SiiController } from './sii.controller';
import { SiiService } from './sii.service';

@Module({
  imports: [PrismaModule],
  controllers: [SiiController],
  providers: [SiiService],
  exports: [SiiService],
})
export class SiiModule {}
