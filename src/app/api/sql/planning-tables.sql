-- Script de criação de tabelas para o módulo de planejamento de estudos
-- Este script cria as tabelas necessárias para o funcionamento do novo sistema de planejamento

-- Tabela principal de planos de estudo
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StudyPlans')
BEGIN
    PRINT 'Criando tabela StudyPlans...'
    CREATE TABLE StudyPlans (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        StartDate DATE NULL,
        EndDate DATE NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'ativo',
        MetaData NVARCHAR(MAX) NULL, -- Armazena informações adicionais em formato JSON
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (UserId) REFERENCES Users(Id)
    );
    PRINT 'Tabela StudyPlans criada com sucesso.'
END
ELSE
BEGIN
    PRINT 'Tabela StudyPlans já existe.'
END

-- Tabela de relação entre planos e disciplinas
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StudyPlanDisciplines')
BEGIN
    PRINT 'Criando tabela StudyPlanDisciplines...'
    CREATE TABLE StudyPlanDisciplines (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StudyPlanId INT NOT NULL,
        DisciplineId INT NOT NULL,
        Priority NVARCHAR(50) NOT NULL DEFAULT 'média',
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StudyPlanId) REFERENCES StudyPlans(Id) ON DELETE CASCADE,
        FOREIGN KEY (DisciplineId) REFERENCES Disciplines(Id)
    );
    PRINT 'Tabela StudyPlanDisciplines criada com sucesso.'
END
ELSE
BEGIN
    PRINT 'Tabela StudyPlanDisciplines já existe.'
END

-- Tabela de relação entre planos e assuntos
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StudyPlanSubjects')
BEGIN
    PRINT 'Criando tabela StudyPlanSubjects...'
    CREATE TABLE StudyPlanSubjects (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StudyPlanId INT NOT NULL,
        SubjectId INT NOT NULL,
        EstimatedHours FLOAT NOT NULL DEFAULT 1.0,
        Priority NVARCHAR(50) NOT NULL DEFAULT 'média',
        Progress INT NULL DEFAULT 0, -- 0-100%
        Completed BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StudyPlanId) REFERENCES StudyPlans(Id) ON DELETE CASCADE,
        FOREIGN KEY (SubjectId) REFERENCES Subjects(Id)
    );
    PRINT 'Tabela StudyPlanSubjects criada com sucesso.'
END
ELSE
BEGIN
    PRINT 'Tabela StudyPlanSubjects já existe.'
END

-- Tabela de sessões de estudo
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StudySessions')
BEGIN
    PRINT 'Criando tabela StudySessions...'
    CREATE TABLE StudySessions (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        StudyPlanId INT NULL, -- Permitir NULL pois uma sessão pode não estar associada a um plano
        DisciplineId INT NOT NULL,
        SubjectId INT NULL,
        ScheduledDate DATETIME2 NOT NULL,
        Duration INT NOT NULL, -- Duração em minutos
        Completed BIT NOT NULL DEFAULT 0,
        ActualDuration INT NULL, -- Duração real em minutos
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (UserId) REFERENCES Users(Id),
        FOREIGN KEY (StudyPlanId) REFERENCES StudyPlans(Id) ON DELETE SET NULL,
        FOREIGN KEY (DisciplineId) REFERENCES Disciplines(Id),
        FOREIGN KEY (SubjectId) REFERENCES Subjects(Id)
    );
    PRINT 'Tabela StudySessions criada com sucesso.'
END
ELSE
BEGIN
    PRINT 'Tabela StudySessions já existe.'
END

-- Criar índices para melhorar o desempenho das consultas
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StudyPlans_UserId' AND object_id = OBJECT_ID('StudyPlans'))
BEGIN
    CREATE INDEX IX_StudyPlans_UserId ON StudyPlans(UserId);
    PRINT 'Índice IX_StudyPlans_UserId criado.'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StudyPlans_Status' AND object_id = OBJECT_ID('StudyPlans'))
BEGIN
    CREATE INDEX IX_StudyPlans_Status ON StudyPlans(Status);
    PRINT 'Índice IX_StudyPlans_Status criado.'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StudySessions_StudyPlanId' AND object_id = OBJECT_ID('StudySessions'))
BEGIN
    CREATE INDEX IX_StudySessions_StudyPlanId ON StudySessions(StudyPlanId);
    PRINT 'Índice IX_StudySessions_StudyPlanId criado.'
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StudySessions_ScheduledDate' AND object_id = OBJECT_ID('StudySessions'))
BEGIN
    CREATE INDEX IX_StudySessions_ScheduledDate ON StudySessions(ScheduledDate);
    PRINT 'Índice IX_StudySessions_ScheduledDate criado.'
END

PRINT 'Configuração das tabelas de planejamento concluída.'
GO 