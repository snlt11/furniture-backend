import { Request, Response, NextFunction } from "express";
import { getUserById } from "../services/authService";
import { errorMessage } from "../utils/auth";

export const authorise = (allowRoles: boolean, ...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        throw errorMessage("Unauthorized access", 401, "UNAUTHORIZED");
      }

      const user = await getUserById(req.userId);
      if (!user) {
        throw errorMessage("User not found. Please log in again.", 401, "UNAUTHORIZED");
      }

      const hasRole = roles.includes(user.role);
      const isAuthorized = (allowRoles && hasRole) || (!allowRoles && !hasRole);

      if (!isAuthorized) {
        throw errorMessage("This action is not allowed.", 403, "FORBIDDEN");
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
};
