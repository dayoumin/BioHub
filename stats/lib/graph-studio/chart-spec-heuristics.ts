export const ID_LIKE_TOKENS = new Set([
  'id', 'idx', 'uuid', 'accession',
  '아이디', '식별자', '번호',
]);

export const CATEGORY_FRIENDLY_TOKENS = new Set([
  'group', 'treatment', 'condition', 'cohort', 'class', 'category',
  'type', 'species', 'sex', 'genotype', 'cluster', 'batch', 'arm',
  '그룹', '군', '처리군', '처리', '조건', '코호트', '분류',
  '범주', '유형', '종', '성별', '유전자형', '군집', '배치',
]);

export const TIME_LIKE_TOKENS = new Set([
  'time', 'date', 'day', 'week', 'month', 'year', 'hour', 'minute',
  'second',
  '시간', '날짜', '일', '주', '월', '년', '시', '분', '초',
]);

export const RESPONSE_LIKE_TOKENS = new Set([
  'value', 'score', 'amount', 'total', 'count', 'rate', 'ratio',
  'weight', 'response', 'outcome', 'expression', 'abundance',
  'concentration', 'level', 'intensity', 'signal',
  '값', '점수', '양', '합계', '개수', '비율',
  '무게', '체중', '반응', '결과', '발현', '농도', '수준', '강도', '신호',
]);

export const PREDICTOR_LIKE_TOKENS = new Set([
  'time', 'date', 'day', 'week', 'month', 'year', 'visit', 'age',
  'dose', 'temperature', 'temp', 'length', 'height', 'width',
  'concentration', 'level', 'intensity',
  'depth', 'distance', 'size', 'volume',
  '시간', '날짜', '일', '주', '월', '년', '방문', '방문일', '연령', '나이',
  '용량', '온도', '길이', '체장', '신장', '키', '너비', '깊이', '거리', '크기', '부피',
  '농도', '수준', '강도',
]);

export function normalizeFieldName(name: string): string[] {
  return name
    .replace(/([\p{L}\p{N}])([A-Z])/gu, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export function hasToken(tokens: string[], dictionary: Set<string>): boolean {
  return tokens.some((token) => dictionary.has(token));
}

export function hasIdLikeName(tokens: string[]): boolean {
  if (hasToken(tokens, ID_LIKE_TOKENS)) return true;
  if (tokens.length === 1 && (tokens[0] === 'row' || tokens[0] === 'index')) return true;
  if (tokens.some((token) =>
    token === '환자번호' ||
    token === '샘플번호' ||
    token === '검체번호' ||
    token === '대상자번호' ||
    token === '개체번호'
  )) {
    return true;
  }
  return tokens.some((token, index) => {
    const nextToken = tokens[index + 1];
    return token === 'sample' && nextToken === 'id' ||
      token === 'subject' && nextToken === 'id' ||
      token === 'patient' && nextToken === 'id' ||
      token === 'participant' && nextToken === 'id' ||
      token === 'row' && nextToken === 'index' ||
      token === 'record' && nextToken === 'index' ||
      token === '샘플' && (nextToken === 'id' || nextToken === '번호') ||
      token === '검체' && (nextToken === 'id' || nextToken === '번호') ||
      token === '환자' && (nextToken === 'id' || nextToken === '번호') ||
      token === '대상자' && (nextToken === 'id' || nextToken === '번호') ||
      token === '개체' && (nextToken === 'id' || nextToken === '번호') ||
      token === '행' && nextToken === '번호';
  });
}
