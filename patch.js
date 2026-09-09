const fs = require('fs');
let code = fs.readFileSync('shared/db.ts', 'utf8');

if (!code.includes('function addColumn')) {
  code = code.replace(
    /const db = new Database\(dbPath\)\n/,
    "const db = new Database(dbPath)\n\nfunction addColumn(table: string, def: string) {\n  try {\n    db.exec(`ALTER TABLE ${table} ADD COLUMN ${def}`)\n  } catch (e: any) {\n    if (!e.message.includes('duplicate column name')) throw e;\n  }\n}\n"
  );
}

code = code.replace(/try\s*\{\s*db\.exec\(`ALTER TABLE ([a-zA-Z0-9_]+) ADD COLUMN (.*?)`\)\s*\}\s*catch\s*\{\}/g, "addColumn('$1', `$2`)");
fs.writeFileSync('shared/db.ts', code);
