import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('RateLimit (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('hits endpoint 101 times and last is 429', async () => {
    const apiKey = 'test-api-key';
    const url = '/api/v1/users/3582c583-16d7-4ccf-a326-e80abe909d2c';

    let lastStatus = 0;

    for (let i = 1; i <= 101; i++) {
      const res = await request(app.getHttpServer())
        .get(url)
        .set('x-api-key', apiKey);

      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });
});
