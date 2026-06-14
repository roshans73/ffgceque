-- ============================================================
-- CEQUE Teacher Learning Circles (TLC)
-- Relational Database Schema – MS SQL Server
-- ============================================================
-- Covers all masters, transactional tables, planning, targets,
-- attendance, and access control as per the URD.
-- ============================================================

USE master;
GO

-- ============================================================
-- 1. LOOKUP / REFERENCE TABLES
-- ============================================================

-- District reference table.
-- DistrictCode is the 2-letter shortform used in TLCGroupCode (XXnn-YY).
CREATE TABLE District (
    DistrictID      INT              NOT NULL IDENTITY(1,1),
    DistrictCode    CHAR(2)          NOT NULL,   -- e.g. 'PU', 'NA' – drives TLCGroupCode prefix
    DistrictName    NVARCHAR(100)    NOT NULL,
    CreatedAt       DATETIME2(0)     NOT NULL CONSTRAINT DF_District_CreatedAt  DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(0)     NOT NULL CONSTRAINT DF_District_UpdatedAt  DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_District          PRIMARY KEY (DistrictID),
    CONSTRAINT UQ_District_Code     UNIQUE      (DistrictCode),
    CONSTRAINT UQ_District_Name     UNIQUE      (DistrictName),
    CONSTRAINT CK_District_Code     CHECK       (DistrictCode = UPPER(DistrictCode))
);

-- Block reference table.  Each block belongs to exactly one district.
CREATE TABLE Block (
    BlockID         INT              NOT NULL IDENTITY(1,1),
    DistrictID      INT              NOT NULL,
    BlockName       NVARCHAR(100)    NOT NULL,
    CreatedAt       DATETIME2(0)     NOT NULL CONSTRAINT DF_Block_CreatedAt  DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(0)     NOT NULL CONSTRAINT DF_Block_UpdatedAt  DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Block             PRIMARY KEY (BlockID),
    CONSTRAINT FK_Block_District    FOREIGN KEY (DistrictID) REFERENCES District(DistrictID),
    CONSTRAINT UQ_Block_DistName    UNIQUE (DistrictID, BlockName)
);
CREATE INDEX IX_Block_DistrictID   ON Block (DistrictID);

-- ============================================================
-- 2. USER ROLES AND ACCESS CONTROL
-- ============================================================

-- Roles defined in URD Section 8.
-- Four roles:
--   'CEO'              -> View only
--   'SustainabilityLead' -> Edit TLC & Masterclass master (Masterclass only) + View
--   'TechMETeam'       -> Full edit on all
--   'TLCManager'       -> Data entry for TLC / Masterclass attendance + View
CREATE TABLE UserRole (
    RoleID                  INT          NOT NULL IDENTITY(1,1),
    RoleName                VARCHAR(30)  NOT NULL,  -- short identifier
    RoleDescription         NVARCHAR(200) NOT NULL,
    CanViewReports          BIT          NOT NULL CONSTRAINT DF_UserRole_ViewReports    DEFAULT 1,
    CanEditAllMasters       BIT          NOT NULL CONSTRAINT DF_UserRole_EditMasters    DEFAULT 0,
    CanCreateMasterclass    BIT          NOT NULL CONSTRAINT DF_UserRole_CreateMC       DEFAULT 0,
    CanEnterAttendance      BIT          NOT NULL CONSTRAINT DF_UserRole_EnterAtt       DEFAULT 0,
    CONSTRAINT PK_UserRole          PRIMARY KEY (RoleID),
    CONSTRAINT UQ_UserRole_Name     UNIQUE (RoleName)
);

-- Pre-populate roles (run after CREATE TABLE statements)
-- INSERT INTO UserRole (RoleName, RoleDescription, CanViewReports, CanEditAllMasters, CanCreateMasterclass, CanEnterAttendance)
-- VALUES
--   ('CEO',               'CEO, Senior Management, Communications – view only',    1,0,0,0),
--   ('SustainabilityLead','Sustainability Lead – create Masterclass records + view',1,0,1,0),
--   ('TechMETeam',        'Tech/M&E Team – full edit access on all functions',      1,1,1,1),
--   ('TLCManager',        'TLC Manager – data entry of TLC/Masterclass attendance', 1,0,0,1);

