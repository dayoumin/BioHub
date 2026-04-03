/**
 * 공무원 보고서 형식 HWPX 생성 테스트
 * 2장 분량의 양식장 수질 모니터링 보고서
 */

const { HwpxBuilder } = require('./hwpx-builder')
const path = require('path')
const zlib = require('zlib')

// ─── 간이 차트 PNG 생성 ───

function createBarChart(w, h, data, colors, labels) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10])
  const ihd = Buffer.alloc(13); ihd.writeUInt32BE(w,0); ihd.writeUInt32BE(h,4); ihd[8]=8; ihd[9]=2
  const rb = 1+w*3; const raw = Buffer.alloc(rb*h)

  const fill = (rx,ry,rw,rh,r,g,b) => {
    for(let y=Math.max(0,ry);y<Math.min(h,ry+rh);y++)
      for(let x=Math.max(0,rx);x<Math.min(w,rx+rw);x++){
        const o=y*rb+1+x*3; raw[o]=r; raw[o+1]=g; raw[o+2]=b
      }
  }
  const line = (x1,y1,x2,y2,r,g,b) => {
    const dx=x2-x1,dy=y2-y1,steps=Math.max(Math.abs(dx),Math.abs(dy))||1
    for(let i=0;i<=steps;i++){
      const x=Math.round(x1+dx*i/steps),y=Math.round(y1+dy*i/steps)
      if(x>=0&&x<w&&y>=0&&y<h){const o=y*rb+1+x*3;raw[o]=r;raw[o+1]=g;raw[o+2]=b}
    }
  }

  // 배경
  fill(0,0,w,h,255,255,255)
  // 축
  const left=60, bottom=h-50, top=30, right=w-30
  line(left,top,left,bottom,100,100,100)
  line(left,bottom,right,bottom,100,100,100)
  // Y축 눈금선
  for(let i=1;i<=5;i++){const y=bottom-Math.round((bottom-top)*i/5);line(left,y,right,y,230,230,230)}

  // 바
  const maxVal = Math.max(...data)
  const barW = Math.round((right-left-40) / data.length * 0.6)
  const gap = Math.round((right-left-40) / data.length)
  data.forEach((v, i) => {
    const barH = Math.round((bottom-top) * (v/maxVal) * 0.9)
    const x = left + 20 + i * gap
    const [cr,cg,cb] = colors[i] || [100,100,100]
    fill(x, bottom-barH, barW, barH, cr, cg, cb)
  })

  return Buffer.concat([sig,mc('IHDR',ihd),mc('IDAT',zlib.deflateSync(raw,{level:6})),mc('IEND',Buffer.alloc(0))])
}

function createLineChart(w, h, dataSeries, colors) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10])
  const ihd = Buffer.alloc(13); ihd.writeUInt32BE(w,0); ihd.writeUInt32BE(h,4); ihd[8]=8; ihd[9]=2
  const rb = 1+w*3; const raw = Buffer.alloc(rb*h)

  const fill = (rx,ry,rw,rh,r,g,b) => {
    for(let y=Math.max(0,ry);y<Math.min(h,ry+rh);y++)
      for(let x=Math.max(0,rx);x<Math.min(w,rx+rw);x++){
        const o=y*rb+1+x*3; raw[o]=r; raw[o+1]=g; raw[o+2]=b
      }
  }
  const line = (x1,y1,x2,y2,r,g,b) => {
    const dx=x2-x1,dy=y2-y1,steps=Math.max(Math.abs(dx),Math.abs(dy))||1
    for(let i=0;i<=steps;i++){
      const x=Math.round(x1+dx*i/steps),y=Math.round(y1+dy*i/steps)
      if(x>=0&&x<w&&y>=0&&y<h){const o=y*rb+1+x*3;raw[o]=r;raw[o+1]=g;raw[o+2]=b}
    }
  }

  fill(0,0,w,h,255,255,255)
  const left=60, bottom=h-50, top=30, right=w-30
  line(left,top,left,bottom,100,100,100)
  line(left,bottom,right,bottom,100,100,100)
  for(let i=1;i<=5;i++){const y=bottom-Math.round((bottom-top)*i/5);line(left,y,right,y,230,230,230)}

  dataSeries.forEach((data, si) => {
    const [cr,cg,cb] = colors[si] || [100,100,100]
    const maxVal = 35 // 수온 기준 max
    const xStep = (right-left) / (data.length-1)
    for(let i=1;i<data.length;i++){
      const x1=left+Math.round(xStep*(i-1)), y1=bottom-Math.round((bottom-top)*(data[i-1]/maxVal))
      const x2=left+Math.round(xStep*i), y2=bottom-Math.round((bottom-top)*(data[i]/maxVal))
      line(x1,y1,x2,y2,cr,cg,cb)
      // 점
      fill(x2-2,y2-2,5,5,cr,cg,cb)
    }
    fill(left-2,bottom-Math.round((bottom-top)*(data[0]/maxVal))-2,5,5,cr,cg,cb)
  })

  return Buffer.concat([sig,mc('IHDR',ihd),mc('IDAT',zlib.deflateSync(raw,{level:6})),mc('IEND',Buffer.alloc(0))])
}

