export const checkUserExists = (user: any) => {
  if (user) {
    const error = new Error("Phone number is already registered");
    (error as any).status = 409;
    (error as any).code = "USER_EXISTS";
    throw error;
  }
};

export const isHasOtp = (otp: any) => {
  if(!otp){
    const error = new Error("OTP not found for this phone number");
    
    (error as any).status = 404;
    (error as any).code = "OTP_NOT_FOUND";
    throw error;
  }
}