CREATE TABLE AppUser (
    UserID          INT              NOT NULL IDENTITY(1,1),
    Username        VARCHAR(50)      NOT NULL,
    PasswordHash    VARCHAR(256)     NOT NULL,
    FullName        NVARCHAR(100)    NOT NULL,
    Email           VARCHAR(150)     NOT NULL,
    RoleID          INT              NOT NULL,
    -- NULL DistrictID = access to all districts (e.g. CEO, Tech/M&E Team)
    DistrictID      INT              NULL,
    IsActive        BIT              NOT NULL CONSTRAINT DF_AppUser_IsActive  DEFAULT 1,
    LastLoginAt     DATETIME2(0)     NULL,
    CreatedAt       DATETIME2(0)     NOT NULL CONSTRAINT DF_AppUser_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(0)     NOT NULL CONSTRAINT DF_AppUser_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_AppUser           PRIMARY KEY (UserID),
    CONSTRAINT UQ_AppUser_Username  UNIQUE (Username),
    CONSTRAINT UQ_AppUser_Email     UNIQUE (Email),
    CONSTRAINT FK_AppUser_Role      FOREIGN KEY (RoleID)     REFERENCES UserRole(RoleID),
    CONSTRAINT FK_AppUser_District  FOREIGN KEY (DistrictID) REFERENCES District(DistrictID)
);
CREATE INDEX IX_AppUser_RoleID     ON AppUser (RoleID);
CREATE INDEX IX_AppUser_DistrictID ON AppUser (DistrictID);

-- ============================================================
-- 3. COACH MASTER
-- ============================================================

-- Active coaches who work across district/block assignments.
-- Coaches can refer teachers to TLC groups.
CREATE TABLE Coach (
    CoachID         INT              NOT NULL IDENTITY(1,1),
    CoachEmpNo      VARCHAR(20)      NOT NULL,
    CoachName       NVARCHAR(100)    NOT NULL,
    DistrictID      INT              NOT NULL,
    BlockID         INT              NOT NULL,
    IsActive        BIT              NOT NULL CONSTRAINT DF_Coach_IsActive  DEFAULT 1,
    CreatedAt       DATETIME2(0)     NOT NULL CONSTRAINT DF_Coach_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(0)     NOT NULL CONSTRAINT DF_Coach_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Coach             PRIMARY KEY (CoachID),
    CONSTRAINT UQ_Coach_EmpNo       UNIQUE (CoachEmpNo),
    CONSTRAINT FK_Coach_District    FOREIGN KEY (DistrictID) REFERENCES District(DistrictID),
    CONSTRAINT FK_Coach_Block       FOREIGN KEY (BlockID)    REFERENCES Block(BlockID)
);
CREATE INDEX IX_Coach_DistrictID   ON Coach (DistrictID);
CREATE INDEX IX_Coach_BlockID      ON Coach (BlockID);

-- ============================================================
-- 4. CODE SEQUENCE COUNTER
-- ============================================================

-- Tracks running serial numbers for system-generated codes.
-- Keys:
--   'Teacher'     -> TeacherCode  Tnnnn  (4-digit serial, e.g. T0001)
--   'Masterclass' -> Masterclass Code  MSnnn  (3-digit serial, e.g. MS001)
--   'TLCMeet_<TLCGroupCode>' -> per-group TLC meet sequence
CREATE TABLE CodeSequence (
    SequenceKey     VARCHAR(20)    NOT NULL,
    CurrentSeq      INT            NOT NULL CONSTRAINT DF_CodeSeq_Current DEFAULT 0,
    CONSTRAINT PK_CodeSequence     PRIMARY KEY (SequenceKey),
    CONSTRAINT CK_CodeSeq_Value    CHECK (CurrentSeq >= 0)
);

-- ============================================================
-- 5. TEACHER MASTER  (TLC Members Master / Registered Teacher Master)
-- ============================================================

