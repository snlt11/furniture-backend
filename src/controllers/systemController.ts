import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { createOrUpdateSettingStatus } from "../services/settingService";
import { errorMessage } from "../utils/auth";

interface CustomRequest extends Request {
  user?: any;
}

export const setMaintenance = [
  body("mode").isBoolean().withMessage("Mode must be boolean"),

  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req).array({ onlyFirstError: true });
      if (errors.length > 0) {
        throw errorMessage(errors[0].msg, 422, "INVALID_INPUT");
      }

      const { mode } = req.body;
      const value = mode ? "true" : "false";
      const message = mode
        ? "Successfully set maintenance mode"
        : "Successfully turned off maintenance mode";

      await createOrUpdateSettingStatus("maintenance", value);

      res.status(200).json({ message });
    } catch (error) {
      next(error);
    }
  },
];
