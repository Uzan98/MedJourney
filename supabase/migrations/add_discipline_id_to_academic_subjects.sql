-- Adicionar coluna discipline_id na tabela academic_subjects para estabelecer relação com disciplines
ALTER TABLE academic_subjects 
ADD COLUMN discipline_id INTEGER;

-- Adicionar foreign key constraint
ALTER TABLE academic_subjects 
ADD CONSTRAINT academic_subjects_discipline_id_fkey 
FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON DELETE CASCADE;

-- Criar índice para melhor performance
CREATE INDEX idx_academic_subjects_discipline_id ON academic_subjects(discipline_id);

-- Adicionar comentário
COMMENT ON COLUMN academic_subjects.discipline_id IS 'ID da disciplina associada a esta matéria acadêmica';