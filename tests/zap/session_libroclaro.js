// ZAP Session Management Script — LibroClaro
// Tipo: session  |  Motor: ECMAScript : Graal.js
//
// Extrae el JWT del cuerpo de la respuesta de login y lo inyecta
// como header "Authorization: Bearer <token>" en cada petición
// que ZAP envíe al sitio dentro del contexto.

function extractWebSession(sessionWrapper) {
    try {
        var responseBody = sessionWrapper.getHttpMessage()
                                         .getResponseBody()
                                         .toString();
        var json = JSON.parse(responseBody);
        if (json && json.token) {
            sessionWrapper.getSession().setValue('jwt', json.token);
        }
    } catch (e) {
        // No era una respuesta de login — ignorar
    }
}

function clearWebSessionIdentifiers(sessionWrapper) {
    sessionWrapper.getSession().setValue('jwt', null);
}

function processMessageToMatchSession(sessionWrapper) {
    var token = sessionWrapper.getSession().getValue('jwt');
    if (token) {
        sessionWrapper.getHttpMessage()
                       .getRequestHeader()
                       .setHeader('Authorization', 'Bearer ' + token);
    }
}

function getRequiredParamsNames() {
    return [];
}

function getOptionalParamsNames() {
    return [];
}
