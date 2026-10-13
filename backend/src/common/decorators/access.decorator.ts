import { SetMetadata } from '@nestjs/common';
import { Section } from '../constants/sections';

export const ACCESS_KEY = 'access_sections';
/** Endpoint is allowed for users who have ANY of these sections (super admin: always). Overrides @Roles. */
export const Access = (...sections: Section[]): MethodDecorator & ClassDecorator => SetMetadata(ACCESS_KEY, sections);
