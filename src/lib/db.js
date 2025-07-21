/**
 * Este arquivo serve apenas como ponte para o db-adapter.js
 * Mantendo a compatibilidade com os imports existentes no código
 */

import { executeQuery, executeQuerySingle } from './db-adapter';

// Reexportar as funções para manter compatibilidade
export { executeQuery, executeQuerySingle }; 