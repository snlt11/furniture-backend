import { randomBytes } from "crypto";

export const generateOtp = () => {
  return (parseInt(randomBytes(3).toString("hex"), 16) % 900000) + 10000;
};

export const generateRememberToken = (): string => {
  return randomBytes(32).toString("hex");
};
