import winston from "winston";

import { env } from "./env";

const transports: winston.transport[] = [new winston.transports.Console()];

const appInsights =
  require('applicationinsights') as typeof import('applicationinsights');

appInsights
  .setup(env.APPINSIGHTS_CONNECTION_STRING)
  .setSendLiveMetrics(true)
  .setAutoCollectConsole(false)
  .start();

const aiClient = appInsights.defaultClient;
transports.push(
  new winston.transports.Console({
    format: winston.format.printf(({ level, message, timestamp }) => {
      const output = `[${level} ${message} ${timestamp}]`;

      aiClient?.trackTrace({
        message: output,
        properties: { timestamp },
      });

      return output;
    }),
  }),
);

export const logger = winston.createLogger({
	level: "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json(),
	),
	transports,
});
