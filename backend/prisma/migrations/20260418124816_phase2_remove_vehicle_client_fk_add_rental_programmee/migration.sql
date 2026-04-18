/*
  Warnings:

  - You are about to drop the column `clientId` on the `Vehicle` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "RentalStatus" ADD VALUE 'PROGRAMMEE';

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_clientId_fkey";

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "clientId",
ADD COLUMN     "isNew" BOOLEAN NOT NULL DEFAULT false;
