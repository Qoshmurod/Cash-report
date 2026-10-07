import { Global, Module } from '@nestjs/common';
import { DatabaseBase64ImageStorage } from './database-base64-image.storage';
import { IMAGE_STORAGE } from './image-storage';

@Global()
@Module({
  providers: [{ provide: IMAGE_STORAGE, useClass: DatabaseBase64ImageStorage }],
  exports: [IMAGE_STORAGE],
})
export class StorageModule {}
