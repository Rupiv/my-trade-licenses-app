export interface TradeMajor {
  tradeMajorID: number;
  tradeMajorCode: string;
  tradeMajorName?: string;
  tradeMajorNativeName?: string;
}

export interface TradeMinor {
  tradeMinorID: number;
  tradeMinorCode: number;
  tradeMinorCodeOld: string;
  tradeMinorName: string;
  tradeMinorNativeName: string;
  isActive: boolean;
  tradeMajorID: number;
  entryDate: Date;
}

export interface TradeSub {
  tradeSubID: number;
  tradeSubCode: string;
  tradeSubCodeOld: string;
  tradeSubName: string;
  tradeSubNativeName: string;
  isActive: boolean;
  tradeMinorID: number;
  entryDate: Date;
  blockPeriodID: number;
  modifiedFlag: string;
}

export interface TradeType {
    tradeTypeID: number;
    tradeTypeCode: string;
    tradeTypeName: string;
    isActive: boolean;
    entryDate: Date;
}

export interface MLCConstituency {
    mohID: number;
    mohCode: string;
    mohCodeOld: string;
    mohName: string;
    mohNativeName: string;
    mohShortName: string;
    zoneID: number;
    constituencyID: number;
    entryDate: Date;
    hoId: number;
    jcId: number;
    dhoId: number;
    adId: number;
    ddId: number;
    jdId: number;
}

export interface Ward {
    wardID : number;
    wardCode : number;
    wardName: string;
    wardNativeName: string;
    zoneID: number;
    constituencyID: number;
    entryDate: Date;
}

export interface TradeLicenseApplication {
  licenceApplicationID: number;
  newApplicationNumber: string;
  finanicalYearID: number;
  tradeTypeID: number;
  bescomRRNumber: string;
  gstNumber: string;
  panNumber: string;
  licenceFromDate: Date;
  licenceToDate: Date;
  licenceApplicationStatusID: number;
  currentStatus: number;
  tradeLicenceID: number;
  mohID: number;
  loginID: number;
  entryOriginLoginID: number;
  inspectingOfficerID: number;
  licenseType: string;
  applicantRepersenting: number;
  jathaStatus: string;
  docsSubmitted: boolean;
  challanNo: string;
  noOfYearsApplied: number;
}

export interface TradeLicenseApplicationDetails {
  applicantName: string;
  doorNumber: string;
  address1: string;
  address2: string;
  address3: string;
  pincode: string;
  landLineNumber: string;
  mobileNumber: string;
  emailID: string;
  tradeName: string;
  zonalClassificationID: number;
  mohID: number;
  wardID: number;
  propertyID: number;
  pidNumber: string;
  khathaNumber: string;
  surveyNumber: string;
  street: string;
  gisNumber: string;
  licenceNumber: string;
  licenceCommencementDate: Date;
  licenceStatusID: number;
  oldapplicationNumber: string;
  newlicenceNumber: string; 
}

export interface AssemblyConstituency {
  constituencyID: number;
  constituencyCode: string;
  constituencyName: string;
  constituencyNativeName: string;
  zoneID: number;
  entryDate: Date;
}

export interface Zones{
  zoneID: number;
  zoneCode: string;
  zoneCodeOld: string;
  zoneName: string;
  zoneNativeName: string;
  entryDate: Date;
}

export interface ZoneClassification{
  zonalClassificationID: number;
  zonalCode: string;
  zonalClassificationName: string;
  zonalClassificationNativeName: string;
  isActive: boolean;
}

export interface TradeLicensesFee{
  tradeFeeID: number;
  tradeSubID: number;
  tradeLicenceFee: number;
  tradeApproveAuth: string;
  isActive: boolean;
  blockPeriodID: number;
  remarks:string | null; 
}

export interface LicenseDocuments{
  ApplicationDocumentID: number;
  LicenceApplicationID: number;
  DocumentID: number;
  documentName: string;
  FileName: string;
  FilePath: string;
  FileExtension: string;
  FileSizeKB: number;
  EntryDate: string;
}

export interface RoadWidthDetails{
  roadType: string;
  road_Width_mtrs: string;
  roadCategory: string;
  roadCategoryCode: string;
}
