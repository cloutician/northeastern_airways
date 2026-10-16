export type JwtPayload = {
  userId: number;
  role: string;
  email: string;
  firstName?: string | null;
  personnelType?: string | null;
};
