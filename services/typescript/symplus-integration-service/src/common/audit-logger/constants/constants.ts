import * as dotenv from "dotenv";
dotenv.config();

const JWTCONSTANTS = process.env.JWTCONSTANTS;

export const jwtConstants = {
  secret: JWTCONSTANTS,
};
