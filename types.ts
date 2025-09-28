
export enum Status {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}
