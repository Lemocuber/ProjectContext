export type TranscriptMode = 'live' | 'final';

export type TranscriptChunk = {
  id: string;
  text: string;
  mode: TranscriptMode;
  atMs: number;
};

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'failed';

export type AsrEvent =
  | { type: 'live'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string };

export type AsrSession = {
  stop: () => Promise<void>;
};

export type AsrSessionService = {
  start: (params: {
    apiKey: string;
    onEvent: (event: AsrEvent) => void;
  }) => Promise<AsrSession>;
};
