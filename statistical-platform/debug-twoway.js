// Debug script to check twoWayAnova method
const fs = require('fs');

// Read the source file
const source = fs.readFileSync('./lib/services/pyodide-statistics.ts', 'utf8');

// Check if twoWayAnova exists
const hasTwoWayAnova = source.includes('async twoWayAnova');
console.log('✅ Source file contains twoWayAnova:', hasTwoWayAnova);

// Find the method
const match = source.match(/async twoWayAnova\(/);
if (match) {
  const index = source.indexOf(match[0]);
  const lineNumber = source.substring(0, index).split('\n').length;
  console.log(`✅ Found at line ${lineNumber}`);
}

// Check class structure
const classMatch = source.match(/export class PyodideStatisticsService/);
if (classMatch) {
  console.log('✅ Class is exported');
}

// Check singleton export
const singletonMatch = source.match(/export const pyodideStats/);
if (singletonMatch) {
  console.log('✅ Singleton instance is exported');
}

// Count async methods
const asyncCount = (source.match(/async [a-zA-Z]+\(/g) || []).length;
console.log(`✅ Total async methods: ${asyncCount}`);