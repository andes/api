export interface IProfesional {
    nombre: string;
    apellido: string;
    documento: string;
    fechaNacimiento: Date;
    sexo: string;
    genero: string;
    profesionExterna?: any;
    matriculaExterna?: any;
    formacionPosgrado?: any;
    formacionGrado?: any;
    profesionalMatriculado?: any;
}
