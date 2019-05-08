// [Deprecated]
const constantes = {
    SEXO: {
        type: String,
        enum: ['femenino', 'masculino', 'otro']
    },
    ESTADOCIVIL: {
        type: String,
        enum: ['casado', 'separado', 'divorciado', 'viudo', 'soltero', 'otro']
    },
    CONTACTO: {
        type: String,
        enum: ['fijo', 'celular', 'email']
    }
};
export = constantes;
