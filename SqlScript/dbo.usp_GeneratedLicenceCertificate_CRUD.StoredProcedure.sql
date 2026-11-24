/*
  Purpose:
  1) Persist generated licence certificate file location against licenceApplicationID
  2) Allow user panel/API to fetch saved file location for download
*/

IF OBJECT_ID('dbo.LicenceGeneratedCertificate', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.LicenceGeneratedCertificate
  (
    LicenceGeneratedCertificateID INT IDENTITY(1,1) PRIMARY KEY,
    LicenceApplicationID INT NOT NULL UNIQUE,
    ApplicationNumber NVARCHAR(50) NOT NULL,
    FileName NVARCHAR(260) NOT NULL,
    FilePath NVARCHAR(1000) NOT NULL,
    ContentType NVARCHAR(100) NOT NULL CONSTRAINT DF_LGC_ContentType DEFAULT ('application/pdf'),
    FileSizeBytes BIGINT NULL,
    CreatedBy INT NULL,
    CreatedOn DATETIME2(0) NOT NULL CONSTRAINT DF_LGC_CreatedOn DEFAULT (SYSUTCDATETIME()),
    ModifiedBy INT NULL,
    ModifiedOn DATETIME2(0) NULL
  );
END;
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
    (
      LicenceApplicationID,
      ApplicationNumber,
      FileName,
      FilePath,
      ContentType,
      FileSizeBytes,
      CreatedBy
    )
    VALUES
    (
      @LicenceApplicationID,
      @ApplicationNumber,
      @FileName,
      @FilePath,
      @ContentType,
      @FileSizeBytes,
      @LoginID
    );
  END;

  SELECT
    LicenceApplicationID,
    ApplicationNumber,
    FileName,
    FilePath,
    ContentType,
    FileSizeBytes
  FROM dbo.LicenceGeneratedCertificate
  WHERE LicenceApplicationID = @LicenceApplicationID;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_GetGeneratedLicenceCertificateByApplicationId
(
  @LicenceApplicationID INT
)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP (1)
    LicenceApplicationID,
    ApplicationNumber,
    FileName,
    FilePath,
    ContentType,
    FileSizeBytes,
    CreatedOn,
    ModifiedOn
  FROM dbo.LicenceGeneratedCertificate
  WHERE LicenceApplicationID = @LicenceApplicationID;
END;
GO
