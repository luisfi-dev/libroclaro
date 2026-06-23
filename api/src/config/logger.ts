import * as appInsights from "applicationinsights";
import winston from "winston";

import { env } from "./env";

const transports: winston.transport[] = [new winston.transports.Console()];

// Sólo inicializar Application Insights si hay una connection string
// configurada (p. ej. en producción). En local y en los tests no se inicializa:
// el SDK arrancaría igual con `undefined`, intentaría enviar telemetría y
// dispararía imports dinámicos internos que truenan bajo Jest/Node.
if (env.APPINSIGHTS_CONNECTION_STRING) {
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

        try {
          aiClient?.trackTrace({
            message: output,
            properties: { timestamp },
          });
        } catch {
          // No dejar que un fallo de telemetría tumbe la aplicación.
        }

        return output;
      }),
    }),
  );
}

export const logger = winston.createLogger({
	level: "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json(),
	),
	transports,
});
