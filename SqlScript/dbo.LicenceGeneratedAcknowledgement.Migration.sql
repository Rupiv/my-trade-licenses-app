/*
  Migration: GBA corporation-specific certificate & payment acknowledgement storage
  Spec:      docs/gba-certificate-backend-spec.md
  Rollback:  SqlScript/dbo.LicenceGeneratedAcknowledgement.Rollback.sql

  1) dbo.LicenceGeneratedAcknowledgement - one stored payment acknowledgement PDF per submitted
     application, linked to the gateway-confirmed payment it acknowledges.
  2) dbo.LicenceGeneratedCertificate     - adds nullable TemplateIdentifier / CorporationID /
     CorporationCode so admins can see which design produced each certificate. Existing rows are
     untouched (NULL = legacy BBMP design).
  3) Procedures to save / read acknowledgements; usp_SaveGeneratedLicenceCertificate gains optional
     parameters (old callers keep working unchanged).

  Idempotent: safe to run more than once.

  NOTE: the payment table is not visible from the frontend repository. The API MUST verify the
  transaction against its payment table (status SUCCESS, same application, same amount) BEFORE
  calling usp_SaveGeneratedLicenceAcknowledgement. The procedure re-checks the status it is given
  and refuses anything other than SUCCESS as a second line of defence.
*/

SET XACT_ABORT ON;
GO

/* ---------------------------------------------------------------------------------------------
   1) Acknowledgement table
   ------------------------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.LicenceGeneratedAcknowledgement', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.LicenceGeneratedAcknowledgement
  (
    LicenceGeneratedAcknowledgementID INT IDENTITY(1,1) NOT NULL
      CONSTRAINT PK_LicenceGeneratedAcknowledgement PRIMARY KEY,
    LicenceApplicationID   INT            NOT NULL,   -- submitted application (Licence_Application)
    ApplicationNumber      NVARCHAR(50)   NOT NULL,
    CorporationID          INT            NULL,       -- GBA corporation master id
    CorporationCode        NVARCHAR(10)   NULL,       -- BCCC / BNCC / BSCC / BECC / BWCC
    TemplateIdentifier     NVARCHAR(50)   NOT NULL,   -- e.g. GBA-ACK-BSCC-V1
    PaymentTransactionID   NVARCHAR(100)  NOT NULL,   -- our txnid sent to the gateway
    PaymentReferenceNumber NVARCHAR(100)  NULL,       -- bank / gateway reference
    AmountPaid             DECIMAL(18,2)  NOT NULL,
    PaymentStatus          NVARCHAR(20)   NOT NULL,
    PaidOn                 DATETIME2(0)   NULL,
    AcknowledgementNumber  NVARCHAR(60)   NULL,       -- Licence_Application.AcknowledgementNumber when issued
    FileName               NVARCHAR(260)  NOT NULL,
    FilePath               NVARCHAR(1000) NOT NULL,
    ContentType            NVARCHAR(100)  NOT NULL
      CONSTRAINT DF_LGA_ContentType DEFAULT ('application/pdf'),
    FileSizeBytes          BIGINT         NULL,
    CreatedBy              INT            NULL,
    CreatedOn              DATETIME2(0)   NOT NULL
      CONSTRAINT DF_LGA_CreatedOn DEFAULT (SYSUTCDATETIME()),
    ModifiedBy             INT            NULL,
    ModifiedOn             DATETIME2(0)   NULL,

    -- One acknowledgement per application; regeneration updates the row.
    CONSTRAINT UQ_LGA_LicenceApplicationID UNIQUE (LicenceApplicationID),
    -- A payment can acknowledge only one application.
    CONSTRAINT UQ_LGA_PaymentTransactionID UNIQUE (PaymentTransactionID),
    -- Only gateway-confirmed payments can be acknowledged.
    CONSTRAINT CK_LGA_PaymentStatus CHECK (PaymentStatus = 'SUCCESS'),
    CONSTRAINT CK_LGA_AmountPaid CHECK (AmountPaid > 0)
  );

  CREATE UNIQUE INDEX UX_LGA_AcknowledgementNumber
    ON dbo.LicenceGeneratedAcknowledgement (AcknowledgementNumber)
    WHERE AcknowledgementNumber IS NOT NULL;

  CREATE INDEX IX_LGA_CorporationID_CreatedOn
    ON dbo.LicenceGeneratedAcknowledgement (CorporationID, CreatedOn);
END;
GO

/* Link each acknowledgement to its submitted application. The application table's name is not
   visible from the frontend repository, so the FK is added only when dbo.Licence_Application with a
   LicenceApplicationID column exists; otherwise a notice is printed and the DBA should add it. */
