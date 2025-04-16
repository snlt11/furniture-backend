declare namespace Express {
  export interface Request {
    user?: {
      id: number;
      phone: string;
    };
    userId?: number;
  }
}
