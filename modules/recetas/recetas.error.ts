export class RecetaNotFound extends Error {
    status = 400;
    message = 'receta no encontrada';
}

export class ParamsIncorrect extends Error {
    status = 400;
    message = 'parámetros incorrectos';
    constructor(motivo?: string) {
        super();
        this.message = motivo ? this.message + '. Motivo: ' + motivo : this.message;
    }
}

export class RecetaNotEdit extends Error {
    status = 400;
    message = 'La receta no se puede modificar';
    constructor(motivo?: string) {
        super();
        this.message = motivo ? this.message + '. Motivo: ' + motivo : this.message;
    }
}

