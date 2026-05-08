import { EnvService } from 'src/common/env.service';

const env_config = new EnvService().read();
const JWTCONSTANTS = env_config.JWTCONSTANTS;

export const jwtConstants = {
  secret: JWTCONSTANTS,
};
