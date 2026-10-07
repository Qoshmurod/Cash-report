import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { IMAGE_LIMITS } from '../constants/app.constants';

const DATA_URL = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/;

const MAGIC: Record<string, (buf: Buffer) => boolean> = {
  'image/jpeg': (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};

export interface ImageCheckResult {
  valid: boolean;
  reason?: string;
  mime?: string;
  bytes?: number;
}

/** Validates a base64 data URL: allowed mime, real magic bytes and decoded size limit. */
export const checkBase64Image = (value: unknown, maxBytes: number = IMAGE_LIMITS.MAX_BYTES): ImageCheckResult => {
  if (typeof value !== 'string') return { valid: false, reason: 'must be a data URL string' };
  const match = DATA_URL.exec(value);
  if (!match) return { valid: false, reason: 'must be a base64 data URL (data:image/...;base64,...)' };
  const mime = match[1];
  if (!IMAGE_LIMITS.MIME_TYPES.includes(mime)) return { valid: false, reason: `unsupported image type ${mime}` };
  const approxBytes = Math.floor((match[2].length * 3) / 4);
  if (approxBytes > maxBytes) return { valid: false, reason: `image exceeds ${Math.round(maxBytes / 1024 / 1024)} MB` };
  const buf = Buffer.from(match[2], 'base64');
  if (!MAGIC[mime](buf)) return { valid: false, reason: 'file content does not match declared image type' };
  return { valid: true, mime, bytes: buf.length };
};

export function IsBase64Image(options?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isBase64Image',
      target: object.constructor,
      propertyName: propertyName as string,
      options,
      validator: {
        validate: (value: unknown) => value === null || value === undefined || checkBase64Image(value).valid,
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} ${checkBase64Image(args.value).reason ?? 'is not a valid image'}`,
      },
    });
  };
}
