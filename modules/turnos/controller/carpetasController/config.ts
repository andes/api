export const user = 'nhuenchuman';
export const password = 'naty2017';
export const serverSql = '10.1.232.229';
export const serverSql2 = '10.1.232.229';
export const databaseSql = 'SIPS';
export const dbMigracion = 'SIPS';
export const requestTimeout = 100000;
export const connectionTimeout = 15000;

export const dbMssql = {
    user: 'nhuenchuman',
    password: 'naty2017',
    server: '10.1.232.229',
    database: 'SIPS',
    // port: 20008,
    requestTimeout: 190000,
    stream: true,
};


// export const urlMongoAndes:string = 'mongodb://10.1.62.17:27017/andes';
// export const urlMongoAndes:string = 'mongodb://murbano:lagartij0r@mongolito.hospitalneuquen.org.ar/andes?authSource=admin';
// export const urlMongoAndes:string = 'mongodb://admin:golitoMon04@andeshpn.hospitalneuquen.org.ar/andes?authSource=admin';
// export const urlMongoAndes: string = 'mongodb://admin:golitoMon04@10.1.72.7:27022/andes';
export const urlMongoAndes = 'mongodb://localhost:27017/andes';
// export const urlMigraSips:string = 'mongodb://10.1.62.17:27017/migrasips';
export const urlMigraSips = 'mongodb://localhost:27017/migrasips';
// export const urlMigracion: string = 'mongodb://localhost:27017/migracion';
export const urlMigracion = 'mongodb://localhost:27017/migracion?connectTimeoutMS=600000&socketTimeoutMS=60000';
export const urlMigracionAndes = 'mongodb://localhost:27017/andes?connectTimeoutMS=600000&socketTimeoutMS=60000';

export const usuarioSisa = 'bcpintos';
export const passwordSisa = '*123456';

export const consultaPaciente = 'SELECT PAC.idPaciente,PAC.nombre, PAC.apellido, convert(varchar(20),PAC.numeroDocumento) as numeroDocumento,idsexo,convert(varchar(10),PAC.fechaNacimiento,103) AS fechaNacimiento, ' +
    'PAC.calle, PAC.numero, PAC.piso, PAC.departamento, PAC.manzana, PAC.lote, PAC.parcela, L.idLocalidad,' +
    'L.nombre AS nombreLocalidad, L.codigoPostal, PROVINCIA.nombre as nombreProvincia,PAC.idProvinciaDomicilio, PAIS.nombre as nombrePais, PAC.idPais, ' +
    'PAC.informacionContacto, convert(varchar(10),PAC.fechaAlta,103) AS fechaAlta, convert(varchar(10),PAC.fechaDefuncion,103) AS fechaDefuncion, convert(varchar(10),PAC.fechaUltimaActualizacion,103) AS fechaUltimaActualizacion, PAC.telefonofijo, ' +
    'PAC.telefonocelular, PAC.email, ESTCIVIL.idEstadoCivil, MOTNI.idMotivoNI, MOTNI.nombre AS nombreMotivo ' +
    'FROM sys_paciente AS PAC ' +
    'LEFT JOIN dbo.Sys_EstadoCivil AS ESTCIVIL ON (ESTCIVIL.idEstadoCivil = PAC.idEstadoCivil) ' +
    'LEFT JOIN dbo.Sys_MotivoNI AS MOTNI ON (MOTNI.idMotivoNI = PAC.idMotivoNI) ' +
    'INNER JOIN sys_pais AS PAIS ON (PAIS.idPais = PAC.idPais) ' +
    'LEFT JOIN dbo.Sys_Provincia AS PROVINCIA ON (PROVINCIA.idProvincia = PAC.idProvinciaDomicilio) ' +
    'LEFT JOIN dbo.Sys_Localidad AS L ON (L.idLocalidad=Pac.idLocalidad) ' +
    'WHERE PAC.activo = 1 ';

export const consultaPacienteSipsHC = `SELECT PAC.idPaciente,PAC.nombre, PAC.apellido, convert(varchar(20),PAC.numeroDocumento) as numeroDocumento,idsexo,convert(varchar(10),PAC.fechaNacimiento,103) AS fechaNacimiento,
     PAC.calle, rhe.historiaClinica as historiaClinica, efector.nombre as efector, efector.idEfector as efectorId, PAC.piso, PAC.departamento, PAC.manzana, PAC.lote, PAC.parcela, L.idLocalidad,
     L.nombre AS nombreLocalidad, L.codigoPostal, PROVINCIA.nombre as nombreProvincia,PAC.idProvinciaDomicilio, PAIS.nombre as nombrePais, PAC.idPais,
     PAC.informacionContacto, convert(varchar(10),PAC.fechaAlta,103) AS fechaAlta, convert(varchar(10),PAC.fechaDefuncion,103) AS fechaDefuncion, convert(varchar(10),PAC.fechaUltimaActualizacion,103) AS fechaUltimaActualizacion, PAC.telefonofijo,
     PAC.telefonocelular, PAC.email, ESTCIVIL.idEstadoCivil, MOTNI.idMotivoNI, MOTNI.nombre AS nombreMotivo
     FROM dbo.sys_paciente AS PAC
     inner join dbo.Sys_RelHistoriaClinicaEfector AS rhe ON rhe.idPaciente = pac.idPaciente
     inner join dbo.Sys_Efector as efector on rhe.idefector = efector.idEfector
     LEFT JOIN dbo.Sys_EstadoCivil AS ESTCIVIL ON (ESTCIVIL.idEstadoCivil = PAC.idEstadoCivil)
     LEFT JOIN dbo.Sys_MotivoNI AS MOTNI ON (MOTNI.idMotivoNI = PAC.idMotivoNI)
     INNER JOIN sys_pais AS PAIS ON (PAIS.idPais = PAC.idPais)
     LEFT JOIN dbo.Sys_Provincia AS PROVINCIA ON (PROVINCIA.idProvincia = PAC.idProvinciaDomicilio)
     LEFT JOIN dbo.Sys_Localidad AS L ON (L.idLocalidad=Pac.idLocalidad)
     WHERE PAC.activo = 1`;

