// Test CSV parsing logic
import { parseEmpowerCsv } from './src/lib/csvParser.js';

// Create a test CSV content
const csvContent = `Date,Account,Description,Category,Tags,Amount
12/1/2024,Checking,Trader Joe's,Groceries,,-45.67
12/2/2024,Credit Card,Shell Gas Station,Transportation,,-65.00
12/3/2024,Checking,Netflix Subscription,Entertainment,,-15.99
12/4/2024,Credit Card,Target Shopping,Shopping,,-123.45
12/5/2024,Checking,Salary Deposit,Income,,2500.00`;

// Create a File object-like structure
const blob = new Blob([csvContent], { type: 'text/csv' });
const file = new File([blob], 'test.csv', { type: 'text/csv' });

// Test the parsing
try {
  const result = await parseEmpowerCsv(file);
  console.log('Parsing successful!');
  console.log('Parsed rows:', result.length);
  console.log('First row:', result[0]);
} catch (error) {
  console.error('Parsing failed:', error);
}
