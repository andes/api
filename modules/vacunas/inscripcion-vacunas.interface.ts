export interface IVacunasInscripcion {
    fechaRegistro: Date;
    documento: String;
    nombre: String;
    apellido: String;
    fechaNacimiento: Date;
    sexo: String;
    grupo: any;
    estado: String;
    validado: Boolean;
    validaciones: [String];
    relacion: String;
}
