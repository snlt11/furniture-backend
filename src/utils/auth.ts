export const checkUserExists = (user: any) => {
  if (user) {
    const error = new Error("Phone number is already registered");
    (error as any).status = 409;
    (error as any).code = "USER_EXISTS";
    throw error;
  }
};

export const checkUploadFile = (file: Express.Multer.File | undefined) => {
  if (!file) throw errorMessage("No file uploaded", 400, "FILE_REQUIRED");
};

export const checkUserIfNotExist = (user: any) => {
  if (!user) throw errorMessage("User not found", 404, "USER_NOT_FOUND");
};

export const isHasOtp = (otp: any) => {
  if (!otp) {
    const error = new Error("OTP not found for this phone number");

    (error as any).status = 404;
    (error as any).code = "OTP_NOT_FOUND";
    throw error;
  }
};

export function errorMessage(
  message: string,
  status: number,
  code: string
): Error {
  const error = new Error(message);
  (error as any).status = status;
  (error as any).code = code;
  return error;
}
