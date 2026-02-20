/**
 * 간단한 로깅 서비스
 * 개발 환경에서만 로그를 출력하고, 프로덕션에서는 필요시 외부 서비스로 전송 가능
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: Date
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logs: LogEntry[] = []

  private log(level: LogLevel, message: string, data?: unknown) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date()
    }

    // 메모리에 최근 100개 로그 저장 (디버깅용)
    this.logs.push(entry)
    if (this.logs.length > 100) {
      this.logs.shift()
    }

    // 개발 환경에서만 콘솔 출력
    if (this.isDevelopment) {
      const timestamp = entry.timestamp.toISOString()
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`

      switch (level) {
        case LogLevel.DEBUG:
          console.debug(prefix, message, data || '')
          break
        case LogLevel.INFO:
          console.info(prefix, message, data || '')
          break
        case LogLevel.WARN:
          console.warn(prefix, message, data || '')
          break
        case LogLevel.ERROR:
          console.error(prefix, message, data || '')
          break
      }
    }

    // 프로덕션 환경에서 에러는 외부 서비스로 전송 가능
    if (!this.isDevelopment && level === LogLevel.ERROR) {
      // TODO: Sentry, LogRocket 등 외부 서비스 연동
    }
  }

  debug(message: string, data?: unknown) {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: unknown) {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: unknown) {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, data?: unknown) {
    this.log(LogLevel.ERROR, message, data)
  }

  // 최근 로그 가져오기 (디버깅용)
  getRecentLogs(count?: number): LogEntry[] {
    const logsToReturn = count ? this.logs.slice(-count) : this.logs
    return [...logsToReturn]
  }

  // 로그 초기화
  clear() {
    this.logs = []
  }
}

// 싱글톤 인스턴스
export const logger = new Logger()

// 기본 export
export default logger