// All API errors have the shape { code, message, params? }.
// - code: stable identifier the frontend translates into the user's language
//   (client/src/i18n/locales/*.json, under "errors")
// - message: English description for developers (logs, curl, devtools)
// - params: values the translated text needs, e.g. { minutes: 5 }
export function errorBody(code, message, params) {
    return params ? { code, message, params } : { code, message };
}

export function sendError(res, status, code, message, params) {
    return res.status(status).json(errorBody(code, message, params));
}
