import Papa from "papaparse";
import { CsvTransactionRow, ParsedCsvTransaction } from "../types";

function parseLocalDate(input: string): Date {
  const [month, day, year] = input.split("/").map(Number);
  return new Date(year, month - 1, day);
}

function toMonthKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

export async function parseEmpowerCsv(file: File): Promise<ParsedCsvTransaction[]> {
  console.log("parseEmpowerCsv called for file:", file.name);
  const text = await file.text();
  console.log("File content length:", text.length);
  console.log("First 200 chars:", text.substring(0, 200));
  
  const result = Papa.parse<CsvTransactionRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  console.log("Papa.parse result:", {
    errors: result.errors,
    dataLength: result.data?.length,
    firstRow: result.data?.[0]
  });

  if (result.errors.length) {
    console.error("CSV parsing errors:", result.errors);
    throw new Error(result.errors[0].message);
  }

  const parsed = result.data
    .map((row, index) => {
      console.log(`Processing row ${index}:`, row);
      
      const parsedDate = parseLocalDate(row.Date);
      console.log(`Parsed date "${row.Date}" to:`, parsedDate);
      if (Number.isNaN(parsedDate.getTime())) {
        console.log(`Invalid date: ${row.Date}`);
        return null;
      }
      
      const amount = Number(row.Amount.replace(/[$,]/g, ""));
      console.log(`Parsed amount "${row.Amount}" to:`, amount);
      if (Number.isNaN(amount)) {
        console.log(`Invalid amount: ${row.Amount}`);
        return null;
      }
      
      const parsedTransaction = {
        date: parsedDate.toISOString(),
        month: toMonthKey(parsedDate),
        account: row.Account.trim(),
        description: row.Description.trim(),
        amount,
        empowerCategory: row.Category.trim(),
      } satisfies ParsedCsvTransaction;
      
      console.log(`Parsed transaction:`, parsedTransaction);
      return parsedTransaction;
    })
    .filter((row): row is ParsedCsvTransaction => row !== null);
    
  console.log(`Final parsed transactions count: ${parsed.length}`);
  return parsed;
}

export function exportTransactionsCsv(rows: Array<Record<string, string | number>>) {
  return Papa.unparse(rows);
}
