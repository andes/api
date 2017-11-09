import { Document, Schema, model } from 'mongoose';


export const ObjSIISASchema = new Schema({
    nombre: String,
    codigo: String,
    habilitado: Boolean
});

export interface SIISAObject extends Document {
    nombre: string;
    codigo: string;
    habilitado: boolean;
}



export const TipoDocumento = model<SIISAObject>('SIISATipoDocumento', ObjSIISASchema, 'siisa_tipoDocumento');
export const Sexo = model<SIISAObject>('SIISASexo', ObjSIISASchema, 'siisa_sexo');
export const Pais = model<SIISAObject>('SIISAPais', ObjSIISASchema, 'siisa_pais');
export const Profesion = model<SIISAObject>('SIISAProfesion', ObjSIISASchema, 'siisa_profesion');
export const EntidadFormadora = model<SIISAObject>('SIISAEntidadFormadora', ObjSIISASchema, 'siisa_entidadFormadora');
export const Especialidad = model<SIISAObject>('SIISAEspecialidad', ObjSIISASchema, 'especialidad');
export const ModalidadCertificacionEspecialidad = model<SIISAObject>('SIISAModalidadCertificacionEspecialidad', ObjSIISASchema, 'siisa_modalidadCertificacionEspecialidad')
export const EstablecimientoCertificador = model<SIISAObject>('SIISAEstablecimientoCertificador', ObjSIISASchema, 'siisa_establecimientoCertificador')

