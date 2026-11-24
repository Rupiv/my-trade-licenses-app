# GBA corporation certificates & payment acknowledgements: backend specification

Audience: backend (.NET API / SQL) developers. The frontend part is implemented in this repository;
everything in this document must be built in the backend before the feature is complete.

## 1. What is done vs. what is needed

| Area | Frontend (this repo) | Backend (this spec) |
|---|---|---|
| 5 corporation designs (cert = PDF page 1, ack = PDF page 2) | Done: `core/config/corporation-templates.config.ts`, `gba-certificate`, `gba-acknowledgement`; logo, seals and watermark extracted from `docs/templates/*.pdf` into `public/templates/gba/`; layout measured from the PDFs (see §9) | – |
| Choosing GBA vs legacy BBMP design | Done: GBA only when the approved-certificate API returns a configured `corporationName` | Keep returning `corporationName` only for confirmed GBA licences (§3.1) |
| Certificate auto-save on officer view | Done (existing flow), now also sends `templateIdentifier`, `corporationID`, `corporationCode` | Persist the 3 new fields (§3.2) |
| Acknowledgement view / print / download | Done: `<section>/licence-acknowledgement/:id`, rendered only after a SUCCESS payment + submission | – |
| Acknowledgement storage & server-side download | **Not done** (no endpoint exists) | §4 |
| Fields printed blank today | Mapper reads the fields named in §3.1 once they exist | §3.1, §6 |
| Corporation licence numbering | – | §5 |
| Admin monitoring across corporations | – | §4.4 |
| Trader access to the acknowledgement from Track Application | Calls `licence-application-view/submitted/{id}` | Allow traders to read **their own** submitted application (§7) |

SQL: `SqlScript/dbo.LicenceGeneratedAcknowledgement.Migration.sql` (rollback: `…Rollback.sql`).
Neither script has been run against a database yet.

## 2. Corporation master

The frontend matches a corporation by **name**, then attaches the `corporationID` from
`GET /api/gba/corporations`. It accepts `Central`, `North`, `South`, `East`, `West`, the codes
`BCCC/BNCC/BSCC/BECC/BWCC`, or `Bengaluru <Name> City Corporation` (case-insensitive).

Required:
1. Confirm the `corporationName` values in the master match one of those forms. If they differ,
   change only `corporationName` in `corporation-templates.config.ts`.
2. Recommended: add a `CorporationCode NVARCHAR(10)` column to the corporation master and return
   it from `/gba/corporations`, so numbering (§5) and templates key off the same code.

## 3. Changes to the existing certificate APIs

### 3.1 `GET /api/licence/certificate/approved/{applicationNumber}`: add fields

Existing fields are unchanged. Add the following (camelCase JSON; `null` when unknown). The
frontend already reads these exact names and prints a blank cell until they are returned.

