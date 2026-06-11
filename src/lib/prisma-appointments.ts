import { prisma } from "@/lib/prisma";

type GenericModelDelegate = {
  create<T>(args: unknown): Promise<T>;
  update<T>(args: unknown): Promise<T>;
  findMany<T>(args: unknown): Promise<T[]>;
  findUnique<T>(args: unknown): Promise<T | null>;
  findFirst<T>(args: unknown): Promise<T | null>;
};

type PrismaWithAppointmentModels = typeof prisma & {
  appointment: GenericModelDelegate;
  workSession: GenericModelDelegate;
  order: GenericModelDelegate;
  customer: GenericModelDelegate;
};

export const prismaWithAppointmentModels =
  prisma as unknown as PrismaWithAppointmentModels;
