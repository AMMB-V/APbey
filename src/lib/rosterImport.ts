export function csvRows(source: string) {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && c === ',') { row.push(field); field = ''; }
    else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && source[i + 1] === '\n') i++;
      rows.push([...row, field]); row = []; field = '';
    } else field += c;
  }
  if (quoted) throw new Error('Hay una comilla sin cerrar en el CSV.');
  return [...rows, [...row, field]];
}

export function rosterNames(rows: unknown[][]) {
  const column = rows[0]?.findIndex(cell => ['nombre', 'blader', 'name'].includes(String(cell).trim().toLowerCase())) ?? -1;
  if (column < 0 && rows.some(row => row.length > 1)) throw new Error('Añade una columna con el encabezado Nombre.');
  return (column < 0 ? rows : rows.slice(1)).map(row => String(row[Math.max(column, 0)] ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
}
