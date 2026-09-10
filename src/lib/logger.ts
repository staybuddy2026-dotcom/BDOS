type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(context ? { context } : {}),
    };
  }

  info(message: string, context?: LogContext) {
    console.log(JSON.stringify(this.formatMessage('info', message, context)));
  }

  warn(message: string, context?: LogContext) {
    console.warn(JSON.stringify(this.formatMessage('warn', message, context)));
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorDetails = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };

    console.error(
      JSON.stringify(
        this.formatMessage('error', message, {
          ...context,
          error: errorDetails,
        })
      )
    );
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify(this.formatMessage('debug', message, context)));
    }
  }
}

export const logger = new Logger();
