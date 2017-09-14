const constantes = {
    SEXO: {
        type: String,
        required: true,
        es_indexed: true,
        enum: ['femenino', 'masculino', 'otro']
    }
};
export = constantes;