function mc(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length,0);const tb=Buffer.from(t);const c=Buffer.concat([tb,d]);const cb=Buffer.alloc(4);cb.writeUInt32BE(cr(c)>>>0,0);return Buffer.concat([l,c,cb])}
function cr(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++){c^=b[i];for(let j=0;j<8;j++)c=(c>>>1)^(c&1?0xEDB88320:0)}return ~c}

// ─── 보고서 생성 ───

async function main() {
  const templatePath = path.resolve(__dirname, '../../swimming.hwpx')
  const builder = await HwpxBuilder.fromTemplate(templatePath)

  // ═══ 표지부 ═══
  builder.addEmptyLine()
  builder.addHeading('양식장 수질 모니터링 분석 보고서')
  builder.addEmptyLine()
  builder.addParagraph('2026년 1분기 (1월~3월)')
  builder.addEmptyLine()
  builder.addEmptyLine()
  builder.addParagraph('작성일: 2026년 4월 2일')
  builder.addParagraph('작 성 자: 해양수산과학원 양식관리팀')
  builder.addParagraph('담 당 자: 김해양 주무관 (☎ 051-720-2345)')
  builder.addParagraph('검 토 자: 이수산 과장')
  builder.addEmptyLine()
  builder.addEmptyLine()

  // ═══ 1. 개요 ═══
  builder.addHeading('1. 분석 개요')
  builder.addEmptyLine()
  builder.addParagraph('가. 분석 목적')
  builder.addParagraph('  ○ 관할 양식장 3개소의 수질 환경 변화를 모니터링하여 적정 양식 환경 유지 여부를 평가하고, 이상 징후 발생 시 선제적 대응 방안을 마련하고자 함.')
  builder.addEmptyLine()
  builder.addParagraph('나. 분석 기간 및 대상')
  builder.addParagraph('  ○ 분석 기간: 2026. 1. 1. ~ 2026. 3. 31. (3개월)')
  builder.addParagraph('  ○ 대상 양식장: A양식장(통영), B양식장(거제), C양식장(남해)')
  builder.addParagraph('  ○ 측정 항목: 수온(℃), 용존산소(mg/L), pH, 염분(‰), 암모니아성질소(mg/L)')
  builder.addParagraph('  ○ 측정 주기: 주 1회 (총 12회/양식장)')
  builder.addEmptyLine()
  builder.addParagraph('다. 분석 방법')
  builder.addParagraph('  ○ 독립표본 t-검정, 일원분산분석(ANOVA), 추세 분석')
  builder.addParagraph('  ○ 통계 분석 도구: BioHub Statistical Analysis Platform (SciPy 1.14)')
  builder.addEmptyLine()

  // ═══ 2. 분석 결과 ═══
  builder.addHeading('2. 분석 결과')
  builder.addEmptyLine()
  builder.addParagraph('가. 수질 측정 결과 요약')
  builder.addEmptyLine()

  // 표 1: 수질 측정 결과
  builder.addTable({
    caption: '< 표 1 > 양식장별 수질 측정 결과 (평균±표준편차)',
    headers: ['측정항목', 'A양식장(통영)', 'B양식장(거제)', 'C양식장(남해)', '기준값'],
    rows: [
      ['수온(℃)', '14.2±2.1', '13.8±1.9', '14.5±2.3', '10~25'],
      ['용존산소(mg/L)', '7.8±0.6', '7.2±0.8', '8.1±0.5', '≥5.0'],
      ['pH', '8.1±0.2', '7.9±0.3', '8.0±0.2', '7.5~8.5'],
      ['염분(‰)', '33.2±1.1', '32.8±1.3', '33.5±0.9', '30~35'],
      ['NH₃-N(mg/L)', '0.02±0.01', '0.05±0.02', '0.01±0.01', '≤0.1'],
    ]
  })
  builder.addEmptyLine()

  builder.addParagraph('  ○ 3개 양식장 모두 수질 기준값 범위 내로 측정됨.')
  builder.addParagraph('  ○ B양식장의 암모니아성질소(0.05mg/L)가 타 양식장 대비 2.5~5배 높으나 기준값(0.1mg/L) 이내.')
  builder.addEmptyLine()

  builder.addParagraph('나. 양식장 간 수질 비교 (일원분산분석)')
  builder.addEmptyLine()

  // 표 2: ANOVA 결과
  builder.addTable({
    caption: '< 표 2 > 일원분산분석(ANOVA) 결과',
    headers: ['측정항목', 'F값', 'p값', '유의성', '사후검정'],
    rows: [
      ['수온', '1.23', '0.302', '비유의', '-'],
      ['용존산소', '4.56', '0.016*', '유의', 'A≒C > B'],
      ['pH', '2.11', '0.134', '비유의', '-'],
      ['염분', '1.78', '0.181', '비유의', '-'],
      ['NH₃-N', '8.92', '0.001**', '고도유의', 'B > A≒C'],
    ]
  })
  builder.addParagraph('  * p<0.05, ** p<0.01')
  builder.addEmptyLine()

  builder.addParagraph('  ○ 용존산소: B양식장(7.2mg/L)이 A, C양식장 대비 유의하게 낮음(p=0.016).')
  builder.addParagraph('  ○ 암모니아성질소: B양식장(0.05mg/L)이 타 양식장 대비 고도유의하게 높음(p=0.001).')
  builder.addParagraph('  ○ 수온, pH, 염분은 양식장 간 유의한 차이 없음.')
  builder.addEmptyLine()

  // 차트 1: 바 차트 (용존산소 비교)
  const doChart = createBarChart(500, 300,
    [7.8, 7.2, 8.1],
    [[66,133,244], [234,67,53], [52,168,83]],
    ['A양식장', 'B양식장', 'C양식장']
  )
  builder.addImage(doChart, {
    width: 500, height: 300,
    caption: '< 그림 1 > 양식장별 용존산소 농도 비교'
  })
  builder.addEmptyLine()

  builder.addParagraph('다. 수온 변화 추세')
  builder.addEmptyLine()

  // 차트 2: 라인 차트 (월별 수온 추세)
  const tempChart = createLineChart(500, 280,
    [
      [10.2, 10.5, 11.0, 11.8, 12.5, 13.0, 13.8, 14.5, 15.2, 15.8, 16.5, 17.0], // A
      [9.8, 10.1, 10.8, 11.5, 12.0, 12.8, 13.2, 14.0, 14.8, 15.2, 15.8, 16.5],  // B
      [10.5, 10.8, 11.2, 12.0, 12.8, 13.5, 14.0, 14.8, 15.5, 16.0, 16.8, 17.2], // C
    ],
    [[66,133,244], [234,67,53], [52,168,83]]
  )
  builder.addImage(tempChart, {
    width: 500, height: 280,
    caption: '< 그림 2 > 월별 수온 변화 추세 (파랑=A, 빨강=B, 초록=C)'
  })
  builder.addEmptyLine()

  builder.addParagraph('  ○ 3개 양식장 모두 1월→3월 수온 상승 추세 확인 (계절적 변동).')
  builder.addParagraph('  ○ C양식장이 전 기간 최고 수온, B양식장이 최저 수온 유지.')
  builder.addEmptyLine()

  // ═══ 3. 종합 판단 ═══
  builder.addHeading('3. 종합 판단 및 조치 계획')
  builder.addEmptyLine()
  builder.addParagraph('가. 종합 판단')
  builder.addParagraph('  ○ 3개 양식장 수질은 전반적으로 양호한 수준으로 판단됨.')
  builder.addParagraph('  ○ 다만, B양식장(거제)의 용존산소 저하 및 암모니아성질소 상승 추세에 대한 주의 관찰이 필요함.')
  builder.addEmptyLine()
  builder.addParagraph('나. 향후 조치 계획')
  builder.addParagraph('  ○ B양식장 집중 모니터링: 4월부터 측정 주기를 주 2회로 상향.')
  builder.addParagraph('  ○ B양식장 수질 개선: 포기 장치 점검 및 환수율 조정 권고.')
  builder.addParagraph('  ○ 2분기 보고서 작성 시 B양식장 개선 효과 평가 포함.')
  builder.addEmptyLine()
  builder.addParagraph('  ※ 본 보고서는 BioHub 통계 분석 플랫폼으로 생성되었습니다.')
  builder.addParagraph('                                                          - 끝 -')

  // ═══ 저장 ═══
  const outputPath = path.resolve(__dirname, '../../test-gov-report.hwpx')
  const size = await builder.save(outputPath)
  console.log('test-gov-report.hwpx 생성 완료 (' + size + ' bytes)')
}

main().catch(console.error)