export const consultaCarpetaPacienteSips = `SELECT PAC.idPaciente,PAC.nombre, PAC.apellido, convert(varchar(20),PAC.numeroDocumento) as numeroDocumento,idsexo,convert(varchar(10),PAC.fechaNacimiento,103) AS fechaNacimiento,
     PAC.calle, rhe.historiaClinica as historiaClinica FROM dbo.sys_paciente AS PAC
     inner join dbo.Sys_RelHistoriaClinicaEfector AS rhe ON rhe.idPaciente = pac.idPaciente
     WHERE PAC.activo = 1`;

export const consultaPacienteHeller = 'SELECT * ' +
    'FROM PacientesHeller ';

export const consultaPacienteHPN = 'SELECT TOP 10 PHPN.*, PD.domicilio,PD.detalle,PD.audit_datetime as fechaDomicilio ' +
    'FROM PacientesHPN PHPN ' +
    'LEFT JOIN Pacientes_Domicilios PD ON (PHPN.id = PD.idPaciente) ' +
    'LEFT JOIN Pacientes_Contactos PC ON (PHPN.id = PC.idPaciente)';

export const consultaPacienteHC = `SELECT * FROM Historias_Clinicas HC
     LEFT JOIN Pacientes PHPN ON (PHPN.legacy_idHistoriaClinica = HC.Codigo)
     LEFT JOIN Localidades L ON (HC.HC_Direccion_Localidad =L.Loc_Codigo)
     LEFT JOIN Provincias P ON (L.Loc_Provincia= P.Prov_Codigo)
     WHERE HC_Dado_de_baja='" + "false'`;

export const consultaPacCluster = 'SELECT PAC.idPaciente,PAC.nombre, PAC.apellido, PAC.numeroDocumento,idsexo,convert(varchar(10),PAC.fechaNacimiento,103) AS fechaNacimiento, ' +
    'PAC.calle, PAC.numero, PAC.piso, PAC.departamento, PAC.manzana, PAC.lote, PAC.parcela, L.idLocalidad,' +
    'L.nombre AS nombreLocalidad, L.codigoPostal, PROVINCIA.nombre as nombreProvincia,PAC.idProvinciaDomicilio, PAIS.nombre as nombrePais, PAC.idPais, ' +
    'PAC.informacionContacto, convert(varchar(10),PAC.fechaAlta,103) AS fechaAlta, convert(varchar(10),PAC.fechaDefuncion,103) AS fechaDefuncion, convert(varchar(10),PAC.fechaUltimaActualizacion,103) AS fechaUltimaActualizacion, PAC.telefonofijo, ' +
    'PAC.telefonocelular, PAC.email, ESTCIVIL.idEstadoCivil, MOTNI.idMotivoNI, MOTNI.nombre AS nombreMotivo, CP.cluster_id ' +
    'FROM sys_paciente AS PAC ' +
    'LEFT JOIN dbo.Sys_EstadoCivil AS ESTCIVIL ON (ESTCIVIL.idEstadoCivil = PAC.idEstadoCivil) ' +
    'LEFT JOIN dbo.Sys_MotivoNI AS MOTNI ON (MOTNI.idMotivoNI = PAC.idMotivoNI) ' +
    'INNER JOIN sys_pais AS PAIS ON (PAIS.idPais = PAC.idPais) ' +
    'LEFT JOIN dbo.Sys_Provincia AS PROVINCIA ON (PROVINCIA.idProvincia = PAC.idProvinciaDomicilio) ' +
    'LEFT JOIN dbo.Sys_Localidad AS L ON (L.idLocalidad=Pac.idLocalidad) ' +
    'LEFT JOIN dbo.clusterPacientes2 AS CP ON (CP.record_id = Pac.idPaciente) ' +
    'WHERE PAC.activo = 1 and (PAC.idPaciente>=@inicio and PAC.idPaciente<=@fin)';

export const consultaRelaciones = 'SELECT P.idPaciente, ' +
    'PAR.NumeroDocumento AS DocumentoRel, Par.Apellido AS ApellidoRel,Par.Nombre AS NombreRel, ' +
    'Par.tipoParentesco AS TipoParentesco ' +
    'FROM Sys_Parentesco AS Par ' +
    'LEFT JOIN Sys_Paciente AS P ON  (Par.idPaciente = P.idPaciente) ' +
    'WHERE ((P.activo =1) AND (Par.idParentesco>0) AND (Par.numeroDocumento > 0))';

export const consultaCie10 = 'SELECT * FROM Sys_CIE10 order by ID '
    + 'offset @offset rows fetch next @limit rows only';

export const weights = {
    identity: 0.55,
    name: 0.10,
    gender: 0.3,
    birthDate: 0.05
};

export const organizacionSips = {
    codigoSisa: '50580352167107',
    idSips: '217'
};


