export const SEXO = {
    type: String,
    required: true,
    es_indexed: true,
    enum: ['femenino', 'masculino', 'otro']
};

export const ESTADOCIVIL = {
    type: String,
    enum: ['casado', 'separado', 'divorciado', 'viudo', 'soltero', 'concubino', 'otro', null]
};

export const PARENTESCO = {
    type: String,
    enum: ['progenitor/a', 'hijo', 'hermano', 'tutor']
};

export const ESTADO = {
    type: String,
    required: true,
    enum: ['temporal', 'validado', 'recienNacido', 'extranjero']
};

export const IDENTIFICACION = {
    type: String,
    enum: ['documentoExtranjero', 'pasaporte']
};

export const CONTACTO = {
    type: String,
    enum: ['fijo', 'celular', 'email']
};
