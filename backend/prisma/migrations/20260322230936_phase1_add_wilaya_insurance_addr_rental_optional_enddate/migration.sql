-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "wilaya" TEXT;

-- AlterTable
ALTER TABLE "Garage" ADD COLUMN     "wilaya" TEXT;

-- AlterTable
ALTER TABLE "InsurancePolicy" ADD COLUMN     "adresseAgence" TEXT;

-- AlterTable
ALTER TABLE "Rental" ALTER COLUMN "dateFinPrevue" DROP NOT NULL;
