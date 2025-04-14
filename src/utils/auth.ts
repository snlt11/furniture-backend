export const checkUserExists = (user: any) => {
  if (user) {
    const error = new Error("Phone number is already registered");
    (error as any).status = 409;
    (error as any).code = "USER_EXISTS";
    throw error;
  }
};