-- Central teacher registry.  TeacherCode is system-generated in format Tnnnn.
-- A teacher's DistrictID/BlockID reflects where they were first registered,
-- which may differ from the TLC group they join.
CREATE TABLE Teacher (
    TeacherID           INT              NOT NULL IDENTITY(1,1),
    TeacherCode         VARCHAR(6)       NOT NULL,    -- system-generated: Tnnnn (e.g. T0001)
    TeacherName         NVARCHAR(100)    NOT NULL,
    School              NVARCHAR(200)    NOT NULL,
    Gender              CHAR(1)          NOT NULL,    -- 'M' or 'F'
    MobileNo            VARCHAR(15)      NULL,
    Email               VARCHAR(150)     NULL,
    IsTIPTeacher        BIT              NOT NULL CONSTRAINT DF_Teacher_IsTIP  DEFAULT 0,
    YearsInTIP          TINYINT          NULL,        -- populated only when IsTIPTeacher = 1
    ReferredByCoachID   INT              NULL,
    DistrictID          INT              NOT NULL,
    BlockID             INT              NOT NULL,
    -- Primary TLC group the teacher belongs to.
    -- NULL on first registration (walk-in); populated once the teacher is assigned to a group.
    -- FK to TLCGroup added via ALTER TABLE below (TLCGroup is defined after Teacher).
    TLCGroupID          INT              NULL,
    RegistrationDate    DATE             NOT NULL,    -- date first registered (= first TLC attended)
    CreatedAt           DATETIME2(0)     NOT NULL CONSTRAINT DF_Teacher_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2(0)     NOT NULL CONSTRAINT DF_Teacher_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Teacher               PRIMARY KEY (TeacherID),
    CONSTRAINT UQ_Teacher_Code          UNIQUE (TeacherCode),
    CONSTRAINT FK_Teacher_District      FOREIGN KEY (DistrictID)         REFERENCES District(DistrictID),
    CONSTRAINT FK_Teacher_Block         FOREIGN KEY (BlockID)            REFERENCES Block(BlockID),
    CONSTRAINT FK_Teacher_Coach         FOREIGN KEY (ReferredByCoachID)  REFERENCES Coach(CoachID),
    CONSTRAINT CK_Teacher_Gender        CHECK (Gender IN ('M','F')),
    -- YearsInTIP must be NULL when IsTIPTeacher = 0
    CONSTRAINT CK_Teacher_TIPYears      CHECK (IsTIPTeacher = 1 OR YearsInTIP IS NULL),
    CONSTRAINT CK_Teacher_TIPYearsPos   CHECK (YearsInTIP IS NULL OR YearsInTIP >= 1)
);
CREATE INDEX IX_Teacher_DistrictID          ON Teacher (DistrictID);
CREATE INDEX IX_Teacher_BlockID             ON Teacher (BlockID);
CREATE INDEX IX_Teacher_ReferredByCoachID   ON Teacher (ReferredByCoachID);
CREATE INDEX IX_Teacher_IsTIPTeacher        ON Teacher (IsTIPTeacher);      -- for TIP vs non-TIP reports
CREATE INDEX IX_Teacher_RegistrationDate    ON Teacher (RegistrationDate);

-- ============================================================
-- 6. TLC GROUP MASTER
-- ============================================================

-- TLCGroupCode format: XXnn-YY
--   XX  = DistrictCode (2-letter)
--   nn  = DistrictSerial (running number within district, zero-padded to 2 digits)
--   YY  = GroupShortForm (2-letter group identifier)
-- Example: PU03-SH
CREATE TABLE TLCGroup (
    TLCGroupID          INT              NOT NULL IDENTITY(1,1),
    TLCGroupCode        VARCHAR(10)      NOT NULL,    -- computed & stored: XXnn-YY
    DistrictID          INT              NOT NULL,
    BlockID             INT              NOT NULL,
    GroupShortForm      CHAR(2)          NOT NULL,    -- YY component (upper-case)
    DistrictSerial      SMALLINT         NOT NULL,    -- nn component (1-99)
    Location            NVARCHAR(200)    NOT NULL,
    DateFormed          DATE             NOT NULL,
    -- Current active teacher leader for this group.
    -- NULL on group creation; set once a TeacherLeader record is assigned.
    -- FK to TeacherLeader added via ALTER TABLE below (TeacherLeader is defined after TLCGroup).
    TeacherLeaderID     INT              NULL,
    IsActive            BIT              NOT NULL CONSTRAINT DF_TLCGroup_IsActive  DEFAULT 1,
    CreatedAt           DATETIME2(0)     NOT NULL CONSTRAINT DF_TLCGroup_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2(0)     NOT NULL CONSTRAINT DF_TLCGroup_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TLCGroup              PRIMARY KEY (TLCGroupID),
    CONSTRAINT UQ_TLCGroup_Code         UNIQUE (TLCGroupCode),
    CONSTRAINT FK_TLCGroup_District     FOREIGN KEY (DistrictID) REFERENCES District(DistrictID),
    CONSTRAINT FK_TLCGroup_Block        FOREIGN KEY (BlockID)    REFERENCES Block(BlockID),
    CONSTRAINT CK_TLCGroup_ShortForm    CHECK (GroupShortForm = UPPER(GroupShortForm)),
    CONSTRAINT CK_TLCGroup_Serial       CHECK (DistrictSerial BETWEEN 1 AND 99)
);
CREATE INDEX IX_TLCGroup_DistrictID    ON TLCGroup (DistrictID);
CREATE INDEX IX_TLCGroup_BlockID       ON TLCGroup (BlockID);
CREATE INDEX IX_TLCGroup_IsActive      ON TLCGroup (IsActive);

