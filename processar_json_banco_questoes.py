#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para processar o arquivo JSON do banco de questões e gerar SQL completo
Para cadastrar disciplinas, assuntos e tópicos no Supabase

Uso:
1. Instale as dependências: pip install json
2. Execute: python processar_json_banco_questoes.py
3. O script gerará um arquivo SQL completo: banco_questoes_completo.sql
4. Execute o SQL gerado no Supabase SQL Editor
"""

import json
import os
from collections import defaultdict, OrderedDict

def processar_arquivo_json(caminho_arquivo):
    """
    Processa o arquivo JSON e extrai disciplinas, assuntos e tópicos únicos
    """
    print(f"Processando arquivo: {caminho_arquivo}")
    
    # Estruturas para armazenar dados únicos
    disciplinas = set()
    assuntos_por_disciplina = defaultdict(set)
    topicos_por_assunto = defaultdict(list)
    
    try:
        with open(caminho_arquivo, 'r', encoding='utf-8') as f:
            dados = json.load(f)
        
        print(f"Total de registros no JSON: {len(dados)}")
        
        # Processar cada item do JSON
        for item in dados:
            if not item or not isinstance(item, dict):
                continue
                
            disciplina = item.get('discipline', '').strip()
            assunto = item.get('subjetc', '').strip()  # Note: 'subjetc' no JSON original
            topico = item.get('topic', '').strip()
            
            if disciplina and assunto and topico:
                disciplinas.add(disciplina)
                assuntos_por_disciplina[disciplina].add(assunto)
                topicos_por_assunto[(disciplina, assunto)].append(topico)
        
        print(f"Disciplinas encontradas: {len(disciplinas)}")
        print(f"Assuntos únicos encontrados: {sum(len(assuntos) for assuntos in assuntos_por_disciplina.values())}")
        print(f"Combinações disciplina-assunto: {len(topicos_por_assunto)}")
        
        return disciplinas, assuntos_por_disciplina, topicos_por_assunto
        
    except FileNotFoundError:
        print(f"Erro: Arquivo {caminho_arquivo} não encontrado")
        return None, None, None
    except json.JSONDecodeError as e:
        print(f"Erro ao decodificar JSON: {e}")
        return None, None, None
    except Exception as e:
        print(f"Erro inesperado: {e}")
        return None, None, None

def gerar_sql_completo(disciplinas, assuntos_por_disciplina, topicos_por_assunto, arquivo_saida):
    """
    Gera o arquivo SQL completo com todos os dados
    """
    print(f"Gerando SQL completo em: {arquivo_saida}")
    
    with open(arquivo_saida, 'w', encoding='utf-8') as f:
        # Cabeçalho do arquivo
        f.write("""-- Script COMPLETO para cadastrar disciplinas, assuntos e tópicos no banco de questões
-- Gerado automaticamente a partir do arquivo genomedbanco JSON
-- Execute este script no Supabase SQL Editor

-- IMPORTANTE: Substitua o UUID abaixo por um UUID válido do seu sistema
-- Execute primeiro: SELECT id FROM auth.users LIMIT 1;
DO $$
DECLARE
    system_user_id UUID := '9e959500-f290-4457-a5d7-2a81c496d123'; -- SUBSTITUA POR UM UUID VÁLIDO
BEGIN

-- ========================================
-- 1. INSERIR DISCIPLINAS
-- ========================================

""")
        
        # Inserir disciplinas
        disciplinas_ordenadas = sorted(disciplinas)
        for disciplina in disciplinas_ordenadas:
            disciplina_escaped = disciplina.replace("'", "''")
            f.write(f"""-- {disciplina_escaped}
IF NOT EXISTS (SELECT 1 FROM disciplines WHERE name = '{disciplina_escaped}' AND user_id = system_user_id) THEN
    INSERT INTO disciplines (user_id, name, description, is_system, created_at, updated_at)
    VALUES (system_user_id, '{disciplina_escaped}', 'Disciplina de {disciplina_escaped}', true, NOW(), NOW());
END IF;

""")
        
        # Função auxiliar para inserir assuntos
        f.write("""-- ========================================
-- 2. FUNÇÃO AUXILIAR PARA INSERIR ASSUNTOS
-- ========================================

CREATE OR REPLACE FUNCTION insert_subject_if_not_exists(
    p_discipline_name TEXT,
    p_subject_name TEXT,
    p_user_id TEXT
) RETURNS INTEGER AS $func$
DECLARE
    v_discipline_id INTEGER;
    v_subject_id INTEGER;
