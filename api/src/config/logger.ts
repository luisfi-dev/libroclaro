import winston from 'winston';

const connectionString = process.env.APPINSIGHTS_CONNECTION_STRING;

if (connectionString) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const appInsights = require('applicationinsights') as typeof import('applicationinsights');
  appInsights
    .setup(connectionString)
    .setSendLiveMetrics(true)
    .setAutoCollectConsole(false)
    .start();

  const aiClient = appInsights.defaultClient;

  const aiFormat = winston.format((info) => {
    const severityMap: Record<string, number> = { error: 4, warn: 3, info: 2, debug: 1 };
    aiClient.trackTrace({
      message: `[${info.level}] ${info.message}`,
      severity: severityMap[info.level] ?? 1,
      properties: { timestamp: String(info.timestamp ?? '') },
    } as any);
    return info;
  });

  winston.configure({
    format: winston.format.combine(winston.format.timestamp(), aiFormat()),
    transports: [],
  });
}

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
          const metaKeys = Object.keys(meta);
          const metaStr = metaKeys.length > 0 ? ` ${JSON.stringify(meta)}` : '';
          const base = `${timestamp} [${level}]: ${message}${metaStr}`;
          return stack ? `${base}\n${stack}` : base;
        }),
      ),
    }),
  ],
});
