// Consulta la ruta siguiente para una lista de numeros de parte.
// Expande parametros de forma segura (@pn0, @pn1, ...) sin concatenar strings.
import { getPool, sql } from "./sqlClient.js";

/**
 * Dado un array de part-numbers, consulta SQL Server y devuelve un mapa
 * { [partNumber]: { nextRoute: string|null, raw: object } }.
 * Los part-numbers que no tengan ruta siguiente tendran nextRoute: null.
 */
export async function getNextProcess(partNumbers) {
  const pool = await getPool();
  const request = pool.request();

  // Construimos la clausula IN de forma parametrizada: (@pn0, @pn1, ...)
  const clauses = [];
  for (let i = 0; i < partNumbers.length; i++) {
    const paramName = `pn${i}`;
    request.input(paramName, sql.NVarChar(64), partNumbers[i]);
    clauses.push(`@${paramName}`);
  }

  const inClause = clauses.join(", ");

  // Query principal: obtiene el proceso siguiente (NoAsc = 2) para cada material.
  const query = `
    SELECT
      M.ClaveMaterial AS PartNumber,
      R.Nombre        AS NextProcess
    FROM           tblMaterial              AS M
      INNER JOIN  dbo.vwMaterialRutaTiempo AS MRT
                  ON MRT.idMaterial = M.idMaterial
      INNER JOIN  dbo.tblRuta              AS R
                  ON R.idRuta = MRT.idRuta
    WHERE
      M.ClaveMaterial IN (${inClause})
      AND MRT.NoAsc = 2
  `;

  const result = await request.query(query);

  // Inicializamos el mapa con nextProcess: null para todos los solicitados.
  const map = {};
  for (const pn of partNumbers) {
    map[pn] = { nextProcess: null };
  }

  // Sobrescribimos con los resultados reales de la BD.
  for (const row of result.recordset) {
    map[row.PartNumber] = {
      nextProcess: row.NextProcess,
      raw: row,
    };
  }

  return map;
}
