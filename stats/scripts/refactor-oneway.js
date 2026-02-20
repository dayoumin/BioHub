const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'lib/services/pyodide-statistics.ts');
console.log(`Reading file: ${targetPath}`);

try {
    let content = fs.readFileSync(targetPath, 'utf8');

    const startMarker = 'async oneWayAnovaWorker(groups: number[][]): Promise<{';
    const endMarker = 'async twoWayAnovaWorker';

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex === -1) {
        console.error('Start marker not found');
        process.exit(1);
    }
    if (endIndex === -1) {
        console.error('End marker not found');
        process.exit(1);
    }

    console.log(`Found markers at ${startIndex} and ${endIndex}`);

    const newImplementation = `async oneWayAnovaWorker(groups: number[][]): Promise<Generated.OneWayAnovaResult & {
    fStatistic: number
    dfBetween: number
    dfWithin: number
    etaSquared: number
    omegaSquared: number
    ssBetween: number
    ssWithin: number
    ssTotal: number
  }> {
    const result = await Generated.oneWayAnova(groups)
    const anyResult = result as any
    return {
      ...result,
      fStatistic: result.statistic,
      dfBetween: anyResult.dfBetween,
      dfWithin: anyResult.dfWithin,
      etaSquared: anyResult.etaSquared,
      omegaSquared: anyResult.omegaSquared,
      ssBetween: anyResult.ssBetween,
      ssWithin: anyResult.ssWithin,
      ssTotal: anyResult.ssTotal
    }
  }

  `;

    // Calculate whitespace to remove (empty lines before twoWayAnovaWorker) if needed
    // But simple concatenation is safer
    const newContent = content.substring(0, startIndex) + newImplementation + content.substring(endIndex);

    fs.writeFileSync(targetPath, newContent, 'utf8');
    console.log('Successfully refactored oneWayAnovaWorker');

} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
