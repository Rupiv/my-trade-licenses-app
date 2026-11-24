/*
  Rollback for dbo.LicenceGeneratedAcknowledgement.Migration.sql

  WARNING: drops dbo.LicenceGeneratedAcknowledgement and every stored acknowledgement row, and the
  template columns on dbo.LicenceGeneratedCertificate. The generated PDF files on disk are NOT
  deleted. Back up the table first if any acknowledgements were stored:
    SELECT * INTO dbo.LicenceGeneratedAcknowledgement_Backup FROM dbo.LicenceGeneratedAcknowledgement;

  Restores usp_SaveGeneratedLicenceCertificate to its original definition
  (SqlScript/dbo.usp_GeneratedLicenceCertificate_CRUD.StoredProcedure.sql).
*/

SET XACT_ABORT ON;
GO

DROP PROCEDURE IF EXISTS dbo.usp_GetGeneratedLicenceDocuments;
DROP PROCEDURE IF EXISTS dbo.usp_SaveGeneratedLicenceAcknowledgement;
DROP PROCEDURE IF EXISTS dbo.usp_GetGeneratedLicenceAcknowledgementByApplicationId;
GO

DROP TABLE IF EXISTS dbo.LicenceGeneratedAcknowledgement;
GO

CREATE OR ALTER PROCEDURE dbo.usp_SaveGeneratedLicenceCertificate
(
  @LicenceApplicationID INT,
  @ApplicationNumber NVARCHAR(50),
  @FileName NVARCHAR(260),
  @FilePath NVARCHAR(1000),
  @ContentType NVARCHAR(100) = 'application/pdf',
  @FileSizeBytes BIGINT = NULL,
  @LoginID INT = NULL
)
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (SELECT 1 FROM dbo.LicenceGeneratedCertificate WHERE LicenceApplicationID = @LicenceApplicationID)
  BEGIN
    UPDATE dbo.LicenceGeneratedCertificate
    SET ApplicationNumber = @ApplicationNumber,
        FileName = @FileName,
        FilePath = @FilePath,
        ContentType = @ContentType,
        FileSizeBytes = @FileSizeBytes,
        ModifiedBy = @LoginID,
        ModifiedOn = SYSUTCDATETIME()
    WHERE LicenceApplicationID = @LicenceApplicationID;
  END
  ELSE
  BEGIN
    INSERT INTO dbo.LicenceGeneratedCertificate
      (LicenceApplicationID, ApplicationNumber, FileName, FilePath, ContentType, FileSizeBytes, CreatedBy)
    VALUES
      (@LicenceApplicationID, @ApplicationNumber, @FileName, @FilePath, @ContentType, @FileSizeBytes, @LoginID);
  END;

  SELECT LicenceApplicationID, ApplicationNumber, FileName, FilePath, ContentType, FileSizeBytes
  FROM dbo.LicenceGeneratedCertificate
  WHERE LicenceApplicationID = @LicenceApplicationID;
END;
GO

IF COL_LENGTH('dbo.LicenceGeneratedCertificate', 'CorporationCode') IS NOT NULL
  ALTER TABLE dbo.LicenceGeneratedCertificate DROP COLUMN CorporationCode;
GO
IF COL_LENGTH('dbo.LicenceGeneratedCertificate', 'CorporationID') IS NOT NULL
  ALTER TABLE dbo.LicenceGeneratedCertificate DROP COLUMN CorporationID;
GO
IF COL_LENGTH('dbo.LicenceGeneratedCertificate', 'TemplateIdentifier') IS NOT NULL
  ALTER TABLE dbo.LicenceGeneratedCertificate DROP COLUMN TemplateIdentifier;
GO