-- FK from Teacher.TLCGroupID → TLCGroup deferred here to avoid forward-reference.
ALTER TABLE Teacher
    ADD CONSTRAINT FK_Teacher_TLCGroup FOREIGN KEY (TLCGroupID) REFERENCES TLCGroup(TLCGroupID);
CREATE INDEX IX_Teacher_TLCGroupID ON Teacher (TLCGroupID);

-- ============================================================
-- 7. TEACHER LEADER MASTER
-- ============================================================

-- Records which teachers serve as leaders of TLC groups.
-- A TLC group can have one active leader at a time;
-- IsActive = 0 for historical assignments when the leader changes.
CREATE TABLE TeacherLeader (
    TeacherLeaderID     INT              NOT NULL IDENTITY(1,1),
    TLCGroupID          INT              NOT NULL,
    TeacherID           INT              NOT NULL,
    AssignedDate        DATE             NOT NULL,
    IsActive            BIT              NOT NULL CONSTRAINT DF_TeacherLeader_IsActive  DEFAULT 1,
    CreatedAt           DATETIME2(0)     NOT NULL CONSTRAINT DF_TeacherLeader_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TeacherLeader             PRIMARY KEY (TeacherLeaderID),
    CONSTRAINT FK_TeacherLeader_TLCGroup    FOREIGN KEY (TLCGroupID) REFERENCES TLCGroup(TLCGroupID),
    CONSTRAINT FK_TeacherLeader_Teacher     FOREIGN KEY (TeacherID)  REFERENCES Teacher(TeacherID),
    CONSTRAINT UQ_TeacherLeader_Assign      UNIQUE (TLCGroupID, TeacherID)
);
CREATE INDEX IX_TeacherLeader_TLCGroupID   ON TeacherLeader (TLCGroupID);
CREATE INDEX IX_TeacherLeader_TeacherID    ON TeacherLeader (TeacherID);
CREATE INDEX IX_TeacherLeader_IsActive     ON TeacherLeader (IsActive);

-- FK from TLCGroup.TeacherLeaderID → TeacherLeader deferred here to avoid forward-reference.
ALTER TABLE TLCGroup
    ADD CONSTRAINT FK_TLCGroup_TeacherLeader FOREIGN KEY (TeacherLeaderID) REFERENCES TeacherLeader(TeacherLeaderID);
CREATE INDEX IX_TLCGroup_TeacherLeaderID ON TLCGroup (TeacherLeaderID);

-- ============================================================
-- 8. TLC MEMBERS MASTER  (group membership)
-- ============================================================

-- Maps teachers to TLC groups with the date they joined.
-- One teacher can be a member of only one TLC group (URD implies group membership,
-- not multiple groups).  Enforce with a unique constraint on TeacherID.
CREATE TABLE TLCMember (
    TLCMemberID         INT              NOT NULL IDENTITY(1,1),
    TLCGroupID          INT              NOT NULL,
    TeacherID           INT              NOT NULL,
    MembershipDate      DATE             NOT NULL,    -- date teacher was added as member
    IsActive            BIT              NOT NULL CONSTRAINT DF_TLCMember_IsActive  DEFAULT 1,
    CreatedAt           DATETIME2(0)     NOT NULL CONSTRAINT DF_TLCMember_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TLCMember             PRIMARY KEY (TLCMemberID),
    CONSTRAINT FK_TLCMember_TLCGroup    FOREIGN KEY (TLCGroupID) REFERENCES TLCGroup(TLCGroupID),
    CONSTRAINT FK_TLCMember_Teacher     FOREIGN KEY (TeacherID)  REFERENCES Teacher(TeacherID),
    CONSTRAINT UQ_TLCMember             UNIQUE (TLCGroupID, TeacherID)
);
CREATE INDEX IX_TLCMember_TLCGroupID   ON TLCMember (TLCGroupID);
CREATE INDEX IX_TLCMember_TeacherID    ON TLCMember (TeacherID);
CREATE INDEX IX_TLCMember_MemberDate   ON TLCMember (MembershipDate);

