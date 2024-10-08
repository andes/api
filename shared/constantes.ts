export const SEXO = {
    type: String,
    required: true,
    enum: ['femenino', 'masculino', 'otro']
};

export const GENERO = {
    type: String,
    required: true,
    enum: ['mujer', 'mujer trans', 'varon', 'varon trans', 'no binario', 'travesti', 'masculinidad trans', 'femenino', 'masculino', 'otro']
};

export const ESTADOCIVIL = {
    type: String,
    enum: ['casado', 'separado', 'divorciado', 'viudo', 'soltero', 'concubino', 'otro', null]
};

export const PARENTESCO = {
    type: String,
    enum: ['progenitor/a', 'hijo', 'hermano', 'tutor', 'tutelado']
};

export const ESTADO = {
    type: String,
    required: true,
    enum: ['temporal', 'validado', 'recienNacido', 'extranjero']
};

export const IDENTIFICACION = {
    type: String,
    required: false,
    enum: ['dni extranjero', 'pasaporte', null]
};

export const CONTACTO = {
    type: String,
    enum: ['fijo', 'celular', 'email']
};
