-- Script de inicialização do banco de dados para MedJourney
-- Este script cria todas as tabelas necessárias para a aplicação

-- Tabela de usuários
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        Name NVARCHAR(255) NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Tabela Users criada com sucesso.';
END
ELSE
    PRINT 'Tabela Users já existe.';

-- Tabela de disciplinas
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Disciplines')
BEGIN
    CREATE TABLE Disciplines (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Theme NVARCHAR(50) NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (UserId) REFERENCES Users(Id)
    );
    PRINT 'Tabela Disciplines criada com sucesso.';
END
ELSE
    PRINT 'Tabela Disciplines já existe.';

-- Tabela de assuntos
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Subjects')
BEGIN
    CREATE TABLE Subjects (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        DisciplineId INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Difficulty NVARCHAR(50) NOT NULL,
        Importance NVARCHAR(50) NOT NULL,
        EstimatedHours FLOAT NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (DisciplineId) REFERENCES Disciplines(Id)
    );
    PRINT 'Tabela Subjects criada com sucesso.';
END
ELSE
    PRINT 'Tabela Subjects já existe.';

-- Tabela de notas
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notes')
BEGIN
    CREATE TABLE Notes (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        DisciplineId INT NULL,
        SubjectId INT NULL,
        Title NVARCHAR(255) NOT NULL,
        Content NVARCHAR(MAX) NOT NULL,
        Tags NVARCHAR(255) NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (UserId) REFERENCES Users(Id),
        FOREIGN KEY (DisciplineId) REFERENCES Disciplines(Id),
        FOREIGN KEY (SubjectId) REFERENCES Subjects(Id)
    );
    PRINT 'Tabela Notes criada com sucesso.';
END
ELSE
    PRINT 'Tabela Notes já existe.';

-- Tabela de simulados
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SimulatedTests')
BEGIN
    CREATE TABLE SimulatedTests (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        Title NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        ScheduledDate DATETIME2 NULL,
        CompletedDate DATETIME2 NULL,
        Duration INT NULL, -- em minutos
        Status NVARCHAR(50) DEFAULT 'criado',
        TotalQuestions INT DEFAULT 0,
        CorrectAnswers INT DEFAULT 0,
        MetaData NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (UserId) REFERENCES Users(Id)
    );
    PRINT 'Tabela SimulatedTests criada com sucesso.';
END
ELSE
    PRINT 'Tabela SimulatedTests já existe.';

-- Inserir um usuário de exemplo para desenvolvimento
IF NOT EXISTS (SELECT * FROM Users WHERE Email = 'teste@medjourney.com')
BEGIN
    INSERT INTO Users (Email, Name, PasswordHash)
    VALUES ('teste@medjourney.com', 'Usuário Teste', 'senha_hash_aqui');
    PRINT 'Usuário de teste criado com sucesso.';
END
ELSE
    PRINT 'Usuário de teste já existe.';

-- Inserir algumas disciplinas de exemplo
IF (SELECT COUNT(*) FROM Disciplines) = 0
BEGIN
    DECLARE @UserId INT = (SELECT Id FROM Users WHERE Email = 'teste@medjourney.com');
    
    INSERT INTO Disciplines (UserId, Name, Description, Theme)
    VALUES 
        (@UserId, 'Anatomia', 'Sistema musculoesquelético, cardiovascular, respiratório e mais', 'vermelho'),
        (@UserId, 'Fisiologia', 'Funcionamento dos sistemas do corpo humano', 'azul'),
        (@UserId, 'Bioquímica', 'Estudo dos processos químicos em sistemas biológicos', 'verde'),
        (@UserId, 'Patologia', 'Estudo das doenças e suas causas', 'roxo');
    
    PRINT 'Disciplinas de exemplo criadas com sucesso.';
END
ELSE
    PRINT 'Disciplinas já existem.';

PRINT 'Configuração inicial do banco de dados concluída.';
GO 