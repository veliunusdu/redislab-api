import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { SessionGuard } from './session.guard';

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
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: num('SESSION_TTL_SECONDS', 86400) * 1000,
    });

    return { ok: true, user };
  }

  /** DELETE a single session – the one belonging to the current cookie. */
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const cookieName = process.env.SESSION_COOKIE_NAME || 'sid';
    const sid = req.cookies?.[cookieName];

    await this.auth.logoutSingle(sid);

    res.clearCookie(cookieName, { path: '/' });
    return { ok: true };
  }

  /** DELETE every session for the authenticated user (logout-all-devices). */
  @Post('logout-all')
  @UseGuards(SessionGuard)
  async logoutAll(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const { count } = await this.auth.logoutAll(req.user.id);

    const cookieName = process.env.SESSION_COOKIE_NAME || 'sid';
    res.clearCookie(cookieName, { path: '/' });

    return { ok: true, sessionsRevoked: count };
  }
}

function num(name: string, fallback: number) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
