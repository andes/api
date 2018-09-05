
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
    // progreso
    // codigoSisa: '50580352167107',
    // idSips: '217'
    // mariano moreno
    // codigoSisa: '50580352167101',
    // idSips: '208'
    // villa farrel
    codigoSisa: '50580352167126',
    idSips: '207'
};

