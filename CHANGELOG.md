# Changelog

## [3.1.0] - 2018-06-14

#### Added

* Se agrega nueva fuente de autenticación para pacientes en MPI. Permite realizar la validación de una persona a partir del dni y del sexo. [#305](https://github.com/andes/api/pull/305)
* Permite validar los datos de un paciente temporal visualizando todos sus datos y foto.
* Prestamos manuales de carpetas: Permite realizar el préstamo de una carpeta sin que exista un turno relacionado. [#315](https://github.com/andes/api/pull/305)
* Historial de turnos de paciente: Se muestra el histórico del paciente de todos los turnos en cualquier efector
* Reportes C2: se agrega detalle de los pacientes por diagnóstico c2. Se agrega control que los diagnósticos sean Primera Vez y principal. [#317](https://github.com/andes/api/pull/305)
* Fix de screening de otoemisión

## [3.2.0] - 2018-06-21

#### Added

* Se introducen mejoras al scheduler
* Cada ejecución se realiza en un proceso aparte.
* Se corrigen los Jobs que notifiquen cuando termina sus proceso.
* Agrega control de los procesos hijos que se están corriendo.
* Se previene el solapamiento de jobs.

## [3.2.1] - 2018-06-25

* Reporte C2: el reporte verifica sólo los diagnósticos marcados como primera vez
(https://github.com/andes/api/pull/333)
