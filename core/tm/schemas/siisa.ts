import { Document, Schema, model } from 'mongoose';


export const ObjSIISASchema = new Schema({
    nombre: String,
    codigo: Number,
    tipoDeFormacion: String,
    habilitado: Boolean,
    profesionCodigoRef: Number
});

export interface SIISAObject extends Document {
    nombre: string;
    codigo: Number;
    tipoDeFormacion: String;
    habilitado: boolean;
}
export interface SIISAEspecialidad extends Document {
    nombre: string;
    codigo: { sisa: number };
    tipoDeFormacion: String;
    habilitado: boolean;
}

export const EspecialidadSIISASchema = new Schema({
    nombre: String,
    codigo: { sisa: Number },
    tipoDeFormacion: String,
    habilitado: Boolean,
    profesionCodigoRef: Number
});

export const TipoDocumento = model<SIISAObject>('SIISATipoDocumento', ObjSIISASchema, 'siisa_tipoDocumento');
export const Sexo = model<SIISAObject>('SIISASexo', ObjSIISASchema, 'siisa_sexo');
export const Pais = model<SIISAObject>('SIISAPais', ObjSIISASchema, 'siisa_pais');
export const Profesion = model<SIISAObject>('SIISAProfesion', ObjSIISASchema, 'profesion');
export const EntidadFormadora = model<SIISAObject>('SIISAEntidadFormadora', ObjSIISASchema, 'siisa_entidadFormadora');
export const Especialidad = model<SIISAEspecialidad>('SIISAEspecialidad', EspecialidadSIISASchema, 'especialidad');
export const ModalidadCertificacionEspecialidad = model<SIISAObject>('SIISAModalidadCertificacionEspecialidad', ObjSIISASchema, 'siisa_modalidadCertificacionEspecialidad');
export const EstablecimientoCertificador = model<SIISAObject>('SIISAEstablecimientoCertificador', ObjSIISASchema, 'siisa_establecimientoCertificador');

