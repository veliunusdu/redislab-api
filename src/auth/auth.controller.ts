import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { sid, user } = await this.auth.login(body.email, body.password);

    const cookieName = process.env.SESSION_COOKIE_NAME || 'sid';
    const secure = (process.env.SESSION_COOKIE_SECURE || 'false') === 'true';

    res.cookie(cookieName, sid, {
      httpOnly: true,
      secure,        // true in prod (https)
      sameSite: 'lax',
      path: '/',
      maxAge: (Number(process.env.SESSION_TTL_SECONDS || 86400)) * 1000,
    });

    return { ok: true, user };
  }
}
