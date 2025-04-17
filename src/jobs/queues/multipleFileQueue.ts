import { Queue } from "bullmq";
import { redis } from "../../config/redis";

const multipleFileQueue = new Queue("multipleFileQueue", { connection: redis,});

export default multipleFileQueue;