BEGIN
    -- Buscar discipline_id
    SELECT id INTO v_discipline_id 
    FROM disciplines 
    WHERE name = p_discipline_name AND user_id = p_user_id::UUID;
    
    IF v_discipline_id IS NULL THEN
        RAISE EXCEPTION 'Disciplina não encontrada: %', p_discipline_name;
    END IF;
    
    -- Verificar se subject já existe (verificar tanto name quanto title)
    SELECT id INTO v_subject_id 
    FROM subjects 
    WHERE discipline_id = v_discipline_id AND (name = p_subject_name OR title = p_subject_name);
    
    -- Inserir subject se não existir
    IF v_subject_id IS NULL THEN
        INSERT INTO subjects (discipline_id, user_id, title, name, created_at, updated_at)
        VALUES (v_discipline_id, p_user_id, p_subject_name, p_subject_name, NOW(), NOW())
        RETURNING id INTO v_subject_id;
    END IF;
    
    RETURN v_subject_id;
END;
$func$ LANGUAGE plpgsql;

-- ========================================
-- 3. INSERIR ASSUNTOS
-- ========================================

""")
        
        # Inserir assuntos por disciplina
        for disciplina in disciplinas_ordenadas:
            disciplina_escaped = disciplina.replace("'", "''")
            f.write(f"-- Assuntos da disciplina: {disciplina}\n")
            
            assuntos_ordenados = sorted(assuntos_por_disciplina[disciplina])
            for assunto in assuntos_ordenados:
                assunto_escaped = assunto.replace("'", "''")
                f.write(f"PERFORM insert_subject_if_not_exists('{disciplina_escaped}', '{assunto_escaped}', system_user_id::TEXT);\n")
            f.write("\n")
        
        # Função auxiliar para inserir tópicos
        f.write("""-- ========================================
-- 4. FUNÇÃO AUXILIAR PARA INSERIR TÓPICOS
-- ========================================

CREATE OR REPLACE FUNCTION insert_topic_if_not_exists(
    p_discipline_name TEXT,
    p_subject_name TEXT,
    p_topic_name TEXT
) RETURNS INTEGER AS $func$
DECLARE
    v_discipline_id INTEGER;
    v_subject_id INTEGER;
    v_topic_id INTEGER;
BEGIN
    -- Buscar discipline_id
    SELECT id INTO v_discipline_id 
    FROM disciplines 
    WHERE name = p_discipline_name;
    
    IF v_discipline_id IS NULL THEN
        RAISE EXCEPTION 'Disciplina não encontrada: %', p_discipline_name;
    END IF;
    
    -- Buscar subject_id (verificar tanto name quanto title)
    SELECT id INTO v_subject_id 
    FROM subjects 
    WHERE discipline_id = v_discipline_id AND (name = p_subject_name OR title = p_subject_name);
    
    IF v_subject_id IS NULL THEN
        RAISE EXCEPTION 'Assunto não encontrado: % na disciplina %', p_subject_name, p_discipline_name;
    END IF;
    
    -- Verificar se topic já existe
    SELECT id INTO v_topic_id 
    FROM topics 
    WHERE subject_id = v_subject_id AND name = p_topic_name;
    
    -- Inserir topic se não existir
    IF v_topic_id IS NULL THEN
        INSERT INTO topics (subject_id, name, created_at, updated_at)
        VALUES (v_subject_id, p_topic_name, NOW(), NOW())
        RETURNING id INTO v_topic_id;
    END IF;
    
    RETURN v_topic_id;
END;
$func$ LANGUAGE plpgsql;

-- ========================================
-- 5. INSERIR TÓPICOS
-- ========================================

""")
        
        # Inserir tópicos por assunto
        for (disciplina, assunto), topicos in sorted(topicos_por_assunto.items()):
            disciplina_escaped = disciplina.replace("'", "''")
            assunto_escaped = assunto.replace("'", "''")
            
            f.write(f"-- Tópicos do assunto '{assunto}' da disciplina '{disciplina}'\n")
            
            # Remover tópicos duplicados mantendo a ordem
            topicos_unicos = list(OrderedDict.fromkeys(topicos))
            
            for topico in topicos_unicos:
                topico_escaped = topico.replace("'", "''")
                f.write(f"PERFORM insert_topic_if_not_exists('{disciplina_escaped}', '{assunto_escaped}', '{topico_escaped}');\n")
            f.write("\n")
        
        # Finalização do script
        f.write("""-- ========================================
-- 6. LIMPEZA E VERIFICAÇÃO
-- ========================================

