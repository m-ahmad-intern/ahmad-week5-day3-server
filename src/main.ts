import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  app.enableCors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  });

  const config = app.get(ConfigService);
  const port = process.env.PORT || 3001;

  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
