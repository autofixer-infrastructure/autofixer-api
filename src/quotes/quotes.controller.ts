import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PublicCreateQuoteDto } from './dto/public-create-quote.dto';
import { PublicCalculateQuoteDto } from './dto/public-calculate-quote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Quotes')
@Controller({ path: 'quotes', version: '1' })
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate quote without saving (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Quote calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async calculate(@Body() dto: PublicCalculateQuoteDto) {
    return this.quotesService.calculatePublic(dto);
  }

  @Post('public')
  @ApiOperation({ summary: 'Create a public quote from website (no auth required)' })
  @ApiResponse({ status: 201, description: 'Quote created successfully' })
  async createPublic(@Body() dto: PublicCreateQuoteDto) {
    return this.quotesService.createPublic(dto);
  }

  @Post()
  // NOTE: Temporarily public for lead capture without auth
  // TODO: Add optional auth for logged-in users
  @ApiOperation({ summary: 'Create a new quote (public endpoint for lead capture)' })
  @ApiResponse({ status: 201, description: 'Quote created successfully' })
  async create(
    // TODO: Add @CurrentUser('id') userId: string for authenticated users
    @Body() createQuoteDto: CreateQuoteDto,
  ) {
    // Allow anonymous quotes (no clientId required for public form)
    // If userId is provided by auth, set it; otherwise leave undefined
    // createQuoteDto.clientId = userId || undefined;
    return this.quotesService.create(createQuoteDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all quotes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'clientId', required: false, type: String })
  @ApiQuery({ name: 'isConverted', required: false, type: Boolean })
  async findAll(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('clientId') clientId?: string,
    @Query('isConverted') isConverted?: boolean,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    // Clients can only see their own quotes
    if (user.role === UserRole.CLIENT) {
      return this.quotesService.findAll({
        page,
        limit,
        clientId: user.id,
      });
    }

    return this.quotesService.findAll({
      page,
      limit,
      clientId,
      isConverted,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get quote by ID' })
  @ApiResponse({ status: 200, description: 'Quote found' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const quote = await this.quotesService.findOne(id);
    
    // Clients can only view their own quotes
    if (user.role === UserRole.CLIENT && quote.clientId !== user.id) {
      throw new Error('Not authorized to view this quote');
    }
    
    return quote;
  }
}
