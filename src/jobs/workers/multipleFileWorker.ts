import { Worker } from "bullmq";
import sharp from "sharp";
import path from "path";
import { redis } from "../../config/redis";

const multipleFileWorker = new Worker(
  "multipleFileQueue",
  async (job) => {
    const { filePath, fileName, width, height, quality, destination } =
      job.data;

    const optimizedImagePath = path.join(process.cwd(), destination, fileName);

    await sharp(filePath)
      .resize(width, height)
      .webp({ quality: quality })
      .toFile(optimizedImagePath);
  },
  { connection: redis }
);

const logJobStatus = (job: any, err?: Error) => {
  const jobId = job ? job.id : "undefined";
  const statusMessage = err
    ? `failed with error: ${err.message}`
    : "completed successfully";
  console.log(`Job ${jobId} ${statusMessage}`);
};

multipleFileWorker.on("completed", (job) => logJobStatus(job));
multipleFileWorker.on("failed", (job, err) => logJobStatus(job, err));
