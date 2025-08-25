import winston from 'winston';
import path from 'path';
import os from 'os';
import fs from 'fs';

export class Logger {
  private winston: winston.Logger;
  
  constructor() {
    const logDir = path.join(os.homedir(), '.musubi', 'logs');
    try { fs.mkdirSync(logDir, { recursive: true }); } catch (_) {}
    
    this.winston = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      this.winston.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }
  
  info(message: string, ...meta: any[]): void {
    this.winston.info(message, ...meta);
  }
  
  error(message: string, error?: any): void {
    this.winston.error(message, error);
  }
  
  warn(message: string, ...meta: any[]): void {
    this.winston.warn(message, ...meta);
  }
  
  debug(message: string, ...meta: any[]): void {
    this.winston.debug(message, ...meta);
  }
}
