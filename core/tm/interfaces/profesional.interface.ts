export interface IProfesional {
    nombre: string;
    apellido: string;
    documento: string;
    fechaNacimiento: Date;
    sexo: string;
    genero: string;
    profesionExterna?: any;
    matriculaExterna?: string;
    formacionPosgrado?: any;
    formacionGrado?: any;
    profesionalMatriculado?: boolean;
}
