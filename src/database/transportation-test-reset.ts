import { type PrismaService } from './prisma.service';

export async function resetTransportationData(prisma: PrismaService): Promise<void> {
  await prisma.transportationStatusHistory.deleteMany();
  await prisma.transportationRegistryEntry.deleteMany();

  await prisma.driverProfile.updateMany({ data: { currentDriverLicenseRecordId: null } });
  await prisma.vehicleRecord.updateMany({
    data: { currentRegistrationId: null, currentOwnershipRecordId: null },
  });

  await prisma.driverLicenseRecord.updateMany({ data: { renewalOfLicenseId: null } });

  await prisma.driverLicenseClass.deleteMany();
  await prisma.driverLicenseEndorsement.deleteMany();
  await prisma.driverLicenseApplicationProfile.deleteMany();
  await prisma.driverLicenseRecord.deleteMany();
  await prisma.driverTestRecord.deleteMany();
  await prisma.driverMedicalRequirementReference.deleteMany();
  await prisma.driverQualification.deleteMany();

  await prisma.vehicleOwnershipHistory.deleteMany();
  await prisma.vehicleTransfer.deleteMany();
  await prisma.vehicleInspection.deleteMany();
  await prisma.vehicleRoadworthinessRecord.deleteMany();
  await prisma.vehicleRestriction.deleteMany();
  await prisma.vehicleComplianceRecord.deleteMany();
  await prisma.commercialVehiclePermit.deleteMany();
  await prisma.fleetVehicle.deleteMany();
  await prisma.transportPermit.deleteMany();
  await prisma.transportOperatorLicense.deleteMany();
  await prisma.vehicleOwnershipRecord.deleteMany();
  await prisma.vehicleRegistration.deleteMany();
  await prisma.vehicleIdentifier.deleteMany();
  await prisma.vehicleRecord.deleteMany();
  await prisma.fleetRecord.deleteMany();
  await prisma.transportOperatorRecord.deleteMany();
  await prisma.driverProfile.deleteMany();
}