-- ============================================================
-- 9. TLC EVENT MASTER  (TLC & Masterclass Master)
-- ============================================================

-- Single table for both TLC meets and Masterclasses, distinguished by EventType.
-- TLC meets:    EventType='TLC',        DistrictID/BlockID/TLCGroupID NOT NULL,
--               EventCode derived from TLC group sequence.
-- Masterclasses: EventType='Masterclass', DistrictID/BlockID/TLCGroupID NULL,
--               EventCode = MSnnn (system-generated).
--
-- LedByTeacherID  -> FK to Teacher (used when a registered teacher leads)
-- LedByExternal   -> free text for external expert / master class facilitator
CREATE TABLE TLCEvent (
    TLCEventID          INT              NOT NULL IDENTITY(1,1),
    EventCode           VARCHAR(15)      NOT NULL,    -- TLC: e.g. PU03-SH/01; Masterclass: MS001
    EventType           VARCHAR(12)      NOT NULL,    -- 'TLC' or 'Masterclass'
    DistrictID          INT              NULL,        -- NULL for Masterclass
    BlockID             INT              NULL,        -- NULL for Masterclass
    TLCGroupID          INT              NULL,        -- NULL for Masterclass
    Status              VARCHAR(10)      NOT NULL CONSTRAINT DF_TLCEvent_Status DEFAULT 'Planned',
    PlannedDate         DATE             NULL,
    ConductedDate       DATE             NULL,
    ConductedLocation	VARCHAR(255)     NOT NULL,	
    StartTime           TIME(0)          NULL,
    EndTime             TIME(0)          NULL,
    -- Leader: registered teacher or external name (one must be provided when Conducted)
    LedByTeacherID      INT              NULL,
    LedByExternal       NVARCHAR(100)    NULL,
    Topic               NVARCHAR(500)    NULL,
    -- Calculated field: updated after attendance entry (= COUNT of attendance rows)
    TotalAttended       INT	         NULL,
    Remarks             NVARCHAR(500)    NULL,        -- mandatory when Status = 'Cancelled'
    FinancialYear       CHAR(7)          NOT NULL,    -- 'YYYY-YY' e.g. '2024-25'; supports longitudinal reports
    CreatedAt           DATETIME2(0)     NOT NULL CONSTRAINT DF_TLCEvent_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2(0)     NOT NULL CONSTRAINT DF_TLCEvent_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TLCEvent              PRIMARY KEY (TLCEventID),
    CONSTRAINT UQ_TLCEvent_Code         UNIQUE (EventCode),
    CONSTRAINT FK_TLCEvent_District     FOREIGN KEY (DistrictID)     REFERENCES District(DistrictID),
    CONSTRAINT FK_TLCEvent_Block        FOREIGN KEY (BlockID)        REFERENCES Block(BlockID),
    CONSTRAINT FK_TLCEvent_TLCGroup     FOREIGN KEY (TLCGroupID)     REFERENCES TLCGroup(TLCGroupID),
    CONSTRAINT FK_TLCEvent_LedBy        FOREIGN KEY (LedByTeacherID) REFERENCES Teacher(TeacherID),
    CONSTRAINT CK_TLCEvent_Type         CHECK (EventType IN ('TLC','Masterclass')),
    CONSTRAINT CK_TLCEvent_Status       CHECK (Status IN ('Planned','Conducted','Cancelled')),
    -- TLC events must have district, block, and group
    CONSTRAINT CK_TLCEvent_TLC_Dist     CHECK (EventType = 'Masterclass' OR DistrictID  IS NOT NULL),
    CONSTRAINT CK_TLCEvent_TLC_Block    CHECK (EventType = 'Masterclass' OR BlockID      IS NOT NULL),
    CONSTRAINT CK_TLCEvent_TLC_Group    CHECK (EventType = 'Masterclass' OR TLCGroupID   IS NOT NULL),
    -- Masterclass must NOT have district, block, or group
    CONSTRAINT CK_TLCEvent_MC_NoDist    CHECK (EventType = 'TLC'         OR DistrictID  IS NULL),
    CONSTRAINT CK_TLCEvent_MC_NoBlock   CHECK (EventType = 'TLC'         OR BlockID      IS NULL),
    CONSTRAINT CK_TLCEvent_MC_NoGroup   CHECK (EventType = 'TLC'         OR TLCGroupID   IS NULL),
    -- ConductedDate required when Status = 'Conducted'
    CONSTRAINT CK_TLCEvent_ConductDate  CHECK (Status <> 'Conducted' OR ConductedDate IS NOT NULL),
    -- Remarks required when Status = 'Cancelled'
    CONSTRAINT CK_TLCEvent_CancelRemark CHECK (Status <> 'Cancelled' OR (Remarks IS NOT NULL AND LEN(LTRIM(Remarks)) > 0)),
    -- Financial year format YYYY-YY
    CONSTRAINT CK_TLCEvent_FY           CHECK (FinancialYear LIKE '[0-9][0-9][0-9][0-9]-[0-9][0-9]')
);
CREATE INDEX IX_TLCEvent_DistrictID    ON TLCEvent (DistrictID);
CREATE INDEX IX_TLCEvent_BlockID       ON TLCEvent (BlockID);
CREATE INDEX IX_TLCEvent_TLCGroupID    ON TLCEvent (TLCGroupID);
CREATE INDEX IX_TLCEvent_EventType     ON TLCEvent (EventType);
CREATE INDEX IX_TLCEvent_Status        ON TLCEvent (Status);
CREATE INDEX IX_TLCEvent_PlannedDate   ON TLCEvent (PlannedDate);
CREATE INDEX IX_TLCEvent_ConductedDate ON TLCEvent (ConductedDate);
CREATE INDEX IX_TLCEvent_FinancialYear ON TLCEvent (FinancialYear);
-- Composite index for the most common dashboard query: district + type + status
CREATE INDEX IX_TLCEvent_Dist_Type_Status ON TLCEvent (DistrictID, EventType, Status);

