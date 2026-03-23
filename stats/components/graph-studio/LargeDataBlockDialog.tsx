'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LargeDataBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowCount: number;
}

/**
 * 50만행+ 데이터 차단 다이얼로그.
 * 브라우저 메모리 한계를 초과할 수 있는 데이터에 대해 안내 후 로드를 차단한다.
 */
export function LargeDataBlockDialog({
  open,
  onOpenChange,
  rowCount,
}: LargeDataBlockDialogProps): React.ReactElement {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>데이터가 너무 큽니다</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                {rowCount.toLocaleString()}행의 데이터는 브라우저 메모리 한계를
                초과하여 렌더링이 불가능합니다.
              </p>
              <p className="font-medium">권장 사항:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>데이터를 필터링하여 필요한 부분만 업로드</li>
                <li>대용량 처리에는 R 또는 Python 데스크탑 도구를 사용</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>확인</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