-- Limpar funções temporárias
DROP FUNCTION IF EXISTS insert_subject_if_not_exists(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS insert_topic_if_not_exists(TEXT, TEXT, TEXT);

END $$;

-- ========================================
-- 7. CONSULTAS DE VERIFICAÇÃO
-- ========================================

-- Verificar os dados inseridos
SELECT 'Disciplinas inseridas:' as info, COUNT(*) as total FROM disciplines WHERE is_system = true;
SELECT 'Assuntos inseridos:' as info, COUNT(*) as total FROM subjects;
SELECT 'Tópicos inseridos:' as info, COUNT(*) as total FROM topics WHERE subject_id IS NOT NULL;

-- Consulta detalhada da hierarquia criada
SELECT 
    d.name as disciplina,
    COUNT(DISTINCT s.id) as total_assuntos,
    COUNT(t.id) as total_topicos
FROM disciplines d
LEFT JOIN subjects s ON d.id = s.discipline_id
LEFT JOIN topics t ON s.id = t.subject_id
WHERE d.is_system = true
GROUP BY d.id, d.name
ORDER BY d.name;

-- Amostra da hierarquia completa (primeiros 100 registros)
SELECT 
    d.name as disciplina,
    s.name as assunto,
    t.name as topico
FROM disciplines d
INNER JOIN subjects s ON d.id = s.discipline_id
INNER JOIN topics t ON s.id = t.subject_id
WHERE d.is_system = true
ORDER BY d.name, s.name, t.name
LIMIT 100;

/*
========================================
INSTRUÇÕES DE USO:
========================================

1. ANTES DE EXECUTAR:
   - Substitua o UUID 'system_user_id' por um UUID válido do seu sistema
   - Execute: SELECT id FROM auth.users LIMIT 1;
   - Copie o UUID retornado e substitua na variável system_user_id

2. EXECUÇÃO:
   - Copie todo o conteúdo deste arquivo
   - Cole no Supabase SQL Editor
   - Execute o script completo

3. VERIFICAÇÃO:
   - As consultas no final mostrarão os dados inseridos
   - Verifique se os totais estão corretos
   - Use as consultas de amostra para verificar a hierarquia

4. ESTRUTURA CRIADA:
   - Disciplinas: Áreas principais (Clínica Médica, Cirurgia, etc.)
   - Assuntos: Temas dentro de cada disciplina
   - Tópicos: Subtemas específicos dentro de cada assunto

5. CARACTERÍSTICAS:
   - Usa ON CONFLICT DO NOTHING para evitar duplicatas
   - Mantém integridade referencial
   - Marca disciplinas como is_system = true
   - Inclui timestamps de criação e atualização

6. EM CASO DE ERRO:
   - Verifique se o UUID do usuário está correto
   - Verifique se as tabelas existem no banco
   - Verifique as foreign keys entre as tabelas
*/
""")
    
    print(f"SQL completo gerado com sucesso em: {arquivo_saida}")

def main():
    # Caminhos dos arquivos
    arquivo_json = 'genomedbanco'
    arquivo_sql_saida = 'banco_questoes_completo.sql'
    
    print("=" * 60)
    print("PROCESSADOR DE BANCO DE QUESTÕES MÉDICAS")
    print("=" * 60)
    
    # Verificar se o arquivo JSON existe
    if not os.path.exists(arquivo_json):
        print(f"Erro: Arquivo {arquivo_json} não encontrado no diretório atual")
        print("Certifique-se de que o arquivo 'genomedbanco' está no mesmo diretório do script")
        return
    
    # Processar o arquivo JSON
    disciplinas, assuntos_por_disciplina, topicos_por_assunto = processar_arquivo_json(arquivo_json)
    
    if disciplinas is None:
        print("Erro ao processar o arquivo JSON. Verifique o arquivo e tente novamente.")
        return
    
    # Mostrar estatísticas
    print("\n" + "=" * 60)
    print("ESTATÍSTICAS DOS DADOS PROCESSADOS:")
    print("=" * 60)
    print(f"Disciplinas únicas: {len(disciplinas)}")
    for disciplina in sorted(disciplinas):
        total_assuntos = len(assuntos_por_disciplina[disciplina])
        total_topicos = sum(len(topicos_por_assunto[(disciplina, assunto)]) 
                          for assunto in assuntos_por_disciplina[disciplina])
        print(f"  - {disciplina}: {total_assuntos} assuntos, {total_topicos} tópicos")
    
    # Gerar SQL completo
    print("\n" + "=" * 60)
    print("GERANDO ARQUIVO SQL COMPLETO...")
    print("=" * 60)
    
    gerar_sql_completo(disciplinas, assuntos_por_disciplina, topicos_por_assunto, arquivo_sql_saida)
    
    print("\n" + "=" * 60)
    print("PROCESSO CONCLUÍDO COM SUCESSO!")
    print("=" * 60)
    print(f"Arquivo SQL gerado: {arquivo_sql_saida}")
    print("\nPróximos passos:")
    print("1. Abra o Supabase SQL Editor")
    print("2. Substitua o UUID system_user_id por um UUID válido do seu sistema")
    print("3. Execute o script SQL completo")
    print("4. Verifique os resultados com as consultas no final do script")

if __name__ == "__main__":
    main()