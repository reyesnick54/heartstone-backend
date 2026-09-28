import { type PrismaService } from './prisma.service';

export async function resetAbsezS18fData(prisma: PrismaService): Promise<void> {
  await prisma.investorInquiryStatusHistory.deleteMany();
  await prisma.investorCaseManagerAssignment.deleteMany();
  await prisma.investorInquiryCaseLink.deleteMany();
  await prisma.investorInquiryRecord.deleteMany();
  await prisma.investorRelationsProfile.deleteMany();
  await prisma.zoneLandOccupancyUseRelationship.deleteMany();
  await prisma.zoneLandConcessionRecord.deleteMany();
  await prisma.zoneLandLeaseRecord.deleteMany();
  await prisma.investorResidencyDueDiligenceReference.deleteMany();
  await prisma.investorResidencyProgramApplication.deleteMany();
  await prisma.immigrationProgramConfiguration.deleteMany();
  await prisma.freeZoneCustomsExternalDetermination.deleteMany();
  await prisma.freeZonePortCustomsCoordination.deleteMany();
  await prisma.freeZoneDutyReliefRequest.deleteMany();
  await prisma.freeZoneBondedWarehouseLink.deleteMany();
  await prisma.freeZoneCustomsCase.deleteMany();
  await prisma.bondedWarehouseReference.deleteMany();
  await prisma.absezArticle9ServicePathState.deleteMany();
}
