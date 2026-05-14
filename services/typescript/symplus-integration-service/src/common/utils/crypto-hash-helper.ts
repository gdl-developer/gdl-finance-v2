/* eslint-disable @typescript-eslint/no-var-requires */
const CryptoJS = require("crypto-js");

//The Function Below To Encrypt Text
export const encrypt = async (to_hash: string, EKY: string) => {
  return CryptoJS.AES.encrypt(to_hash, EKY).toString();
};

export const decrypt = async (token: any, EKY: string) => {
  return CryptoJS.AES.decrypt(token, EKY).toString(CryptoJS.enc.Utf8);
};
