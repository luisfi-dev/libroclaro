import './commands';

// react-pdf carga su worker de pdfjs de forma asíncrona; en headless puede emitir
// errores no críticos que no deben tumbar pruebas cuyo objetivo no es el render del
// canvas (estrategia pragmática acordada para el lector PDF).
Cypress.on('uncaught:exception', (err) => {
  if (/pdf|worker|GlobalWorkerOptions|Cannot (resolve|load)/i.test(err.message)) {
    return false;
  }
  return undefined;
});
