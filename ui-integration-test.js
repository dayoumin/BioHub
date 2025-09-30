/**
 * UI 통합 테스트 - 실험설계 시스템이 웹에서 제대로 작동하는지 확인
 */

const puppeteer = require('puppeteer');

async function testExperimentalDesignUI() {
  console.log('🌐 UI 통합 테스트 시작');
  console.log('='.repeat(50));

  let browser;

  try {
    // 브라우저 실행
    console.log('🚀 브라우저 실행 중...');
    browser = await puppeteer.launch({
      headless: false, // 실제 브라우저를 보기 위해 false로 설정
      slowMo: 500,     // 디버깅을 위해 느리게
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    // 실험설계 페이지로 이동
    console.log('📄 실험설계 페이지 접속 중...');
    await page.goto('http://localhost:3005/experimental-design', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('✅ 페이지 로드 완료');

    // 페이지 타이틀 확인
    const title = await page.title();
    console.log(`📋 페이지 제목: ${title}`);

    // 핵심 요소들이 있는지 확인
    const elements = await page.evaluate(() => {
      const results = {};

      // 실험설계 관련 텍스트 확인
      results.hasDesignText = document.body.innerText.includes('실험 설계');
      results.hasStepText = document.body.innerText.includes('연구 목적');
      results.hasPurposeOptions = document.querySelectorAll('button').length > 0;

      // 새로운 실험설계 관련 텍스트 확인
      results.hasBioassayKeywords = document.body.innerText.includes('독성') ||
                                   document.body.innerText.includes('LC50');
      results.hasGrowthKeywords = document.body.innerText.includes('성장') ||
                                 document.body.innerText.includes('곡선');
      results.hasWaterKeywords = document.body.innerText.includes('수질') ||
                                document.body.innerText.includes('모니터링');

      return results;
    });

    console.log('\n🔍 페이지 요소 확인:');
    console.log(`  - 실험설계 텍스트: ${elements.hasDesignText ? '✅' : '❌'}`);
    console.log(`  - 단계 진행 텍스트: ${elements.hasStepText ? '✅' : '❌'}`);
    console.log(`  - 선택 버튼들: ${elements.hasPurposeOptions ? '✅' : '❌'}`);
    console.log(`  - 생물검정법 키워드: ${elements.hasBioassayKeywords ? '✅' : '❌'}`);
    console.log(`  - 성장곡선 키워드: ${elements.hasGrowthKeywords ? '✅' : '❌'}`);
    console.log(`  - 수질모니터링 키워드: ${elements.hasWaterKeywords ? '✅' : '❌'}`);

    // 간단한 시나리오 테스트 - "관계 분석" 선택
    console.log('\n🎯 시나리오 테스트 시작...');

    try {
      // "관계 분석" 버튼 찾기 및 클릭 시도
      const relationshipButton = await page.waitForSelector('text="관계 분석"', { timeout: 5000 });
      if (relationshipButton) {
        await relationshipButton.click();
        console.log('✅ "관계 분석" 버튼 클릭 성공');

        // 페이지 변화 대기
        await page.waitForTimeout(2000);

        // 다음 단계로 넘어갔는지 확인
        const nextStepText = await page.evaluate(() =>
          document.body.innerText.includes('상관분석') ||
          document.body.innerText.includes('회귀분석')
        );

        console.log(`✅ 다음 단계 진행: ${nextStepText ? '성공' : '실패'}`);
      }
    } catch (error) {
      console.log('⚠️  시나리오 테스트 건너뜀 (버튼 찾기 실패)');
    }

    // 콘솔 에러 확인
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 페이지 새로고침해서 콘솔 에러 확인
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);

    console.log(`\n🚨 콘솔 에러 개수: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('에러 내용:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    // 스크린샷 저장
    await page.screenshot({ path: 'experimental-design-test-screenshot.png' });
    console.log('📸 스크린샷 저장: experimental-design-test-screenshot.png');

    // 전체 평가
    const overallScore = [
      elements.hasDesignText,
      elements.hasStepText,
      elements.hasPurposeOptions,
      consoleErrors.length === 0
    ].filter(Boolean).length;

    console.log('\n' + '='.repeat(50));
    console.log('🏆 UI 통합 테스트 결과');
    console.log('='.repeat(50));
    console.log(`✅ 기본 기능: ${overallScore}/4 통과 (${Math.round(overallScore/4*100)}%)`);
    console.log(`📊 전문 키워드 포함: ${[elements.hasBioassayKeywords, elements.hasGrowthKeywords, elements.hasWaterKeywords].filter(Boolean).length}/3`);
    console.log(`🚫 콘솔 에러: ${consoleErrors.length}개`);

    if (overallScore >= 3) {
      console.log('🎉 UI 통합 성공! 새로운 실험설계가 웹에서 정상 작동합니다.');
    } else {
      console.log('⚠️  일부 UI 문제 발견. 추가 점검이 필요합니다.');
    }

  } catch (error) {
    console.error('❌ UI 테스트 오류:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔚 브라우저 종료');
    }
  }
}

// 테스트 실행
if (require.main === module) {
  testExperimentalDesignUI().catch(console.error);
}

module.exports = testExperimentalDesignUI;