IF OBJECT_ID('dbo.FK_LGA_LicenceApplication', 'F') IS NULL
BEGIN
  IF OBJECT_ID('dbo.Licence_Application', 'U') IS NOT NULL
     AND COL_LENGTH('dbo.Licence_Application', 'LicenceApplicationID') IS NOT NULL
    ALTER TABLE dbo.LicenceGeneratedAcknowledgement WITH CHECK
      ADD CONSTRAINT FK_LGA_LicenceApplication
      FOREIGN KEY (LicenceApplicationID) REFERENCES dbo.Licence_Application (LicenceApplicationID);
  ELSE
    PRINT 'NOTICE: dbo.Licence_Application(LicenceApplicationID) not found - add FK_LGA_LicenceApplication manually.';
END;
GO

/* ---------------------------------------------------------------------------------------------
   2) Template / corporation columns on the existing certificate table (nullable = backward compatible)
   ------------------------------------------------------------------------------------------- */
IF COL_LENGTH('dbo.LicenceGeneratedCertificate', 'TemplateIdentifier') IS NULL
  ALTER TABLE dbo.LicenceGeneratedCertificate ADD TemplateIdentifier NVARCHAR(50) NULL;
GO
IF COL_LENGTH('dbo.LicenceGeneratedCertificate', 'CorporationID') IS NULL
  ALTER TABLE dbo.LicenceGeneratedCertificate ADD CorporationID INT NULL;
GO
IF COL_LENGTH('dbo.LicenceGeneratedCertificate', 'CorporationCode') IS NULL
  ALTER TABLE dbo.LicenceGeneratedCertificate ADD CorporationCode NVARCHAR(10) NULL;
GO

