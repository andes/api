"use strict";
exports.user = 'nhuenchuman';
exports.password = 'naty2017';
exports.serverSql = '10.1.232.230';
exports.serverSql2 = '10.1.232.230';
exports.databaseSql = 'SIPS_Prod';
exports.dbMigracion = 'HPN_HellerMigrarMongodb';
exports.requestTimeout = 100000;
exports.connectionTimeout = 15000;
//export const urlMongoAndes:string = 'mongodb://10.1.62.17:27017/andes';
exports.urlMongoAndes = 'mongodb://localhost:27017/andes';
//export const urlMigraSips:string = 'mongodb://10.1.62.17:27017/migrasips';
exports.urlMigraSips = 'mongodb://localhost:27017/migrasips';
//export const urlMigracion: string = 'mongodb://localhost:27017/migracion';
exports.urlMigracion = 'mongodb://localhost:27017/migracion?connectTimeoutMS=600000&socketTimeoutMS=60000';
exports.usuarioSisa = 'bcpintos';
exports.passwordSisa = '*123456';
exports.consultaPaciente = 'SELECT PAC.idPaciente,PAC.nombre, PAC.apellido, PAC.numeroDocumento,idsexo,convert(varchar(10),PAC.fechaNacimiento,103) AS fechaNacimiento, ' +
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
exports.consultaPacienteHeller = 'SELECT * ' +
    'FROM PacientesHeller ';
exports.consultaPacienteHPN = 'SELECT TOP 10 PHPN.*, PD.domicilio,PD.detalle,PD.audit_datetime as fechaDomicilio ' +
    'FROM PacientesHPN PHPN ' +
    'LEFT JOIN Pacientes_Domicilios PD ON (PHPN.id = PD.idPaciente) ' +
    'LEFT JOIN Pacientes_Contactos PC ON (PHPN.id = PC.idPaciente)';
exports.consultaPacienteHC = "SELECT * FROM Historias_Clinicas HC " +
    "LEFT JOIN Pacientes PHPN ON (PHPN.legacy_idHistoriaClinica = HC.Codigo) " +
    "LEFT JOIN Localidades L ON (HC.HC_Direccion_Localidad =L.Loc_Codigo)  " +
    "LEFT JOIN Provincias P ON (L.Loc_Provincia= P.Prov_Codigo) " +
    "WHERE HC_Dado_de_baja='" + "false'";
exports.consultaPacCluster = 'SELECT PAC.idPaciente,PAC.nombre, PAC.apellido, PAC.numeroDocumento,idsexo,convert(varchar(10),PAC.fechaNacimiento,103) AS fechaNacimiento, ' +
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
exports.consultaRelaciones = 'SELECT P.idPaciente, ' +
    'PAR.NumeroDocumento AS DocumentoRel, Par.Apellido AS ApellidoRel,Par.Nombre AS NombreRel, ' +
    'Par.tipoParentesco AS TipoParentesco ' +
    'FROM Sys_Parentesco AS Par ' +
    'LEFT JOIN Sys_Paciente AS P ON  (Par.idPaciente = P.idPaciente) ' +
    'WHERE ((P.activo =1) AND (Par.idParentesco>0) AND (Par.numeroDocumento > 0))';
//# sourceMappingURL=config.js.map