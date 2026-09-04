const fs = require('fs');
const https = require('https');

const SOURCE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const OUTPUT_PATH = 'supabase/migrations/0006_seed_exercise_library.sql';

function escapeSqlString(value) {
  return String(value).replace(/'/g, "''");
}

function toSqlTextArray(values) {
  if (!values || values.length === 0) return "'{}'";
  const elements = values.map((v) => {
    const arrayEscaped = String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${arrayEscaped}"`;
  });
  const arrayLiteral = `{${elements.join(',')}}`;
  return `'${arrayLiteral.replace(/'/g, "''")}'`;
}

https.get(SOURCE_URL, (res) => {
  let raw = '';
  res.on('data', (chunk) => { raw += chunk; });
  res.on('end', () => {
    const exercises = JSON.parse(raw);
    const rows = exercises.map((ex) => {
      const name = escapeSqlString(ex.name);
      const primaryMuscles = toSqlTextArray(ex.primaryMuscles);
      const secondaryMuscles = toSqlTextArray(ex.secondaryMuscles);
      const equipment = ex.equipment ? `'${escapeSqlString(ex.equipment)}'` : 'null';
      const instructions = toSqlTextArray(ex.instructions);
      const images = toSqlTextArray((ex.images || []).map((img) => IMAGE_BASE + img));
      return `('${name}', ${primaryMuscles}, ${secondaryMuscles}, ${equipment}, ${instructions}, ${images}, false, null)`;
    });

    const sql =
      'insert into exercises (name, primary_muscles, secondary_muscles, equipment, instructions, images, is_custom, created_by)\n' +
      'values\n  ' + rows.join(',\n  ') + ';\n';

    fs.writeFileSync(OUTPUT_PATH, sql);
    console.log(`Wrote ${exercises.length} exercises to ${OUTPUT_PATH}`);
  });
});
