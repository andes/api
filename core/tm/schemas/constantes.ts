
const constantes = {
    sexo: {
        type: String,
        enum: ["femenino", "masculino", "otro", ""]
    },
    estadoCivil: {
        type: String,
        enum: ["casado", "separado", "divorciado", "viudo", "soltero", "otro"]
    }
}
export = constantes;