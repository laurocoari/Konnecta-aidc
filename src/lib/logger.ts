/**
 * Sistema de Logging Estruturado
 * Logs aparecem no console do terminal durante desenvolvimento
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatLog(entry: LogEntry): string {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[entry.level];

    const color = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
    }[entry.level];

    const reset = '\x1b[0m';
    const timestamp = entry.timestamp.split('T')[1].split('.')[0];

    return `${color}${emoji} [${timestamp}] [${entry.category}]${reset} ${entry.message}`;
  }

  private log(level: LogLevel, category: string, message: string, data?: any) {
    if (!this.isDevelopment && level === 'debug') {
      return; // Não mostrar debug em produção
    }

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      category,
      message,
      data,
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case 'debug':
        console.debug(formatted, data || '');
        break;
      case 'info':
        console.info(formatted, data || '');
        break;
      case 'warn':
        console.warn(formatted, data || '');
        break;
      case 'error':
        console.error(formatted, data || '');
        if (data) {
          console.error('Stack:', data.stack || '');
        }
        break;
    }
  }

  debug(category: string, message: string, data?: any) {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data);
  }

  // Métodos específicos para categorias comuns
  auth(message: string, data?: any) {
    this.info('AUTH', message, data);
  }

  api(message: string, data?: any) {
    this.info('API', message, data);
  }

  db(message: string, data?: any) {
    this.debug('DB', message, data);
  }

  ui(message: string, data?: any) {
    this.debug('UI', message, data);
  }
}

export const logger = new Logger();

// Log de inicialização do sistema
if (import.meta.env.DEV) {
  logger.info('SYSTEM', '🚀 Sistema iniciado em modo desenvolvimento');
  logger.info('SYSTEM', `Ambiente: ${import.meta.env.MODE}`);
  logger.info('SYSTEM', `URL Base: ${import.meta.env.VITE_SUPABASE_URL || 'Não configurado'}`);
}