/* ---------------------------------------------------------------------------------------------
   3a) Certificate save: same contract as before + optional template columns
   ------------------------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.usp_SaveGeneratedLicenceCertificate
(
  @LicenceApplicationID INT,
  @ApplicationNumber NVARCHAR(50),
  @FileName NVARCHAR(260),
  @FilePath NVARCHAR(1000),
  @ContentType NVARCHAR(100) = 'application/pdf',
  @FileSizeBytes BIGINT = NULL,
  @LoginID INT = NULL,
  @TemplateIdentifier NVARCHAR(50) = NULL,
  @CorporationID INT = NULL,
  @CorporationCode NVARCHAR(10) = NULL
)
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (SELECT 1 FROM dbo.LicenceGeneratedCertificate WHERE LicenceApplicationID = @LicenceApplicationID)
  BEGIN
    UPDATE dbo.LicenceGeneratedCertificate
    SET ApplicationNumber  = @ApplicationNumber,
        FileName           = @FileName,
        FilePath           = @FilePath,
        ContentType        = @ContentType,
        FileSizeBytes      = @FileSizeBytes,
        TemplateIdentifier = COALESCE(@TemplateIdentifier, TemplateIdentifier),
        CorporationID      = COALESCE(@CorporationID, CorporationID),
        CorporationCode    = COALESCE(@CorporationCode, CorporationCode),
        ModifiedBy         = @LoginID,
        ModifiedOn         = SYSUTCDATETIME()
    WHERE LicenceApplicationID = @LicenceApplicationID;
  END
  ELSE
  BEGIN
    INSERT INTO dbo.LicenceGeneratedCertificate
      (LicenceApplicationID, ApplicationNumber, FileName, FilePath, ContentType, FileSizeBytes,
       TemplateIdentifier, CorporationID, CorporationCode, CreatedBy)
    VALUES
      (@LicenceApplicationID, @ApplicationNumber, @FileName, @FilePath, @ContentType, @FileSizeBytes,
       @TemplateIdentifier, @CorporationID, @CorporationCode, @LoginID);
  END;

  SELECT LicenceApplicationID, ApplicationNumber, FileName, FilePath, ContentType, FileSizeBytes,
         TemplateIdentifier, CorporationID, CorporationCode
  FROM dbo.LicenceGeneratedCertificate
  WHERE LicenceApplicationID = @LicenceApplicationID;
END;
GO

/* ---------------------------------------------------------------------------------------------
   3b) Acknowledgement save (insert or regenerate)
   ------------------------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.usp_SaveGeneratedLicenceAcknowledgement
(
  @LicenceApplicationID INT,
  @ApplicationNumber NVARCHAR(50),
  @CorporationID INT = NULL,
  @CorporationCode NVARCHAR(10) = NULL,
  @TemplateIdentifier NVARCHAR(50),
  @PaymentTransactionID NVARCHAR(100),
  @PaymentReferenceNumber NVARCHAR(100) = NULL,
  @AmountPaid DECIMAL(18,2),
  @PaymentStatus NVARCHAR(20),
  @PaidOn DATETIME2(0) = NULL,
  @AcknowledgementNumber NVARCHAR(60) = NULL,
  @FileName NVARCHAR(260),
  @FilePath NVARCHAR(1000),
  @ContentType NVARCHAR(100) = 'application/pdf',
  @FileSizeBytes BIGINT = NULL,
  @LoginID INT = NULL
)
AS
BEGIN
  SET NOCOUNT ON;

  IF UPPER(LTRIM(RTRIM(ISNULL(@PaymentStatus, '')))) <> 'SUCCESS'
    THROW 51001, 'Acknowledgement can only be stored for a SUCCESS payment.', 1;

  IF EXISTS (
    SELECT 1 FROM dbo.LicenceGeneratedAcknowledgement
    WHERE PaymentTransactionID = @PaymentTransactionID
      AND LicenceApplicationID <> @LicenceApplicationID
  )
    THROW 51002, 'This payment transaction is already acknowledged for another application.', 1;

  IF EXISTS (SELECT 1 FROM dbo.LicenceGeneratedAcknowledgement WHERE LicenceApplicationID = @LicenceApplicationID)
  BEGIN
    UPDATE dbo.LicenceGeneratedAcknowledgement
    SET ApplicationNumber      = @ApplicationNumber,
        CorporationID          = @CorporationID,
        CorporationCode        = @CorporationCode,
        TemplateIdentifier     = @TemplateIdentifier,
        PaymentTransactionID   = @PaymentTransactionID,
        PaymentReferenceNumber = @PaymentReferenceNumber,
        AmountPaid             = @AmountPaid,
        PaymentStatus          = 'SUCCESS',
        PaidOn                 = @PaidOn,
        AcknowledgementNumber  = COALESCE(@AcknowledgementNumber, AcknowledgementNumber),
        FileName               = @FileName,
        FilePath               = @FilePath,
        ContentType            = @ContentType,
        FileSizeBytes          = @FileSizeBytes,
        ModifiedBy             = @LoginID,
        ModifiedOn             = SYSUTCDATETIME()
    WHERE LicenceApplicationID = @LicenceApplicationID;
  END
  ELSE
  BEGIN
    INSERT INTO dbo.LicenceGeneratedAcknowledgement
      (LicenceApplicationID, ApplicationNumber, CorporationID, CorporationCode, TemplateIdentifier,
       PaymentTransactionID, PaymentReferenceNumber, AmountPaid, PaymentStatus, PaidOn,
       AcknowledgementNumber, FileName, FilePath, ContentType, FileSizeBytes, CreatedBy)
    VALUES
      (@LicenceApplicationID, @ApplicationNumber, @CorporationID, @CorporationCode, @TemplateIdentifier,
       @PaymentTransactionID, @PaymentReferenceNumber, @AmountPaid, 'SUCCESS', @PaidOn,
       @AcknowledgementNumber, @FileName, @FilePath, @ContentType, @FileSizeBytes, @LoginID);
  END;

  EXEC dbo.usp_GetGeneratedLicenceAcknowledgementByApplicationId @LicenceApplicationID = @LicenceApplicationID;
END;
GO

/* ---------------------------------------------------------------------------------------------
   3c) Acknowledgement read (download / status)
   ------------------------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.usp_GetGeneratedLicenceAcknowledgementByApplicationId
(
  @LicenceApplicationID INT
)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP (1)
    LicenceGeneratedAcknowledgementID, LicenceApplicationID, ApplicationNumber, CorporationID,
    CorporationCode, TemplateIdentifier, PaymentTransactionID, PaymentReferenceNumber, AmountPaid,
    PaymentStatus, PaidOn, AcknowledgementNumber, FileName, FilePath, ContentType, FileSizeBytes,
    CreatedOn, ModifiedOn
  FROM dbo.LicenceGeneratedAcknowledgement
  WHERE LicenceApplicationID = @LicenceApplicationID;
END;
GO

/* ---------------------------------------------------------------------------------------------
   3d) Admin monitoring: generated documents across corporations
   ------------------------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.usp_GetGeneratedLicenceDocuments
(
  @CorporationID INT = NULL,
  @FromDate DATE = NULL,
  @ToDate DATE = NULL
)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT 'CERTIFICATE' AS DocumentType, c.LicenceApplicationID, c.ApplicationNumber, c.CorporationID,
         c.CorporationCode, c.TemplateIdentifier, NULL AS PaymentTransactionID, NULL AS AmountPaid,
         c.FileName, COALESCE(c.ModifiedOn, c.CreatedOn) AS GeneratedOn
  FROM dbo.LicenceGeneratedCertificate c
  WHERE (@CorporationID IS NULL OR c.CorporationID = @CorporationID)
    AND (@FromDate IS NULL OR c.CreatedOn >= @FromDate)
    AND (@ToDate IS NULL OR c.CreatedOn < DATEADD(DAY, 1, @ToDate))
  UNION ALL
  SELECT 'ACKNOWLEDGEMENT', a.LicenceApplicationID, a.ApplicationNumber, a.CorporationID,
         a.CorporationCode, a.TemplateIdentifier, a.PaymentTransactionID, a.AmountPaid,
         a.FileName, COALESCE(a.ModifiedOn, a.CreatedOn)
  FROM dbo.LicenceGeneratedAcknowledgement a
  WHERE (@CorporationID IS NULL OR a.CorporationID = @CorporationID)
    AND (@FromDate IS NULL OR a.CreatedOn >= @FromDate)
    AND (@ToDate IS NULL OR a.CreatedOn < DATEADD(DAY, 1, @ToDate))
  ORDER BY GeneratedOn DESC;
END;
GO
