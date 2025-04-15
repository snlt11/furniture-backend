import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { limiter } from "./middleware/rateLimiter";
// import routes from
import authRoutes from "./routes/v1/auth";
import userRoutes from "./routes/v1/admin/user";
import { auth } from "./middleware/auth";

export const app = express();

app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cookieParser())
  .use(helmet())
  .use(compression())
  .use(limiter);

// app.use(routes);
app.use("/api/v1", authRoutes);
app.use("/api/v1/admin", auth, userRoutes);

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "Server Error";
  const errorCode = error.code || "Error_Code";
  res.status(status).json({ message, error: errorCode });
});
