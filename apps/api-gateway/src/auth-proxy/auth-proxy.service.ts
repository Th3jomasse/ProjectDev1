import {
  Injectable,
  Logger,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthProxyService {
  private readonly logger = new Logger(AuthProxyService.name);
  private readonly authServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const authServicePort = this.configService.get<number>(
      'AUTH_SERVICE_PORT',
      3001,
    );
    this.authServiceUrl = `http://localhost:${authServicePort}/auth`;
  }

  async register(registerDto: RegisterDto): Promise<{
    user: unknown;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/register`, registerDto),
      );
      return response.data;
    } catch (error) {
      this.handleServiceError(error, 'register');
    }
  }

  async login(loginDto: LoginDto): Promise<{
    user: unknown;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/login`, loginDto),
      );
      return response.data;
    } catch (error) {
      this.handleServiceError(error, 'login');
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/refresh`,
          refreshTokenDto,
        ),
      );
      return response.data;
    } catch (error) {
      this.handleServiceError(error, 'refresh token');
    }
  }

  async getProfile(authorization: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/me`, {
          headers: {
            Authorization: authorization,
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.handleServiceError(error, 'get profile');
    }
  }

  async logout(authorization: string): Promise<{ message: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/logout`,
          {},
          {
            headers: {
              Authorization: authorization,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleServiceError(error, 'logout');
    }
  }

  private handleServiceError(error: unknown, operation: string): never {
    if (error instanceof AxiosError) {
      this.logger.error(
        `Auth Service error during ${operation}: ${error.message}`,
        error.stack,
      );

      // Forward the exact error from the microservice
      if (error.response) {
        throw new HttpException(
          error.response.data,
          error.response.status,
        );
      }

      // Service unavailable
      throw new InternalServerErrorException(
        'Authentication service is temporarily unavailable',
      );
    }

    // Unknown error
    this.logger.error(
      `Unexpected error during ${operation}`,
      error instanceof Error ? error.stack : String(error),
    );
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
