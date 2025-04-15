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

const whitelist = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
];

const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    if (!origin) {
      return callback(null, true);
    }

    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cookieParser())
  .use(cors(corsOptions))
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
