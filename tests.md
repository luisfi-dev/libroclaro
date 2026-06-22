Estrategia de Calidad de Software — Checklist Completo

# 6. Pruebas de Rendimiento
k6 / Artillery · Load · Stress · Spike · Soak

### 6.2 Tipos de prueba de rendimiento - Cumplir con todos los puntos

| | Ítem | Responsable | Estado |
|---|---|---|---|
| [ ] | **Load Test:** usuarios esperados en producción por 10 minutos con ramp-up de 5 min | QA/DevOps | |
| [ ] | **Stress Test:** aumentar usuarios hasta encontrar el punto de quiebre del sistema | QA/DevOps | |
| [ ] | **Spike Test:** pico repentino de 10x el tráfico normal por 1 minuto | QA/DevOps | |
| [ ] | **Soak Test (Endurance):** carga normal por 2 horas para detectar memory leaks | QA/DevOps | |


Estrategia de Calidad de Software — Checklist Completo

# 7. Pruebas de Seguridad
OWASP ZAP · Snyk · Checklist OWASP Top 10

### 7.1 OWASP Top 10 — verificación por vulnerabilidad - Cumplir con al menos 3 puntos

| | Ítem | Responsable | Estado |
|---|---|---|---|
| [ ] | A01 — Broken Access Control: endpoints protegidos solo por roles correctos | Security/QA | |
| [ ] | A01 — Tests de autorización: usuario A no puede ver/modificar datos de usuario B | Security/QA | |
| [ ] | A02 — Cryptographic Failures: passwords hasheados con bcrypt/argon2 (nunca MD5/SHA1) | Dev | |
| [ ] | A02 — Datos sensibles no aparecen en logs ni en respuestas de error | Dev | |
| [ ] | A03 — Injection SQL: todos los queries usan prepared statements o ORM | Dev | |
| [ ] | A03 — Injection NoSQL: inputs sanitizados antes de queries en MongoDB | Dev | |
| [ ] | A03 — XSS: outputs de datos del usuario son escapados en el frontend | Dev | |
| [ ] | A04 — Insecure Design: threat modeling documentado para flujos críticos | Arquitecto | |
| [ ] | A05 — Security Misconfiguration: headers de seguridad presentes (helmet.js) | Dev | |
| [ ] | A05 — CORS configurado restrictivamente (no wildcard * en producción) | Dev | |
| [ ] | A05 — Mensajes de error genéricos en producción (sin stack traces) | Dev | |
| [ ] | A06 — Vulnerable Components: Snyk o npm audit en el pipeline de CI | DevOps | |
| [ ] | A06 — Dependencias actualizadas, sin CVEs de severidad crítica o alta | Dev | |
| [ ] | A07 — Auth Failures: rate limiting en login (máx 5 intentos por IP/minuto) | Dev | |
| [ ] | A07 — Tokens JWT con expiración, algoritmo seguro (RS256 o HS256 mínimo) | Dev | |
| [ ] | A07 — Refresh tokens con rotación y revocación implementada | Dev | |
| [ ] | A08 — Software Integrity: dependencias con checksums verificados (lockfile) | Dev | |
| [ ] | A09 — Logging: todas las operaciones críticas logeadas con audit trail | Dev | |
| [ ] | A09 — Alertas configuradas para anomalías de seguridad | DevOps | |