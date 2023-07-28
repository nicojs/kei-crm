import type { UserRole } from '@rock-solid/shared';

export const authConstants = Object.freeze({
  jwtSecret: process.env['JWT_SECRET']!,
  jwtStrategy: 'jwt',
  office365Strategy: 'office365',
  public: 'public',
  requiredPrivilege: 'privileges',
  adminGroupObjectId: '8a6bb46f-bc43-4569-bb90-47ad97c0d3ad',
  projectverantwoordelijkeGroupObjectId: 'bfe6c55e-2eee-4ef9-9bee-d778b01fd61f',
  roleOverride: process.env['ROLE_OVERRIDE'] as UserRole | undefined,
});
