import { BadRequestException, Injectable } from '@nestjs/common';
import { checkBase64Image } from '../validators/base64-image.validator';
import { ImageStorage } from './image-storage';

@Injectable()
export class DatabaseBase64ImageStorage implements ImageStorage {
  async save(dataUrl: string): Promise<string> {
    const check = checkBase64Image(dataUrl);
    if (!check.valid) throw new BadRequestException(`Invalid image: ${check.reason ?? 'unknown error'}`);
    return dataUrl;
  }

  async remove(): Promise<void> {
    return;
  }
}
