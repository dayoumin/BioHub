import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBase64File, sanitizeFilename } from '@/lib/graph-studio/export-utils';

describe('sanitizeFilename', () => {
  it('특수문자를 underscore로 치환한다', () => {
    expect(sanitizeFilename('My Chart (2024)')).toBe('My_Chart__2024_');
  });

  it('빈 문자열은 fallback으로 대체한다', () => {
    expect(sanitizeFilename('')).toBe('chart');
  });

  it('undefined은 fallback으로 대체한다', () => {
    expect(sanitizeFilename(undefined)).toBe('chart');
  });

  it('커스텀 fallback을 지원한다', () => {
    expect(sanitizeFilename('', 'export')).toBe('export');
  });
});

describe('downloadBase64File', () => {
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLSpy as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURLSpy as typeof URL.revokeObjectURL;

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { click: clickSpy, href: '', download: '' } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });

    // fetch(data:...) → Blob mock
    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['hello'], { type: 'text/plain' })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetch(data:...) 방식으로 base64를 Blob으로 변환하고 다운로드를 트리거한다', async () => {
    await downloadBase64File('SGVsbG8=', 'application/pdf', 'test-file', 'pdf');

    expect(globalThis.fetch).toHaveBeenCalledWith('data:application/pdf;base64,SGVsbG8=');
    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(appendChildSpy).toHaveBeenCalledOnce();
    expect(removeChildSpy).toHaveBeenCalledOnce();
  });

  it('파일명에 특수문자가 있으면 underscore로 치환한다', async () => {
    await downloadBase64File('AA==', 'application/pdf', 'My Chart (2024)', 'pdf');

    const link = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(link.download).toBe('My_Chart__2024_.pdf');
  });

  it('빈 파일명은 chart로 폴백한다', async () => {
    await downloadBase64File('AA==', 'image/png', '', 'png');

    const link = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(link.download).toBe('chart.png');
  });
});
