const fs = require('fs');
const path = require('path');

const testDataDir = path.join(__dirname, '../test-data/e2e');

if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
}

const datasets = {
    'anova.csv': `group,value
A,10
A,12
A,11
B,15
B,16
B,14
C,20
C,22
C,21`,
    'correlation.csv': `x,y
1,2
2,4
3,6
4,8
5,10`,
    'descriptive.csv': `value
10
20
30
40
50`,
    'regression.csv': `x1,x2,y
1,2,5
2,3,8
3,4,11
4,5,14
5,6,17`,
    't-test.csv': `group,value
A,10
A,12
A,11
B,15
B,16
B,14`,
    'chi-square-independence.csv': `treatment,outcome
Treated,Cured
Treated,Cured
Treated,NotCured
Placebo,Cured
Placebo,NotCured
Placebo,NotCured`,
    'mann-whitney.csv': `group,value
A,10
A,12
A,11
B,15
B,16
B,14`,
    'normality-test.csv': `value
10
12
11
15
16
14
20
22
21`,
    'pca.csv': `x1,x2,x3,x4
1,2,3,4
2,3,4,5
3,4,5,6
4,5,6,7
5,6,7,8`,
    'kruskal-wallis.csv': `group,value
A,10
A,12
A,11
B,15
B,16
B,14
C,20
C,22
C,21`,
    'wilcoxon.csv': `before,after
10,12
12,14
11,13
15,16
16,18`,
    'one-sample-t.csv': `value
10
12
11
15
16
14`,
    'friedman.csv': `time1,time2,time3
10,12,14
12,14,16
11,13,15
15,17,19
16,18,20`,
    'partial-correlation.csv': `x,y,z
1,2,3
2,4,5
3,6,7
4,8,9
5,10,11`,
    'manova.csv': `group,y1,y2
A,10,20
A,12,22
A,11,21
B,15,25
B,16,26
B,14,24`
};

Object.entries(datasets).forEach(([filename, content]) => {
    fs.writeFileSync(path.join(testDataDir, filename), content);
    console.log(`Created ${filename}`);
});

console.log('All test data generated successfully.');
