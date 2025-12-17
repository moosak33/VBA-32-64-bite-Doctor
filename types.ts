export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  CONVERTING = 'CONVERTING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

export interface CompatibilityReport {
  isCompatible: boolean;
  issues: string[];
  bit32Only: boolean;
  bit64Only: boolean;
}

export interface ProcessingOptions {
  compatibility: boolean;
  formatting: boolean;
  commentsAr: boolean;
  commentsEn: boolean;
  errorHandling: boolean;
  lineNumbers: boolean;
  codeCorrection: boolean;
}