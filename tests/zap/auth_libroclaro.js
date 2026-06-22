// ZAP Authentication Script — LibroClaro
// Tipo: authentication  |  Motor: ECMAScript : Graal.js
//
// Envía POST /api/auth/login con las credenciales del usuario activo
// y devuelve el mensaje HTTP para que ZAP lo use como referencia de sesión.
//
// Parámetros del contexto requeridos:
//   loginUrl  — URL completa del endpoint de login
//               (ej. http://localhost:4000/api/auth/login)

function authenticate(helper, paramsValues, credentials) {
    var HttpRequestHeader = Java.type('org.parosproxy.paros.network.HttpRequestHeader');
    var HttpHeader        = Java.type('org.parosproxy.paros.network.HttpHeader');
    var URI               = Java.type('org.apache.commons.httpclient.URI');

    var loginUrl = paramsValues.get('loginUrl');
    var uri      = new URI(loginUrl, false);

    var requestHeader = new HttpRequestHeader(
        HttpRequestHeader.POST, uri, HttpHeader.HTTP11
    );
    requestHeader.setHeader(HttpHeader.CONTENT_TYPE, 'application/json');

    var body = JSON.stringify({
        email:    credentials.getParam('username'),
        password: credentials.getParam('password')
    });

    var msg = helper.prepareMessage();
    msg.setRequestHeader(requestHeader);
    msg.setRequestBody(body);
    requestHeader.setContentLength(msg.getRequestBody().length());

    helper.sendAndReceive(msg);

    return msg;
}

function getRequiredParamsNames() {
    return ['loginUrl'];
}

function getOptionalParamsNames() {
    return [];
}

function getCredentialsParamsNames() {
    return ['username', 'password'];
}
