import * as XLSX from 'xlsx';
import fs from 'fs';

const excelFilePath = "c:\\Users\\eullon.silva\\OneDrive - GEL\\Área de Trabalho\\TERMO DE RESPONSABILIDADE APP\\OS_Conserto_separado.xlsx";

try {
  const fileBuffer = fs.readFileSync(excelFilePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  console.log("Sheet names in OS_Conserto_separado.xlsx:", sheetNames);

  sheetNames.forEach(name => {
    console.log(`\n--- Sheet: ${name} ---`);
    const sheet = workbook.Sheets[name];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Total rows: ${rawData.length}`);
    if (name.includes('Estrela')) {
      console.log("Checking for TAGs...");
      rawData.forEach((row, i) => {
        if (row.length > 7 && row[7] !== undefined && String(row[7]).trim() !== '') {
          console.log(`  Row ${i} has TAG:`, row);
        }
      });
    }
  });
} catch (err) {
  console.error("Error inspecting file:", err);
}
