const constantes = {
    SEXO: {
        type: String,
        enum: ['femenino', 'masculino', 'otro']
    },
    ESTADOCIVIL: {
        type: String,
        enum: ['casado', 'separado', 'divorciado', 'viudo', 'soltero', 'concubino', 'otro']
    },
     PARENTEZCO : {
        type: String,
        enum: ['padre', 'madre', 'hijo', 'hermano', 'tutor']
     },
     ESTADO : {
         type: String,
         enum: ['temporal', 'validado', 'recienNacido', 'extranjero']
     }
};
export = constantes;
