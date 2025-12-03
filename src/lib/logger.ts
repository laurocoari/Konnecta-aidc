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
  private isBrowser = typeof window !== 'undefined';

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

    const timestamp = entry.timestamp.split('T')[1].split('.')[0];

    // No navegador, usar formatação CSS ao invés de ANSI
    if (this.isBrowser) {
      return `${emoji} [${timestamp}] [${entry.category}] ${entry.message}`;
    }

    // No terminal, usar códigos ANSI
    const color = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
    }[entry.level];

    const reset = '\x1b[0m';
    return `${color}${emoji} [${timestamp}] [${entry.category}]${reset} ${entry.message}`;
  }

  private getBrowserStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #06b6d4; font-weight: normal;',
      info: 'color: #10b981; font-weight: normal;',
      warn: 'color: #f59e0b; font-weight: bold;',
      error: 'color: #ef4444; font-weight: bold;',
    };
    return styles[level];
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

    const timestamp = entry.timestamp.split('T')[1].split('.')[0];
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[entry.level];

    // Formatar mensagem para terminal (sempre aparece no terminal do Vite)
    const formatted = this.formatLog(entry);
    const dataStr = data ? (typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)) : '';
    const logMessage = `${formatted} ${message}${dataStr ? '\n' + dataStr : ''}`;
    
    // Log no terminal (sempre - Vite captura console.log/error/warn/info do navegador)
    // Usar console.log para garantir que apareça no terminal do Vite em tempo real
    switch (level) {
      case 'debug':
        console.log(logMessage);
        if (this.isBrowser) console.debug(`%c${emoji} [${timestamp}] [${category}]`, this.getBrowserStyle(level), message, data || '');
        break;
      case 'info':
        console.log(logMessage);
        if (this.isBrowser) console.info(`%c${emoji} [${timestamp}] [${category}]`, this.getBrowserStyle(level), message, data || '');
        break;
      case 'warn':
        console.warn(logMessage);
        if (this.isBrowser) console.warn(`%c${emoji} [${timestamp}] [${category}]`, this.getBrowserStyle(level), message, data || '');
        break;
      case 'error':
        console.error(logMessage);
        if (data && data.stack) {
          console.error('Stack:', data.stack);
        }
        if (this.isBrowser) {
          console.error(`%c${emoji} [${timestamp}] [${category}]`, this.getBrowserStyle(level), message, data || '');
          if (data && data.stack) {
            console.error('%cStack:', 'color: #ef4444; font-weight: bold;', data.stack);
          }
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