-- ============================================================
-- 10. TLC ATTENDANCE
-- ============================================================

-- Individual teacher attendance at TLC meets.
-- TLCGroupID and AttendanceDate are denormalized from TLCEvent
-- to avoid joins in the high-frequency attendance reports.
CREATE TABLE TLCAttendance (
    AttendanceID        INT              NOT NULL IDENTITY(1,1),
    TLCEventID          INT              NOT NULL,
    TeacherID           INT              NOT NULL,
    -- Denormalized columns for report performance
    TLCGroupID          INT              NOT NULL,
    AttendanceDate      DATE             NOT NULL,
    DistrictID          INT              NOT NULL,
    BlockID             INT              NOT NULL,
    FinancialYear       CHAR(7)          NOT NULL,
    CreatedAt           DATETIME2(0)     NOT NULL CONSTRAINT DF_TLCAttendance_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TLCAttendance             PRIMARY KEY (AttendanceID),
    CONSTRAINT FK_TLCAttendance_Event       FOREIGN KEY (TLCEventID)  REFERENCES TLCEvent(TLCEventID),
    CONSTRAINT FK_TLCAttendance_Teacher     FOREIGN KEY (TeacherID)   REFERENCES Teacher(TeacherID),
    CONSTRAINT FK_TLCAttendance_TLCGroup    FOREIGN KEY (TLCGroupID)  REFERENCES TLCGroup(TLCGroupID),
    CONSTRAINT FK_TLCAttendance_District    FOREIGN KEY (DistrictID)  REFERENCES District(DistrictID),
    CONSTRAINT FK_TLCAttendance_Block       FOREIGN KEY (BlockID)     REFERENCES Block(BlockID),
    CONSTRAINT UQ_TLCAttendance             UNIQUE (TLCEventID, TeacherID)
);
CREATE INDEX IX_TLCAttend_EventID      ON TLCAttendance (TLCEventID);
CREATE INDEX IX_TLCAttend_TeacherID    ON TLCAttendance (TeacherID);
CREATE INDEX IX_TLCAttend_TLCGroupID   ON TLCAttendance (TLCGroupID);
CREATE INDEX IX_TLCAttend_Date         ON TLCAttendance (AttendanceDate);
CREATE INDEX IX_TLCAttend_DistrictID   ON TLCAttendance (DistrictID);
CREATE INDEX IX_TLCAttend_BlockID      ON TLCAttendance (BlockID);
CREATE INDEX IX_TLCAttend_FY           ON TLCAttendance (FinancialYear);
-- Composite for "% teachers attending ≥3 TLCs in a year" query
CREATE INDEX IX_TLCAttend_Teacher_FY   ON TLCAttendance (TeacherID, FinancialYear);

