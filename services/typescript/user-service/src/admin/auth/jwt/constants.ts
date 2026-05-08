import { EnvService } from 'src/common/env.service';

const env_config = new EnvService().read();
const REFRESH_AUTH = env_config.REFRESH_AUTH;
const ADMIN_ACCESS_AUTH = env_config.ADMIN_ACCESS_AUTH;

export const jwtAdminConstants = {
  secret: ADMIN_ACCESS_AUTH,
};

export const jwtUserConstants = {
  secret: ADMIN_ACCESS_AUTH,
};

export const jwtRefreshConstants = {
  secret: REFRESH_AUTH,
};
