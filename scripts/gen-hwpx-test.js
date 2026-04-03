const JSZip = require('jszip');
const zlib = require('zlib');
const fs = require('fs');

// ─── PNG 생성 (Bar Chart 모양) ───
function createChartPng(w, h) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihd = Buffer.alloc(13); ihd.writeUInt32BE(w,0); ihd.writeUInt32BE(h,4); ihd[8]=8; ihd[9]=2;
  const rb = 1+w*3; const raw = Buffer.alloc(rb*h);

  for(let y=0;y<h;y++){raw[y*rb]=0;for(let x=0;x<w;x++){const o=y*rb+1+x*3;raw[o]=250;raw[o+1]=250;raw[o+2]=250;}}

  const fillRect = (rx,ry,rw,rh,r,g,b)=>{for(let y=ry;y<ry+rh&&y<h;y++)for(let x=rx;x<rx+rw&&x<w;x++){const o=y*rb+1+x*3;raw[o]=r;raw[o+1]=g;raw[o+2]=b;}};
  const drawLine = (x1,y1,x2,y2,r,g,b)=>{const dx=x2-x1,dy=y2-y1,steps=Math.max(Math.abs(dx),Math.abs(dy))||1;for(let i=0;i<=steps;i++){const x=Math.round(x1+dx*i/steps),y=Math.round(y1+dy*i/steps);if(x>=0&&x<w&&y>=0&&y<h){const o=y*rb+1+x*3;raw[o]=r;raw[o+1]=g;raw[o+2]=b;}}};

  // 축
  drawLine(60,20,60,h-40,80,80,80);
  drawLine(60,h-40,w-20,h-40,80,80,80);
  // Y축 눈금선
  for(let i=1;i<=4;i++){const y=h-40-Math.round((h-60)*i/4);drawLine(60,y,w-20,y,220,220,220);}

  // Bar: 실험군 (파랑, 75.2)
  const bh1 = Math.round((h-60)*0.75);
  fillRect(100, h-40-bh1, 100, bh1, 66,133,244);
  // Bar: 대조군 (회색, 68.1)
  const bh2 = Math.round((h-60)*0.68);
  fillRect(280, h-40-bh2, 100, bh2, 156,156,156);

  return Buffer.concat([sig,mc('IHDR',ihd),mc('IDAT',zlib.deflateSync(raw,{level:6})),mc('IEND',Buffer.alloc(0))]);
}
function mc(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length,0);const tb=Buffer.from(t);const c=Buffer.concat([tb,d]);const cb=Buffer.alloc(4);cb.writeUInt32BE(cr(c)>>>0,0);return Buffer.concat([l,c,cb]);}
function cr(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++){c^=b[i];for(let j=0;j<8;j++)c=(c>>>1)^(c&1?0xEDB88320:0);}return ~c;}

async function main() {
  const chartPng = createChartPng(480, 320);

  const zip = await JSZip.loadAsync(fs.readFileSync('swimming.hwpx'));
  const origSection = await zip.file('Contents/section0.xml').async('string');
  const secOpen = origSection.match(/<hs:sec[^>]*>/)[0];
  const firstP = origSection.match(/<hp:p[\s\S]*?<\/hp:p>/)[0];

  // 기존 이미지 제거, 새 차트 PNG 추가
  zip.remove('BinData/image1.bmp');
  zip.remove('BinData/image2.bmp');
  zip.file('BinData/chart1.png', chartPng);

  // hp:pic (swimming.hwpx의 실제 구조 참조)
  const picXml = '<hp:pic id="900001" zOrder="0" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" groupLevel="0" instid="900001" reverse="0">' +
    '<hp:offset x="0" y="0"/>' +
    '<hp:orgSz width="36000" height="24000"/>' +
    '<hp:curSz width="36000" height="24000"/>' +
    '<hp:flip horizontal="0" vertical="0"/>' +
    '<hp:rotationInfo angle="0"/>' +
    '<hp:renderingInfo><hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:scaMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/></hp:renderingInfo>' +
    '<hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="36000" y="0"/><hc:pt2 x="36000" y="24000"/><hc:pt3 x="0" y="24000"/></hp:imgRect>' +
    '<hp:imgClip left="0" right="36000" top="0" bottom="24000"/>' +
    '<hp:inMargin left="0" right="0" top="0" bottom="0"/>' +
    '<hc:img binaryItemIDRef="chart1" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/>' +
    '<hp:effects/>' +
    '<hp:sz width="36000" widthRelTo="ABSOLUTE" height="24000" heightRelTo="ABSOLUTE" protect="0"/>' +
    '<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>' +
    '<hp:outMargin left="0" right="0" top="0" bottom="0"/>' +
    '</hp:pic>';

  const p = (id, text) =>
    `<hp:p id="${id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0"><hp:t>${text}</hp:t></hp:run></hp:p>`;
  const empty = (id) => p(id, '');
  const pWithPic = (id) =>
    `<hp:p id="${id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0">${picXml}</hp:run></hp:p>`;

  const section0 = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' +
    secOpen +
    firstP +
    p(100, '독립표본 t-검정 분석 보고서') +
    empty(101) +
    p(102, '홍길동, 김철수 | 2026년 4월 2일') +
    empty(103) +
    p(104, '1. 서론') +
    p(105, '본 연구는 양식 어류의 체장 차이를 그룹 간 비교하기 위해 수행되었다. 실험군에는 고단백 사료를, 대조군에는 일반 사료를 12주간 급이하여 성장률을 측정하였다.') +
    empty(106) +
    p(107, '2. 방법') +
    p(108, '독립표본 t-검정(Independent Samples t-test)을 사용하여 두 그룹 간의 평균 체장 차이를 검정하였다. Levene 등분산 검정 결과 등분산 가정이 충족되었다(F=1.23, p=0.274). 통계 분석은 BioHub(SciPy 1.14)를 사용하여 수행하였다.') +
    empty(109) +
    p(110, '3. 결과') +
    p(111, '실험군의 평균 체장은 75.2mm(SD=12.4), 대조군은 68.1mm(SD=11.8)이었다. t(58)=2.31, p=0.024로 두 그룹 간 통계적으로 유의한 차이가 확인되었다. Cohen\'s d=0.60으로 중간 수준의 효과크기를 보였다.') +
    empty(112) +
    pWithPic(113) +
    p(114, 'Figure 1. 실험군과 대조군의 체장 비교 (Bar Chart)') +
    empty(115) +
    p(116, '4. 참고문헌') +
    p(117, 'BioHub Statistical Analysis Platform v1.0. Generated by BioHub.') +
    '</hs:sec>';

  zip.file('Contents/section0.xml', section0);

  // content.hpf 업데이트
  let hpf = await zip.file('Contents/content.hpf').async('string');
  hpf = hpf.replace(/<opf:item[^>]*BinData[^>]*\/>/g, '');
  hpf = hpf.replace('</opf:manifest>', '<opf:item id="chart1" href="BinData/chart1.png" media-type="image/png" isEmbeded="1"/></opf:manifest>');
  zip.file('Contents/content.hpf', hpf);

  // Preview 제거
  try { zip.remove('Preview/PrvText.txt'); } catch {}
  try { zip.remove('Preview/PrvImage.png'); } catch {}

  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync('test-biohub-report-with-chart.hwpx', out);
  console.log('test-biohub-report-with-chart.hwpx (' + out.length + ' bytes)');
}
main().catch(console.error);