-- ============================================================
-- 11. MASTERCLASS ATTENDANCE
-- ============================================================

-- Individual teacher attendance at Masterclasses.
-- Not explicitly listed in URD but required for "Average # of Teachers attending
-- Masterclasses" and other per-teacher Masterclass reports.
-- Total attendance is stored denormalized in TLCEvent.TotalAttendance.
CREATE TABLE MasterclassAttendance (
    MasterclassAttendanceID INT          NOT NULL IDENTITY(1,1),
    TLCEventID              INT          NOT NULL,
    TeacherID               INT          NOT NULL,
    AttendanceDate          DATE         NOT NULL,    -- denormalized from TLCEvent
    FinancialYear           CHAR(7)      NOT NULL,
    CreatedAt               DATETIME2(0) NOT NULL CONSTRAINT DF_MCAttend_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_MasterclassAttendance         PRIMARY KEY (MasterclassAttendanceID),
    CONSTRAINT FK_MCAttend_Event                FOREIGN KEY (TLCEventID) REFERENCES TLCEvent(TLCEventID),
    CONSTRAINT FK_MCAttend_Teacher              FOREIGN KEY (TeacherID)  REFERENCES Teacher(TeacherID),
    CONSTRAINT UQ_MasterclassAttendance         UNIQUE (TLCEventID, TeacherID)
);
CREATE INDEX IX_MCAttend_EventID       ON MasterclassAttendance (TLCEventID);
CREATE INDEX IX_MCAttend_TeacherID     ON MasterclassAttendance (TeacherID);
CREATE INDEX IX_MCAttend_Date          ON MasterclassAttendance (AttendanceDate);
CREATE INDEX IX_MCAttend_FY            ON MasterclassAttendance (FinancialYear);

-- ============================================================
-- 12. BLOCK-WISE TLC TARGET
-- ============================================================

-- Annual TLC targets set at block level.
-- Reports compare targets vs planned vs conducted TLCs per block / district.
CREATE TABLE BlockTarget (
    BlockTargetID   INT              NOT NULL IDENTITY(1,1),
    DistrictID      INT              NOT NULL,
    BlockID         INT              NOT NULL,
    FinancialYear   CHAR(7)          NOT NULL,    -- 'YYYY-YY'
    TargetTLCs      SMALLINT         NOT NULL,
    CreatedAt       DATETIME2(0)     NOT NULL CONSTRAINT DF_BlockTarget_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(0)     NOT NULL CONSTRAINT DF_BlockTarget_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_BlockTarget           PRIMARY KEY (BlockTargetID),
    CONSTRAINT FK_BlockTarget_District  FOREIGN KEY (DistrictID) REFERENCES District(DistrictID),
    CONSTRAINT FK_BlockTarget_Block     FOREIGN KEY (BlockID)    REFERENCES Block(BlockID),
    CONSTRAINT UQ_BlockTarget           UNIQUE (BlockID, FinancialYear),
    CONSTRAINT CK_BlockTarget_Target    CHECK (TargetTLCs > 0),
    CONSTRAINT CK_BlockTarget_FY        CHECK (FinancialYear LIKE '[0-9][0-9][0-9][0-9]-[0-9][0-9]')
);
CREATE INDEX IX_BlockTarget_DistrictID ON BlockTarget (DistrictID);
CREATE INDEX IX_BlockTarget_BlockID    ON BlockTarget (BlockID);
CREATE INDEX IX_BlockTarget_FY         ON BlockTarget (FinancialYear);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
