import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import languageMiddleware from "i18next-http-middleware";
import path from "path";
import cron from "node-cron";

import { limiter } from "./middleware/rateLimiter";
import RoutesV1 from "./routes/v1";

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

i18next
  .use(Backend)
  .use(languageMiddleware.LanguageDetector)
  .init({
    backend: {
      loadPath: path.join(
        process.cwd(),
        "src/locales",
        "{{lng}}",
        "{{ns}}.json"
      ),
    },
    detection: {
      order: ["querystring", "cookie"],
      caches: ["cookie"],
    },

    fallbackLng: "en",
    preload: ["en", "mm", "zh"],
  });
app.use(languageMiddleware.handle(i18next));
app.use(express.static(path.join(process.cwd(), "uploads/profile/images")));

app.use("/api/v1", RoutesV1);

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "Server Error";
  const errorCode = error.code || "Error_Code";
  res.status(status).json({ message, error: errorCode });
});

//Testing Cron Job
// cron.schedule('* * * * *', () => {
//   console.log('running a task every minute');
// });