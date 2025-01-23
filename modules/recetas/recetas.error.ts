export class RecetaNotFound extends Error {
    status = 400;
    message = 'receta no encontrada';
}

export class ParamsIncorrect extends Error {
    status = 400;
    message = 'parámetros incorrectos';
}