| JSON field | Type | Printed as | Source / notes |
|---|---|---|---|
| `corporationName` | string\|null | selects the template | Existing. Must be set for every GBA licence, null for pre-GBA |
| `gstNumber` | string\|null | GST No. | Captured on the New Licence form and already returned by `licence-application-view` as `GSTNumber`; the frontend prints that today. Returning it here as well makes the certificate API self-contained |
| `epidKhathaNumber` | string\|null | EPID Khatha No | Property eKhata EPID. `khathaNumber`/`PIDNumber` exist on the trade licence, but confirm they are the EPID before mapping |
| `noOfYearsOpted` | int\|null | No of Years Opted | `Licence_Application.NoOfYearsApplied`. Frontend currently falls back to `GET /licence-application/{id}` for this |
| `licenceIssuedOn` | datetime\|null | Issued Date + Time | Timestamp of the final approval. Without it the date falls back to `licenceFromDate` and **Time is blank** |
| `nextRenewalDate` | date\|null | Next Renewal Date | Business rule needed. Fallback today: valid-up-to date (same rule as the BBMP certificate's "renew before") |
| `qrCodeDataUrl` | string\|null | QR code | `data:image/png;base64,…` encoding a public verification URL (§3.3). The QR block and its "Scan this QR…" line are hidden while null |
| `premisesPhotoUrl` | string\|null | Photograph box | URL the browser can load with the user's token, or a data URL. Must be CORS-readable for PDF capture |

Already available and used (no change needed): licence/application numbers, applicant, trade name and
address, major/minor/sub trade, receipt no/date, amount/fee, valid-up-to, and (via
`licence-application-view/submitted/{id}`) zone (= Division), ward no/name, latitude, longitude,
road width, road category.

### 3.2 `POST /api/licence/certificate/generated/save`: accept 3 optional fields

```json
{
  "licenceApplicationID": 123,
  "applicationNumber": "BSCC/JAY/N/APP/2026-27/00001",
  "fileName": "Licence_BSCC_JAY_N_APP_2026-27_00001.pdf",
  "contentType": "application/pdf",
  "fileContentBase64": "…",
  "templateIdentifier": "GBA-CERT-BSCC-V1",
  "corporationID": 3,
  "corporationCode": "BSCC"
}
```

`templateIdentifier`/`corporationID`/`corporationCode` are `null` for legacy BBMP certificates. Pass
them to `usp_SaveGeneratedLicenceCertificate` (new optional parameters). The endpoint must keep
rejecting saves for applications that are not APPROVED.

### 3.3 Public verification endpoint (needed for the QR code)

`GET /api/licence/verify/{licenceNumber}` (anonymous): returns licence number, trade name,
corporation, status and valid-up-to. **No personal data.** Rate-limit it. The QR encodes this URL.

## 4. Acknowledgement APIs (new)

All under `/api/licence/acknowledgement`. Authorisation as in §7.

### 4.1 `POST /generated/save`
Called by the frontend after rendering the acknowledgement (same pattern as the certificate auto-save).

```json
{
  "licenceApplicationID": 123,
  "applicationNumber": "BSCC/JAY/N/APP/2026-27/00001",
  "paymentTransactionID": "TXN123",
  "templateIdentifier": "GBA-ACK-BSCC-V1",
  "corporationID": 3,
  "corporationCode": "BSCC",
  "fileName": "Acknowledgement_BSCC_JAY_N_APP_2026-27_00001.pdf",
  "contentType": "application/pdf",
  "fileContentBase64": "…"
}
```

Server-side verification, **all required, in this order**. Reject with 409/422 otherwise:
1. The application exists, is submitted (`Licence_Application` row) and is not in "awaiting submission".
2. `paymentTransactionID` exists in the payment table **for this application** with status `SUCCESS`
   as recorded from the gateway callback / decrypt step. Never trust a status sent by the client.
3. Take `AmountPaid`, `PaidOn`, `PaymentReferenceNumber` (bank ref) **from the payment table**, not the request.
4. `corporationID` matches the application's GBA corporation.
5. Take `AcknowledgementNumber` from `Licence_Application.AcknowledgementNumber` if issued.

Then store the file (same storage as certificates) and call `usp_SaveGeneratedLicenceAcknowledgement`.
Regeneration overwrites the same row (one per application). The procedure itself also refuses non-SUCCESS
statuses and a transaction reused across applications.

Response: the stored row (`usp_GetGeneratedLicenceAcknowledgementByApplicationId` columns).

### 4.2 `GET /generated/{licenceApplicationID}`
Metadata of the stored acknowledgement; 404 if none.

### 4.3 `GET /generated/{licenceApplicationID}/download`
The stored PDF (`application/pdf`, `Content-Disposition: attachment`); 404 if none.

### 4.4 `GET /generated-documents?corporationId=&fromDate=&toDate=` (admin only)
Wraps `usp_GetGeneratedLicenceDocuments`: certificates and acknowledgements across corporations with
their template identifiers, for monitoring that each corporation uses its own design.

### 4.5 Frontend follow-up once §4 exists
- Add an auto-save in `pages/licence-acknowledgement` (mirror `LicenceCertificate.saveGeneratedCertificate`).
- Point the Track Application "Download Acknowledgement" button at `/generated/{id}/download`, falling
  back to the rendered page when nothing is stored.

## 5. Corporation-specific licence numbering

Format from the reference PDFs:

| Number | Format | Example |
|---|---|---|
| Application No | `{CORP}/{ZONE}/{TYPE}/APP/{FY}/{SEQ5}` | `BSCC/JAY/N/APP/2026-27/00001` |
| Licence No | `{CORP}/{ZONE}/{FY}/{SEQ5}` | `BSCC/JAY/2026-27/00001` |

- `{CORP}`: corporation code (§2). `{ZONE}`: 3-letter zone code (JAY, MAH, MAL, SHI, YEL in the
  samples). Needs a `ZoneCode` column on the GBA zone master; **codes for the other zones must be
  supplied by GBA, not derived**.
- `{TYPE}`: `N` in all samples, presumably New. Confirm the code for renewals.
- `{FY}`: financial year of submission (application) / approval (licence), `YYYY-YY`.
- `{SEQ5}`: zero-padded, **per corporation + zone + FY** (confirm scope with GBA).
- Generate inside the approval / submission transaction from a counter table locked with
  `UPDLOCK, HOLDLOCK` (or one SQL `SEQUENCE` per scope) and protect with a unique index on the number
  column, so concurrent approvals can't produce duplicates.
- Never renumber existing licences. Legacy (BBMP) numbers stay as they are.
- The sample PDFs print `…/SJN/…` in the body but `…/JAY/…` (etc.) in the header. That is a template
  error; the frontend prints the real licence number in both places.

## 6. Payment fields required in responses

`GET /licence-application-view/{id}` and `/submitted/{id}` already return `payments[]` with `txnId`,
`amount`, `status`, `paidOn`, `bankRefNo`, `gatewayTxnId`. Requirements:
- `status` must be the gateway-verified status (`SUCCESS`, `FAILED`, `PENDING`/`INITIATED`, …); the
  acknowledgement is shown only for `SUCCESS`.
- `paidOn` should be the gateway confirmation time (used to pick the latest successful payment).
- `final.applicationSubmitDate` must carry the **time** (printed as "Date and Time of Submission").
- `gba` (corporation, zone, ward no, ward name) must be populated for every GBA application.

## 7. Authorisation

- Traders: may read only their **own** applications, certificates and acknowledgements. Track
  Application opens `licence-application-view/submitted/{id}` for the trader, which today is used only
  by officer screens; allow it for the owning trader (or the acknowledgement page shows
  "Unable to load the application details").
- Officers (approver / senior / zone approver): applications in their assigned GBA corporation/wards only.
- Admin: all corporations, including §4.4.
- Enforce all of the above in the API; the frontend route guards are not a security boundary.

## 8. Missing data summary

| Field | Status | Needed |
|---|---|---|
| GST No. | Captured (`GSTNumber` in the application view) and printed | Optional: also return from the certificate API (§3.1) |
| EPID Khatha No | `khathaNumber` / `PIDNumber` are captured, but it is unconfirmed whether either is the eKhata EPID; printed blank | Business confirmation, then §3.1 |
| Issue time | Not returned | Approval timestamp, §3.1 |
| Next renewal date | No rule | Business rule, §3.1 |
| QR code | Not generated | §3.3 + §3.1 |
| Premises photo | Not captured | Upload at application/inspection + §3.1 |
| Zone code | Not in master | §5 |
| Corporation code | Not in master | §2 |

## 9. Validation status (frontend, 2026-11-24)

Done against a **local mock API** (test fixtures only, not in the repository), Chrome 158 on Windows
with Calibri. Nothing below has been run against the real backend or database.

| Check | Result |
|---|---|
| 5 certificates + 5 acknowledgements render with the corporation's seal, name and template id | Pass |
| Generated PDFs | 1 page each, 595.3 x 841.9 pt (A4) |
| Table / border rules vs reference PDF | within 1 pt |
| Text baselines vs reference PDF | within 0.75 pt (photo caption 1.1 pt) |
| Officer auto-save stores the corporation design, tagged with its template id | Pass |
| Legacy (no GBA corporation) licence keeps the BBMP certificate | Pass |
| Acknowledgement blocked for FAILED / PENDING / CANCELLED payments and for paid-but-not-submitted | Pass |
| Certificate unavailable until APPROVED | Pass on the UI side; the backend must also refuse (it filters `approved/{appNo}`) |

Known differences from the reference PDFs (intentional or renderer limits):
- Real licence number in the body (the PDFs print `…/SJN/…`), ward label always "Ward No & Name".
- The sample QR code in the PDFs is not reproduced; the QR block is hidden until `qrCodeDataUrl` exists.
- West page 1 in the reference does not right-align the ward text; the app right-aligns it for all.
- The 0.48 pt acknowledgement table rules render about 1 device pixel wide (html2canvas limit).
- Downloaded/saved PDFs are images of the page (html2canvas), so the text is not selectable.
