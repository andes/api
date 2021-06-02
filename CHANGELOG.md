# [5.48.0](https://github.com/andes/api/compare/v5.47.0...v5.48.0) (2021-06-02)


### Bug Fixes

* **mpi:** quita versión anterior del controller de mpi ([#1404](https://github.com/andes/api/issues/1404)) ([543ea99](https://github.com/andes/api/commit/543ea990136850b98ce48ffef1a13151205e8563))
* **relaciones:** control array vacío ([#1412](https://github.com/andes/api/issues/1412)) ([4e2fd09](https://github.com/andes/api/commit/4e2fd09dcbe9823e148e4e5476350be19167ee9d))
* **rup:** busqueda de conceptos por pacientes vinculados ([#1402](https://github.com/andes/api/issues/1402)) ([f01dfa5](https://github.com/andes/api/commit/f01dfa595a2176139a7b2ac243bf29ab7c24293d))


### Features

* **am:** registro de familiares desde la app ([#1386](https://github.com/andes/api/issues/1386)) ([550a418](https://github.com/andes/api/commit/550a41827eb2a6dfd0eac4eeedbc7180763a4de7))
* **COM:** envio mail a org destino ([42419d0](https://github.com/andes/api/commit/42419d035531e7b9e5e8de492d77b6f17067153b))
* **fichaEpidemiologia:** Se agrega al esquema de paciente de la ficha la identificacion de extrajero ([2dae73c](https://github.com/andes/api/commit/2dae73cb759e7e0b47ca0494f10efdddc698ee54))
* **FORMS:** restrict formBuilder visibility ([473e987](https://github.com/andes/api/commit/473e987a9e475225d7f904c078a04df7ba6467f5))
* **mpi:** aplica mayúscula al guardar alias del paciente ([#1406](https://github.com/andes/api/issues/1406)) ([4fde7c0](https://github.com/andes/api/commit/4fde7c0ce235abfcdca7943111ac66400f3744a7))
* **mpi:** Eventos de linkeo y deslinkeo y actualización de la información de pacientes en las prestaciones médicas ([#1376](https://github.com/andes/api/issues/1376)) ([f514b3f](https://github.com/andes/api/commit/f514b3f4d149275d65b8d77b6619e58de9b5da13))
* **rup:** agregar unidad organizativa a la prestación ([#1408](https://github.com/andes/api/issues/1408)) ([0d55dc5](https://github.com/andes/api/commit/0d55dc59fec8ef690ad413e6a234ea957238efca))
* **rup:** patch paciente para obra social ([#1403](https://github.com/andes/api/issues/1403)) ([68e57d1](https://github.com/andes/api/commit/68e57d1924abebaa56fe5bf4e4c9fc7d412cf2f6))
* **vac:** no validar tŕamite o captcha si es scan ([#1392](https://github.com/andes/api/issues/1392)) ([c439e3a](https://github.com/andes/api/commit/c439e3a3766ff49c9d211fdc9cbfff3f37904886))
* **WEBHOOK:** Agrega control por zona sanitaria para los sms de resultados covid ([#1405](https://github.com/andes/api/issues/1405)) ([22f7469](https://github.com/andes/api/commit/22f74693859821a8408ef581c6f5010c9ac09d9a))

# [5.47.0](https://github.com/andes/api/compare/v5.46.0...v5.47.0) (2021-05-26)


### Bug Fixes

* **COM:** fix send mail comprobante ([bc62ea1](https://github.com/andes/api/commit/bc62ea1da47e89a6045cc5f578618aac4e132df5))
* **pdf:** evita ejecutar pdf en test ([a15c635](https://github.com/andes/api/commit/a15c635b23feb1c8dc366ad9d1e6f192ff85d4dc))
* **registro-mobile:** validar email y documento ([#1396](https://github.com/andes/api/issues/1396)) ([fe34bc0](https://github.com/andes/api/commit/fe34bc0913de67b1f044bf5a0196dee053780430))
* **script:** busca pacientes por vínculos ([#1393](https://github.com/andes/api/issues/1393)) ([53541e9](https://github.com/andes/api/commit/53541e9ddaa0fe10bd4f4c3e2724dbbdba1ab1c9))


### Features

* **vac:** devuelve el factorRiesgoEdad al consultar por inscripción ([#1384](https://github.com/andes/api/issues/1384)) ([caaee5a](https://github.com/andes/api/commit/caaee5a861825d0bed1df3ceebc0bcd284d35b29))
* **vac:** ver listado de inscripciones asignadas ([#1389](https://github.com/andes/api/issues/1389)) ([2ebce02](https://github.com/andes/api/commit/2ebce02dbe6904bdda960af381279b29e6655926))

# [5.46.0](https://github.com/andes/api/compare/v5.45.0...v5.46.0) (2021-05-19)


### Bug Fixes

* **AM:** Agrega control al verificar si ya existe la cuenta ([#1385](https://github.com/andes/api/issues/1385)) ([2a55ebb](https://github.com/andes/api/commit/2a55ebb4f381b4583bd87ecc1b5e80cf29aeaad6))
* **vac:** arreglo al asignar id de paciente en validación ([#1378](https://github.com/andes/api/issues/1378)) ([5539a54](https://github.com/andes/api/commit/5539a54f80e64f50ae0ae1abfc1039d832b578ce))
* **vac:** convierte mail a minuscula ([#1377](https://github.com/andes/api/issues/1377)) ([1988e93](https://github.com/andes/api/commit/1988e93404a684d9aeeae99205854afebd9e6cfe))


### Features

* **epidemio:** Agregamos el campo sexo al objeto paciente de la ficha ([19ea9fe](https://github.com/andes/api/commit/19ea9fe5ff902c9f204dfdb2a33d5cbdad4880f7))
* **permisos:** permiso para seguimiento de casos ([138f4b1](https://github.com/andes/api/commit/138f4b1bdd92085d711f68eb95824f45bda094c3))
* **services:** andes services ([#1356](https://github.com/andes/api/issues/1356)) ([c088bf5](https://github.com/andes/api/commit/c088bf52c5741abf1167c75b10eb6f5eea5b7e5a))
* **vac:** permitir obtener inscripción pendiente ([#1370](https://github.com/andes/api/issues/1370)) ([c7befa2](https://github.com/andes/api/commit/c7befa2c16412eca7633480a16c58acece1c84de))

# [5.45.0](https://github.com/andes/api/compare/v5.44.0...v5.45.0) (2021-05-12)


### Bug Fixes

* **com:** Se resuelven errores en los test ([81f9bef](https://github.com/andes/api/commit/81f9bef5cefe45d4a144e5912d5cbf1fe6942a46))
* **COM:** asigna habilitadas al COM ([99c3046](https://github.com/andes/api/commit/99c3046b97065dbd6820dc6f5bbf6dbbaddc75a4))


### Features

* **COM:** incluye historial en reporte derivacion ([82729f4](https://github.com/andes/api/commit/82729f4a3da7f009a67b9b47795ddcdbdebbe7aa))
* **email-verificacion-app:** se mejora texto de email ([#1381](https://github.com/andes/api/issues/1381)) ([75e9cd0](https://github.com/andes/api/commit/75e9cd0602e61c5e7f0ebaa4f2fff687dfe14b5a))
* **EP:** codigo SISA en ficha epidemio ([6655d55](https://github.com/andes/api/commit/6655d552e23c468bfff96bce8d3553cf4f9e6d3a))
* **form-epidemio:** historial ficha ([a255cd9](https://github.com/andes/api/commit/a255cd9ebd2e762a117787bf56aed78d2dbcc54a))
* **organizacion:** filtro internaciones ([347a711](https://github.com/andes/api/commit/347a711e58bfc2bb4941e2383d1e3a2c2d190667))
* **perinatal:** recurso de carnet perinatal ([#1349](https://github.com/andes/api/issues/1349)) ([bb83731](https://github.com/andes/api/commit/bb83731fb9422bc63eae0364dcd0b45344b6b184))
* **vac:** certificado al momento de la inscripción ([#1371](https://github.com/andes/api/issues/1371)) ([6ab79a9](https://github.com/andes/api/commit/6ab79a99de1a7bb7ef6b41e9769edf9125d503f7))

# [5.44.0](https://github.com/andes/api/compare/v5.43.0...v5.44.0) (2021-05-05)


### Bug Fixes

* **inscripcion:** quita llamada a evento ([#1369](https://github.com/andes/api/issues/1369)) ([71780e9](https://github.com/andes/api/commit/71780e99ebe78baea3eceec97a03f4a9cbbbe270))
* **jobVacunas:** Se restaura el filtro de horas ([ed3d8fe](https://github.com/andes/api/commit/ed3d8feca10b59ade4c916de1088bd8a04ae15ce))


### Features

* **com:** unidad destino derivacion ([bbcca18](https://github.com/andes/api/commit/bbcca1851b164a08cd48fbcabfd3b4d3289dc8f3))
* **COM:** se verifica si tiene un email asociado para auditoria de com ([4732a52](https://github.com/andes/api/commit/4732a52370438fa1657506574b5eed91bf54cbde))
* **COM:** try catch en descarga de comprobante derivacion ([5825652](https://github.com/andes/api/commit/5825652d720153a8d1ed7e5ce5f19ec00eaa77d3))
* **matriculaciones:** aplica tokens search en profesionales ([#1311](https://github.com/andes/api/issues/1311)) ([c5e2241](https://github.com/andes/api/commit/c5e224187c95c2c88026877fa6fc7e2b82d712d8))
* **rup:** agrega atributos a PlantillasRUPSchema ([#1343](https://github.com/andes/api/issues/1343)) ([18bdc88](https://github.com/andes/api/commit/18bdc889dbd1f8b5588af752f4a3964f0c30f7ed))

# [5.43.0](https://github.com/andes/api/compare/v5.42.0...v5.43.0) (2021-04-28)


### Bug Fixes

* **AM:** Control de unico email por usuario app ([#1361](https://github.com/andes/api/issues/1361)) ([c426112](https://github.com/andes/api/commit/c426112cc81b2a5185e55273387f9870abda7742))
* **inscripcion:** cambia control de nro de trámite ([#1359](https://github.com/andes/api/issues/1359)) ([a92628f](https://github.com/andes/api/commit/a92628f5626953fb42a06d1f35625cb95b9d7da7))
* **jobVacunas:** Se fixea un error que rompe el proceso y se agrega a la query cuando se hace por fecha ([f2951a3](https://github.com/andes/api/commit/f2951a3c8511fb4185bf965726fb95498d4fb3df))


### Features

* **am:** permitir el registro de nuevos paciente desde la app ([#1292](https://github.com/andes/api/issues/1292)) ([acf5173](https://github.com/andes/api/commit/acf5173905315eae2c6c00b060c31eb899d9d9c3))
* **fichaEpidemio:** Se agregan eventos para realizar diferentes tareas ([be521f3](https://github.com/andes/api/commit/be521f3990111b772f9b1e77a006ca7aeb7c520d))
* **fichaEpidemiologia:** Permite actualizar información de pcr dado un evento de notificación ([9e5d771](https://github.com/andes/api/commit/9e5d77160a88c0f69844ead2e989abbc4a3e23bc))
* **vac:** nueva ruta post para registrar con paciente ([#1332](https://github.com/andes/api/issues/1332)) ([8d451d7](https://github.com/andes/api/commit/8d451d7a96d8efb4814f08d7e3f9c1617df4ebf1))
* **vac:** token para filtrar por dni, nombre y apellido ([#1353](https://github.com/andes/api/issues/1353)) ([1fe9c7d](https://github.com/andes/api/commit/1fe9c7d0fae4d5f0c00b3c4dfcc023e7823ba1e7))

# [5.42.0](https://github.com/andes/api/compare/v5.41.0...v5.42.0) (2021-04-21)


### Bug Fixes

* **cda:** visualizar cda desde andes ([#1342](https://github.com/andes/api/issues/1342)) ([5f7ff99](https://github.com/andes/api/commit/5f7ff99e0cbec23ea9823557a107d0766dcd6d65))
* **inscripcion:** cambia control para el mensaje de consulta ([#1345](https://github.com/andes/api/issues/1345)) ([1e8412e](https://github.com/andes/api/commit/1e8412e4596bd1df01c192baa04f0b87d8012e88))
* **mpi:** resuelve error por job que finaliza antes de lo esperado ([#1339](https://github.com/andes/api/issues/1339)) ([51f212c](https://github.com/andes/api/commit/51f212ca2504d72b7fff61a6380ded09551e4e0b))
* **rup:** ajuste en informe PDF ([#1354](https://github.com/andes/api/issues/1354)) ([b50403f](https://github.com/andes/api/commit/b50403f2f30c35a3f50a0009e8438f6ef87b6437))


### Features

* **am:** permitir a familiar consultar laboratorios ([#1281](https://github.com/andes/api/issues/1281)) ([3ca3704](https://github.com/andes/api/commit/3ca37041d9a81c32d2669da9d77547cb062cc015))
* **COM:** crear derivación como una prestación ([e222ab0](https://github.com/andes/api/commit/e222ab0a92dca828fe3e6b2ce67dc019e95a2f38))
* **EP:** formEpidemiologia.type.id ([1e31d26](https://github.com/andes/api/commit/1e31d26bd6432ea9d1be58c9091b0a99c46d04e4))
* **epidemiologia:** buscador fichas epidemiologicas ([a99ee82](https://github.com/andes/api/commit/a99ee828a6fff26673338f3dea4afee15f5feaba))
* **vac:** audit plugin en inscripcion-vacunas ([#1340](https://github.com/andes/api/issues/1340)) ([6cf0b35](https://github.com/andes/api/commit/6cf0b35d2820126934bd5f67692129c776874563))
* **vac:** filtro por certificado ([#1341](https://github.com/andes/api/issues/1341)) ([3e2911e](https://github.com/andes/api/commit/3e2911ea69042ada7f7fef0880b733fc6089c5c7))
* **vac:** restringir permisos de vacunación ([#1344](https://github.com/andes/api/issues/1344)) ([2cccb1f](https://github.com/andes/api/commit/2cccb1ffcebfc3cb68f6645967a797366c6fbc20))

# [5.41.0](https://github.com/andes/api/compare/v5.40.0...v5.41.0) (2021-04-14)


### Bug Fixes

* **cda:** ajuste de permisos al crear CDA ([#1333](https://github.com/andes/api/issues/1333)) ([4a86222](https://github.com/andes/api/commit/4a86222b44f2deb925f415a14a0b83e33d62ff4d))
* **mpi:** error validando paciente ([#1303](https://github.com/andes/api/issues/1303)) ([c5a2a06](https://github.com/andes/api/commit/c5a2a069fa237b20421743272203d2f443ba6d4c))


### Features

* **drive:** adaptador mongo ([#1335](https://github.com/andes/api/issues/1335)) ([f662ce6](https://github.com/andes/api/commit/f662ce612331665f97726f701f40922e050f116a))
* **mpi:** quita foto del schema paciente.  ([#1326](https://github.com/andes/api/issues/1326)) ([5a131fd](https://github.com/andes/api/commit/5a131fd1baa5edf19dbcb9e665130acc6e9b747a))
* **vac:** agrega filtro por fecha de registro ([#1325](https://github.com/andes/api/issues/1325)) ([f49726c](https://github.com/andes/api/commit/f49726cb19e93b064a09c577f55c22bdcbf30d36))
* **vac:** nuevos eventos al validar o romper validación de certificación de paciente riesgo covid ([#1316](https://github.com/andes/api/issues/1316)) ([fc3ecdf](https://github.com/andes/api/commit/fc3ecdf71be74450b4fb4e3fb433d3f85e19b2f8))
* **vacunas:** nueva ruta para exportar vacunas ([#1300](https://github.com/andes/api/issues/1300)) ([2464c49](https://github.com/andes/api/commit/2464c498bbef75ee88d13a5c48c51a777528325d))
* **vacunas:** TAG vacunasCovid en prestaciones ([#1324](https://github.com/andes/api/issues/1324)) ([765e133](https://github.com/andes/api/commit/765e133c979cfe9b8c853280648154803f8bca1a))
* **webhook:** cambia nombre de evento ([#1338](https://github.com/andes/api/issues/1338)) ([16dec93](https://github.com/andes/api/commit/16dec93e1c39c70d065ad9d6ad32fa75ec7d2fea))

# [5.40.0](https://github.com/andes/api/compare/v5.39.0...v5.40.0) (2021-04-07)


### Bug Fixes

* **mpi:** revalidacion de paciente ([#1315](https://github.com/andes/api/issues/1315)) ([fc50bd9](https://github.com/andes/api/commit/fc50bd9c843f0dd734f760988588e11fa51d5753))
* **script VAC-9:** reemplaza save por updateOne ([#1329](https://github.com/andes/api/issues/1329)) ([0fd1642](https://github.com/andes/api/commit/0fd1642491105d18bb4f7345a38a3fcf38d8a8a6))


### Features

* **inscripcion-profesional:** campo solo profesionales matriculados ([#1328](https://github.com/andes/api/issues/1328)) ([bd87562](https://github.com/andes/api/commit/bd875629edac9800f415bbdd701f6c0df80e760d))
* **vac:** cambio en el mensaje de inscripción registrada ([#1323](https://github.com/andes/api/issues/1323)) ([8f97abe](https://github.com/andes/api/commit/8f97abe48899871cc1ac887d8d553ae07a5fcdac))
* **vac:** mostrar los datos del inscripto al consulta por la inscripción ([#1322](https://github.com/andes/api/issues/1322)) ([77b3962](https://github.com/andes/api/commit/77b3962a7c53938aa0c8b0169c190e8f36dc6cf1))

# [5.39.0](https://github.com/andes/api/compare/v5.38.0...v5.39.0) (2021-03-31)


### Bug Fixes

* **codificacion:** validacion de tipoPrestacion ([#1318](https://github.com/andes/api/issues/1318)) ([a267a59](https://github.com/andes/api/commit/a267a59ef41b6e0cb0fc116cea5e973aa9531176))
* **misc:** formbuilder remove fieldkey unique ([#1310](https://github.com/andes/api/issues/1310)) ([85b7396](https://github.com/andes/api/commit/85b73966f222986ae96c7e6157a109c87dfccf07))
* **profesionales:** permite buscar por dni y profesion ([#1321](https://github.com/andes/api/issues/1321)) ([da5d57c](https://github.com/andes/api/commit/da5d57c133b410893a090929fc2a0e6704a6573c))
* **validacion:** agrega idTramite en validación por Sisa ([#1320](https://github.com/andes/api/issues/1320)) ([5edc808](https://github.com/andes/api/commit/5edc808cc4bfc121e7be4fdde3e141bcd15eaf65))


### Features

* **codificacion:** mejoras de performance ([#1314](https://github.com/andes/api/issues/1314)) ([cf41057](https://github.com/andes/api/commit/cf41057b4d1ae994306e04363098668b82f625a0))
* **matriculaciones:** ajuste guia profesional ([d9a1bdf](https://github.com/andes/api/commit/d9a1bdf51bbf13c1e5af92284ce9812eef2e602f))

# [5.38.0](https://github.com/andes/api/compare/v5.37.0...v5.38.0) (2021-03-24)


### Bug Fixes

* **matriculaciones:** protección de rutas ([#1298](https://github.com/andes/api/issues/1298)) ([4ef0012](https://github.com/andes/api/commit/4ef001299b343552d0b881592e11ec3b722e3f2a))


### Features

* Envio comprobante derivacion x mail ([#1285](https://github.com/andes/api/issues/1285)) ([e15e59a](https://github.com/andes/api/commit/e15e59acd51747d0b435e1865e6a81db44a68595))
* **huds:**  busqueda por pacientes vinculados ([#1306](https://github.com/andes/api/issues/1306)) ([23f6561](https://github.com/andes/api/commit/23f6561d3636aafb4286cd3db34884f35a408870))
* **pecas:** Agrega parametros a job de fuera de agenda+indices en codificacion ([#1301](https://github.com/andes/api/issues/1301)) ([7bf649b](https://github.com/andes/api/commit/7bf649b3e725b649854f6a96165b6031a902a523))
* **script:** validación de inscriptos ([#1305](https://github.com/andes/api/issues/1305)) ([a015c07](https://github.com/andes/api/commit/a015c076eff731fee3f025dcf4728d41bf150875))
* **VAC:** rutas para certificado de vacunacion covid ([#1291](https://github.com/andes/api/issues/1291)) ([81deb72](https://github.com/andes/api/commit/81deb72147719ee914ef11157926c340276f9a21))
* **webhook:** aplicas filtros por base de datos ([#1288](https://github.com/andes/api/issues/1288)) ([a95862a](https://github.com/andes/api/commit/a95862a99afadc6bdb1ed970e259834aaab3a6cc))

# [5.37.0](https://github.com/andes/api/compare/v5.36.0...v5.37.0) (2021-03-17)


### Bug Fixes

* **mpi:** se corrigen bugs al guardar pacientes obtenidos del Registro Civil ([#1282](https://github.com/andes/api/issues/1282)) ([0046551](https://github.com/andes/api/commit/004655168754c8c495ca5f024aca66d58979af8e))
* **pecas:** quita control de segundo parametro de eachAsync por modificacion en su uso ([#1297](https://github.com/andes/api/issues/1297)) ([b37818d](https://github.com/andes/api/commit/b37818dd73fbefb2bb6cc96af769c45a2f5d6053))
* **VAC:** Agregar el campo de riesgos/morbilidades a las inscripcion ([#1296](https://github.com/andes/api/issues/1296)) ([3310474](https://github.com/andes/api/commit/3310474822f86bcaefc41352abe5b1f34400ac79))


### Features

* **vac:** variable para deshabilitar control captcha ([#1290](https://github.com/andes/api/issues/1290)) ([a4571b6](https://github.com/andes/api/commit/a4571b6bafab72781c6b8d5bba79999739424c48))

# [5.36.0](https://github.com/andes/api/compare/v5.35.0...v5.36.0) (2021-03-10)


### Bug Fixes

* **AM:** Corrige parametro en get de agendas disponibles ([#1287](https://github.com/andes/api/issues/1287)) ([42c0957](https://github.com/andes/api/commit/42c09573c58e557f7960eb63af8bb3f26f24b031))
* **formBuilder:** update properties formbuilder ([91e934f](https://github.com/andes/api/commit/91e934ff698f7a901512f179eb0da510f5a818ad))


### Features

* **epidemiologia:** resource base ficha epidemiologica ([748764b](https://github.com/andes/api/commit/748764bec002f5112acc0c3fceb04baa2e4c7220))
* **epidemiologia:** resource base forms epidemiologia ([6284593](https://github.com/andes/api/commit/6284593c7443dbfe68dfd5b4967f7fad1a812269))
* **form:** Add security and formsResources ([a7921b8](https://github.com/andes/api/commit/a7921b8b182cc6c347ccc49ef3edf4516f04bd66))
* **formBuilder:** add snomed fields and formsCode ([f23c19e](https://github.com/andes/api/commit/f23c19eca558dabeb7447d5c3ab16a4ce3b5ac7c))
* **formBuilder:** mejoras y cambio de estructura en recursos y formularios ([fa6f85b](https://github.com/andes/api/commit/fa6f85b10bc1939b46ee5f0352cd92899c539edc))
* **formBuilder:** permisos ([573611d](https://github.com/andes/api/commit/573611d3fbac428664e8c08f7c28e634aca5c2c3))
* **forms:** Creamos resourceBase y schema ([3bb7fa7](https://github.com/andes/api/commit/3bb7fa76e157dc79a00c076c0993964efa64f44b))
* **Inscripcion vacunas:** agrega recurso ([#1286](https://github.com/andes/api/issues/1286)) ([ca7c225](https://github.com/andes/api/commit/ca7c225ecbecf4857099fa446941ac0ac80b7b97))
* **inscripcion-vacunacion:** Agrega eventos para actualizar inscripción ([#1293](https://github.com/andes/api/issues/1293)) ([700d007](https://github.com/andes/api/commit/700d00727e3b4810e7a8a3a46d8eb73baeae90b6))

# [5.35.0](https://github.com/andes/api/compare/v5.34.0...v5.35.0) (2021-03-03)


### Features

* **mpi:** documentos paciente ([#1259](https://github.com/andes/api/issues/1259)) ([8faa8b8](https://github.com/andes/api/commit/8faa8b8d5faa9e0b173759f53f8aa78c0f704765))
* **rup:** adjuntos en drive ([#1283](https://github.com/andes/api/issues/1283)) ([8d70c04](https://github.com/andes/api/commit/8d70c04a637af8acac3fda7acbdb3aaf2272508f))
* **rup:** nota al pie configurable ([#1284](https://github.com/andes/api/issues/1284)) ([85b00e4](https://github.com/andes/api/commit/85b00e45043f5071dd6ae13ccda99420bb676bab))

# [5.34.0](https://github.com/andes/api/compare/v5.33.0...v5.34.0) (2021-02-24)


### Features

* **citas:** se agrega permiso soloLectura ([#1256](https://github.com/andes/api/issues/1256)) ([b66f6ac](https://github.com/andes/api/commit/b66f6ac499f4639f443c105b86aae4c7a58360c7))
* **com:** verifica organizacion destino en POST derivaciones ([#1260](https://github.com/andes/api/issues/1260)) ([4d02158](https://github.com/andes/api/commit/4d02158c42bdca164005bd0d3d7cde2508a799c2))
* **rup:** informe-pdf se agrega implementación de CheckListComponent ([#1278](https://github.com/andes/api/issues/1278)) ([f7b4fe1](https://github.com/andes/api/commit/f7b4fe11b36afca8917345ee2d3c1ebd24fd73ad))
* **rup:** informe-pdf se agrega implementación de VacunasComponent ([#1277](https://github.com/andes/api/issues/1277)) ([7f17980](https://github.com/andes/api/commit/7f17980c083d708ca9af2f3da46af1e58c22d3af))

# [5.33.0](https://github.com/andes/api/compare/v5.32.0...v5.33.0) (2021-02-10)


### Bug Fixes

* **citas:** solapamiento de turnos en agendas dinamicas ([#1269](https://github.com/andes/api/issues/1269)) ([6f4e577](https://github.com/andes/api/commit/6f4e5773018c808adaa959b8c549529902324cb6))
* **job:** cambia frecuencia ([#1271](https://github.com/andes/api/issues/1271)) ([690977f](https://github.com/andes/api/commit/690977f71524d421a74f70f1d8e2c9ad4f993795))
* **mpi:** control de contacto notification ([#1266](https://github.com/andes/api/issues/1266)) ([c5aee5d](https://github.com/andes/api/commit/c5aee5da6e7d1187cbcdd3e63d0ed292f083af22))
* **mpi:** control de fotos ([#1273](https://github.com/andes/api/issues/1273)) ([a40ccea](https://github.com/andes/api/commit/a40cceabba46b8dda7db2bd59ea709acc284ceb6))


### Features

* **citas:** nuevo atributo para envio de sms de la agenda ([#1257](https://github.com/andes/api/issues/1257)) ([396029b](https://github.com/andes/api/commit/396029b1efbcf10950947eb607ee9737a013c009))
* **com:** agregamos el campo de búsqueda el tipo de traslado ([2e58d90](https://github.com/andes/api/commit/2e58d90d2f706d5183b92cda6377fdf9a20460e4))
* **COM:** incluye traslados especiales ([e669ee5](https://github.com/andes/api/commit/e669ee5ae9dc329f15e03967b5e6a2230f7893de))
* **mapa-camas:** agrega configPases al schema de la maquina de estados ([#1219](https://github.com/andes/api/issues/1219)) ([78e0b8d](https://github.com/andes/api/commit/78e0b8d19ea9d38804252dcd9c489fe37290acb3))
* **rup:** Agregamos lote de vacunas ([#1265](https://github.com/andes/api/issues/1265)) ([c5ab22f](https://github.com/andes/api/commit/c5ab22ffbfad57ded27f44c3b3b7a025229fd97e))
* **rup:** informe-pdf se agrega implementación de UltimaFechaComponent ([#1272](https://github.com/andes/api/issues/1272)) ([62b0e25](https://github.com/andes/api/commit/62b0e254d6a948da695998ddfc701a1bcf1e3d61))
* **top:** permitir cargar solicitudes sin profesional origen ([#1268](https://github.com/andes/api/issues/1268)) ([9cc319c](https://github.com/andes/api/commit/9cc319c52fee952c6e80ac835780809646d5dce1))

# [5.32.0](https://github.com/andes/api/compare/v5.31.0...v5.32.0) (2021-02-03)


### Bug Fixes

* **mpi:** cambia permisos de get ([#1261](https://github.com/andes/api/issues/1261)) ([5bfacea](https://github.com/andes/api/commit/5bfaceadc1a785425962ea100dd45d93b48f819b))
* **mpi:** controla error resize de la foto ([#1263](https://github.com/andes/api/issues/1263)) ([8bfe96c](https://github.com/andes/api/commit/8bfe96c835643af49b6e78329fb35954aeca495c))


### Features

* **huds:** agrega CDAs en exportacion HUDS ([#1251](https://github.com/andes/api/issues/1251)) ([1f1389a](https://github.com/andes/api/commit/1f1389ae4ae0092cf66b8c329a7d159b862fb82f))
* **tm:** busca profesion por codigo ([#1250](https://github.com/andes/api/issues/1250)) ([4619b34](https://github.com/andes/api/commit/4619b34567163615ed8ba571e04ef2632fb9a2ee))

# [5.31.0](https://github.com/andes/api/compare/v5.30.0...v5.31.0) (2021-01-27)


### Bug Fixes

* **exportCovid:** se modifica la fecha para que toma la de la creción del registro y no de la solicitud para evitar gaps ([#1246](https://github.com/andes/api/issues/1246)) ([94f5e06](https://github.com/andes/api/commit/94f5e0636b8734e9fe00120dc101e75b10a44d8c))
* **mapa-camas:** historial camas trae salas ([#1255](https://github.com/andes/api/issues/1255)) ([61e32be](https://github.com/andes/api/commit/61e32bebcd4acd5a19725eee61a1bc8e10f89a9d))


### Features

* **mapa-camas:** filtros resumen internacion ([#1252](https://github.com/andes/api/issues/1252)) ([dfe0d8c](https://github.com/andes/api/commit/dfe0d8c2a93ea580e7777d051733553674e2d686))
* **mobile-app:** se suma max_id y count a parametros para traer tweets ([#1254](https://github.com/andes/api/issues/1254)) ([287891a](https://github.com/andes/api/commit/287891a96a57baf4187973087fcf04844d0c1165))

# [5.30.0](https://github.com/andes/api/compare/v5.29.0...v5.30.0) (2021-01-20)


### Bug Fixes

* **mpi:** se agregan controles varios ([#1244](https://github.com/andes/api/issues/1244)) ([8d366f2](https://github.com/andes/api/commit/8d366f2428d436715a82736ad4885758db8b8b2b))
* **rup:** adjuntos desde andes drive ([#1249](https://github.com/andes/api/issues/1249)) ([2b2b178](https://github.com/andes/api/commit/2b2b1788c8d7edc91a334de5272709a927d0c7f5))


### Features

* **guardia:** primeros pasos ([#1215](https://github.com/andes/api/issues/1215)) ([859039a](https://github.com/andes/api/commit/859039a8ed9e8f0e93fa0b426933c20f2f28a3e8))
* **JOB:** Exportación a sisa de casos covid ([#1200](https://github.com/andes/api/issues/1200)) ([d010d5e](https://github.com/andes/api/commit/d010d5e59877e36ace8e3b6f321264927cd23e8e))

# [5.29.0](https://github.com/andes/api/compare/v5.28.0...v5.29.0) (2021-01-13)


### Bug Fixes

* **drive:** ajueste file adapter ([#1245](https://github.com/andes/api/issues/1245)) ([5c2c63b](https://github.com/andes/api/commit/5c2c63bc64667c938a22222ecd74b6a4ca830a9c))
* **tm:** fix error en sincro organizacion con sisa ([#1240](https://github.com/andes/api/issues/1240)) ([18d35fa](https://github.com/andes/api/commit/18d35faea2aeedd6e99c7ca104dbcec8a0254794))


### Features

* **auth:** permite realizar el cambio de contraseña para usuarios externos a oneLogin ([#1233](https://github.com/andes/api/issues/1233)) ([aa33a3d](https://github.com/andes/api/commit/aa33a3dfee746f3c091a1ba4b93533a7e52a5ab7))
* **misc:** turnos prestaciones busca prestaciones en vez de codificaciones  ([#1068](https://github.com/andes/api/issues/1068)) ([ff56d93](https://github.com/andes/api/commit/ff56d93e97b118e6349aca48df38de748156db00))
* **vacuna:** Agregamos las credenciales en el header en lugar de enviarlas en el body ([#1241](https://github.com/andes/api/issues/1241)) ([d7fdd15](https://github.com/andes/api/commit/d7fdd1582e1ce911f8a79b0ffd6ebc04f3bbe3d4))

# [5.28.0](https://github.com/andes/api/compare/v5.27.0...v5.28.0) (2021-01-06)


### Bug Fixes

* **com:** nueva ruta para actualizar historial ([#1243](https://github.com/andes/api/issues/1243)) ([a2bcfa1](https://github.com/andes/api/commit/a2bcfa154a98bf7762e994f0f502087ec646dd35))


### Features

* **com:** sumar prioridad a DerivacionHistorialSchema ([#1242](https://github.com/andes/api/issues/1242)) ([11d8077](https://github.com/andes/api/commit/11d8077658471ffd134a335140dae1c4c3593a1d))
* **Job Vacunas:** Agrega idSniAplicacion en el log de informacion exportada ([1806a08](https://github.com/andes/api/commit/1806a08206a8ada433c8a39c3aa3f931e2dcb241))
* **mpi:** se agrega el numero de tramite del paciente ([#1226](https://github.com/andes/api/issues/1226)) ([554fac9](https://github.com/andes/api/commit/554fac9ae39d10dcb91f96eb14e88872cd0b7ca1))
* **rup:** plantillas moleculas ([#1239](https://github.com/andes/api/issues/1239)) ([a100257](https://github.com/andes/api/commit/a1002576e3dfdadc55f5ed176a67da80de3ffa34))
* **TM:** rutas adjuntar titulo profesional ([#1216](https://github.com/andes/api/issues/1216)) ([95a6cf7](https://github.com/andes/api/commit/95a6cf7996c49a7663d16942e272d1fe3b00f9a7))

# [5.27.0](https://github.com/andes/api/compare/v5.26.0...v5.27.0) (2020-12-30)


### Bug Fixes

* **MAT:** corrige filtros guia paciente ([#1212](https://github.com/andes/api/issues/1212)) ([67254b7](https://github.com/andes/api/commit/67254b770f243c9d534352f2b4f6677fc09dcd2e))
* **nomivac:** modificamos el campo que orden ([8e3814e](https://github.com/andes/api/commit/8e3814eabe5d6328fd3fc2b4fedd5e375b0edac2))


### Features

* **nomivac:** registro de aplicaciones de vacunas ([#1236](https://github.com/andes/api/issues/1236)) ([9410ffc](https://github.com/andes/api/commit/9410ffc1dbd1e8332378a382b5a0a9c98ac1b067))
* **rup:** enviar adjuntos ([#1074](https://github.com/andes/api/issues/1074)) ([b84db5a](https://github.com/andes/api/commit/b84db5ae3363faac5c504730378aaeee218876de))
* **RUP:** rutas de datos paramétricos  para registros de vacuna ([#1234](https://github.com/andes/api/issues/1234)) ([b549362](https://github.com/andes/api/commit/b5493624a5c2486a33849633514919defe9ce5b8))
* **top:** subir archivos a andesDrive ([#1228](https://github.com/andes/api/issues/1228)) ([d54d9f9](https://github.com/andes/api/commit/d54d9f92065e6bfb3800f52c6002ba3b5529252c))
* **turnos-prestaciones:** filtro ambito  ([#1232](https://github.com/andes/api/issues/1232)) ([48b2718](https://github.com/andes/api/commit/48b2718a9f38e0e03656ee41ec3e263febe5dbf1))

# [5.26.0](https://github.com/andes/api/compare/v5.25.0...v5.26.0) (2020-12-23)


### Bug Fixes

* **arancelamiento:** reestablece ruta ([#1229](https://github.com/andes/api/issues/1229)) ([e943206](https://github.com/andes/api/commit/e943206b7193d3bfa524f1e75ed2379855468656))
* **citas:** fix firma arancelamiento ([#1227](https://github.com/andes/api/issues/1227)) ([9fe6e08](https://github.com/andes/api/commit/9fe6e0822def504924fed235cef564400ae98c7d))


### Features

* **com:** migrar archivos viejos al drive ([#1224](https://github.com/andes/api/issues/1224)) ([8425ed2](https://github.com/andes/api/commit/8425ed25aa684ecced89860bdbb7efd27d4f3496))
* **gdu:** mejorar feedback al usuario al cargar un usuario ([#1230](https://github.com/andes/api/issues/1230)) ([efa7da4](https://github.com/andes/api/commit/efa7da49badd735a7fd8ca99e580ca0ffa258f9f))

# [5.25.0](https://github.com/andes/api/compare/v5.24.1...v5.25.0) (2020-12-16)


### Bug Fixes

* **CIT:** hotfix descarga arancelamiento ([#1223](https://github.com/andes/api/issues/1223)) ([3683a57](https://github.com/andes/api/commit/3683a5776e5cdec23637e0e92a07514f179926a3))


### Features

* **bi-query:** organizacion required ([#1217](https://github.com/andes/api/issues/1217)) ([5e7ca6d](https://github.com/andes/api/commit/5e7ca6dae56e710533a84675f2ce6e502792cb58))
* **buscador:** exportar huds ([#1206](https://github.com/andes/api/issues/1206)) ([84e7ae5](https://github.com/andes/api/commit/84e7ae53143158f85ed6fe565c6e67c17fbf679e))
* **CIT:** registra motivo liberacion turno ([#1222](https://github.com/andes/api/issues/1222)) ([fb6f812](https://github.com/andes/api/commit/fb6f8128e2a6292c9157449d7a713818b3e15a65))
* **com:** nuevo valor de prioridad especial a schema de derivaciones ([#1218](https://github.com/andes/api/issues/1218)) ([a34c2d0](https://github.com/andes/api/commit/a34c2d04a0e036c3bf34750573bec059916252ee))
* **monitoreo:** agrega permiso rupers ([#1225](https://github.com/andes/api/issues/1225)) ([3fb95bb](https://github.com/andes/api/commit/3fb95bb5f7be25491eedc303c870e0b72848c1dc))

## [5.24.1](https://github.com/andes/api/compare/v5.24.0...v5.24.1) (2020-12-09)


### Bug Fixes

* **RUP:** Corrige los parametros para obtener la firma del profesional en el informe ([2f90963](https://github.com/andes/api/commit/2f9096322931d07b5fd463c5288a457096216b94))

# [5.24.0](https://github.com/andes/api/compare/v5.23.0...v5.24.0) (2020-12-02)


### Bug Fixes

* **mapa-camas:** informe censo logo ([#1210](https://github.com/andes/api/issues/1210)) ([5fba92e](https://github.com/andes/api/commit/5fba92e66a150da52406241b53c39ae841f1d781))
* **puco:** cambia uso de sisa por federador ([#1207](https://github.com/andes/api/issues/1207)) ([0920ef8](https://github.com/andes/api/commit/0920ef893ea45cbde1398c0651a140f6d107b52c))


### Features

* **com:** permitir busqueda por id de paciente ([#1201](https://github.com/andes/api/issues/1201)) ([6fdeac4](https://github.com/andes/api/commit/6fdeac4eb2f2cd479f30ca53b7a6c5841d7b5875))
* **elementos-rup:** add rules ([#1209](https://github.com/andes/api/issues/1209)) ([25bacec](https://github.com/andes/api/commit/25bacecf28c88955a7d5bd067ed18c3f599a9a5c))
* **mpi:** servicio de renaper por federador ([#1213](https://github.com/andes/api/issues/1213)) ([14bb752](https://github.com/andes/api/commit/14bb7523727da96e4a0b6d072c56d6b5a1fd4d04))
* **mpi:** verifica que la foto traida de renaper sea una imagen ([#1198](https://github.com/andes/api/issues/1198)) ([77d5a4a](https://github.com/andes/api/commit/77d5a4a800ac1054e00ce987d161f51fb6a484e1))
* **rup:** elementos rup hooks ([#1189](https://github.com/andes/api/issues/1189)) ([f006d13](https://github.com/andes/api/commit/f006d13061fd51de60ff074a87c81859f7d62a42))
* **tm:** busqueda por ids en conceptos turneables ([#1194](https://github.com/andes/api/issues/1194)) ([2e4e835](https://github.com/andes/api/commit/2e4e8351b4a5ea2b3b9efa3601f13d6c1b9a0b84))

# [5.23.0](https://github.com/andes/api/compare/v5.22.0...v5.23.0) (2020-11-25)


### Bug Fixes

* **robosender:** no se estan marcando como succes ([#1205](https://github.com/andes/api/issues/1205)) ([5d1dceb](https://github.com/andes/api/commit/5d1dcebe54df092743b6717e02658ae0dc0da739))


### Features

* **core:** actualización de andes/core ([#1195](https://github.com/andes/api/issues/1195)) ([4900617](https://github.com/andes/api/commit/4900617f67f885206c6910079271b92c9809f445))
* **mpi:** script para eliminar foto de relaciones ([#1184](https://github.com/andes/api/issues/1184)) ([80edf8f](https://github.com/andes/api/commit/80edf8f64584649c0e7c506d2b770055590e2174))

# [5.22.0](https://github.com/andes/api/compare/v5.21.0...v5.22.0) (2020-11-18)


### Bug Fixes

* **mpi:** busqueda de identificadores ([#1191](https://github.com/andes/api/issues/1191)) ([823d320](https://github.com/andes/api/commit/823d320d04640aa0c684445bdb9a5cd15158ca26))


### Features

* **CIT:** incluye fuera de agendas a historial de citas ([#1155](https://github.com/andes/api/issues/1155)) ([4fe326f](https://github.com/andes/api/commit/4fe326f8ff30a107dd150a37bfe3504ad4ba1038))
* **com:** impresión de comprobante ([#1192](https://github.com/andes/api/issues/1192)) ([32b9763](https://github.com/andes/api/commit/32b976357bef311f2b2d144b2dd052606c25280e))
* **com:** sumar gravedad al habilitar una derivación desde el com ([#1182](https://github.com/andes/api/issues/1182)) ([bb0dbd9](https://github.com/andes/api/commit/bb0dbd92de55dd9f2d1977f94dee46335db29162))
* **rup:** impresión receta médica ([#1188](https://github.com/andes/api/issues/1188)) ([bb34343](https://github.com/andes/api/commit/bb343433e1396c6cb9e543e51681a14f25f2761a))

# [5.21.0](https://github.com/andes/api/compare/v5.20.0...v5.21.0) (2020-11-11)


### Bug Fixes

* **mpi:** match ubicacion en validacion ([#1177](https://github.com/andes/api/issues/1177)) ([30a3acd](https://github.com/andes/api/commit/30a3acd7de4813b8b1252ddbda694c50ff7cc743))
* **mpi:** script para pacientes con fotoId pero sin foto ([#1175](https://github.com/andes/api/issues/1175)) ([be02997](https://github.com/andes/api/commit/be0299755fd3b3a2ec3337452308050aa364420d))
* **rup:** prestación iniciada por otro profesional ([#1132](https://github.com/andes/api/issues/1132)) ([4cb5ea9](https://github.com/andes/api/commit/4cb5ea9ab5183cc8392f34f3c6b423a40f13f000))
* **rup:** romper validacion check ([#1185](https://github.com/andes/api/issues/1185)) ([8f18fa4](https://github.com/andes/api/commit/8f18fa444ee048fe077a5255330edcfcf043c665))
* **webhook:** fix fecha de nacimiento ([#1186](https://github.com/andes/api/issues/1186)) ([017f578](https://github.com/andes/api/commit/017f5785f93279037eba7b3946bf228c868889ea))


### Features

* **misc:** unificación de makeFs ([#1139](https://github.com/andes/api/issues/1139)) ([bc74e2d](https://github.com/andes/api/commit/bc74e2d675e566cb0e57cf699cd591267d8075a6))
* **mpi:** logueo de reporte de errores en datos de pacientes ([#1171](https://github.com/andes/api/issues/1171)) ([9896051](https://github.com/andes/api/commit/989605156f0528ba362ef762852828e06f6b8fb9))
* **rup:** agrega cache redis para frecuentes ([#1176](https://github.com/andes/api/issues/1176)) ([ecd179a](https://github.com/andes/api/commit/ecd179a8d1a03527b0b199a38d57d6abb78b099d))
* **turnos-prestaciones:** columnas dinamicas ([#1162](https://github.com/andes/api/issues/1162)) ([5b1bb5f](https://github.com/andes/api/commit/5b1bb5f209aafd9650fc1299d2cbc4f14676a55e))

# [5.20.0](https://github.com/andes/api/compare/v5.19.0...v5.20.0) (2020-11-04)


### Features

* **com:** eliminado en historial derivaciones ([#1172](https://github.com/andes/api/issues/1172)) ([2830d69](https://github.com/andes/api/commit/2830d690c6f519c3abb8ebc2758592e86f74454a))
* **com:** guardar obra social del paciente ([#1170](https://github.com/andes/api/issues/1170)) ([b58a65c](https://github.com/andes/api/commit/b58a65c9001882fc933de900493e18b79af674b8))
* **com:** indices y corrección en routes ([#1169](https://github.com/andes/api/issues/1169)) ([45fb9be](https://github.com/andes/api/commit/45fb9be8d991945614c0e22fd5c8657943d391e7))
* **facturacion:** cambio de codificacion a prestacion ([#1065](https://github.com/andes/api/issues/1065)) ([8b6d939](https://github.com/andes/api/commit/8b6d93908ef96902850b286874da9658b60bbe6f))
* **mapa-camas:** trackId en prestaciones ([#1173](https://github.com/andes/api/issues/1173)) ([e1885df](https://github.com/andes/api/commit/e1885df69c499b835c53df8ea1ee36156ffe3cc1))
* **webhook:** agrega ruta para notificación ([#1167](https://github.com/andes/api/issues/1167)) ([dffcd06](https://github.com/andes/api/commit/dffcd06adda111a962b8cd77589e5224743aa0eb))

# [5.19.0](https://github.com/andes/api/compare/v5.18.0...v5.19.0) (2020-10-28)


### Bug Fixes

* **mapa-camas:** corrige dos errores en los censos ([#1164](https://github.com/andes/api/issues/1164)) ([c77b5e7](https://github.com/andes/api/commit/c77b5e7c4d3ac4ae90c7b155c89b3a833dfa0147))
* **turnos:** corrige logica en bloques de solo gestion ([#1166](https://github.com/andes/api/issues/1166)) ([f9980b1](https://github.com/andes/api/commit/f9980b12a9a1a60a1e57915f5a7caec4cedc4462))
* **turnoSolcitado:** cambia tipo de datos ([#1168](https://github.com/andes/api/issues/1168)) ([4414d7c](https://github.com/andes/api/commit/4414d7cd639af6219cdf60102bc3b2c80cca3012))


### Features

* **core:** logging de errores de angular ([#1154](https://github.com/andes/api/issues/1154)) ([530aaa3](https://github.com/andes/api/commit/530aaa3540c75a897329d6579bbca9cd5005df10))
* **mapa-camas:** sala comun debe aparecer como disponible ([#1160](https://github.com/andes/api/issues/1160)) ([c698a8d](https://github.com/andes/api/commit/c698a8d3279c7821632549b16cb4020f95a6e09a))
* **mpi:** nuevo campo fotoId en esquema de paciente ([#1143](https://github.com/andes/api/issues/1143)) ([2eca57c](https://github.com/andes/api/commit/2eca57c4a05c8ce5600e7cc8d6e644b82601f0cd))
* **rup:** anular prestación ([#1128](https://github.com/andes/api/issues/1128)) ([311ab1c](https://github.com/andes/api/commit/311ab1c9dbc095257d5dc50efd76ce6edbf44200))

# [5.18.0](https://github.com/andes/api/compare/v5.17.0...v5.18.0) (2020-10-21)


### Bug Fixes

* **citas:** log suspender sobreturno ([#1159](https://github.com/andes/api/issues/1159)) ([85d3fc2](https://github.com/andes/api/commit/85d3fc251149160798002d09a9c03c2b81c5d888))
* **codificaciones:** cambia de posición los filtros de busqueda ([#1157](https://github.com/andes/api/issues/1157)) ([52f5f24](https://github.com/andes/api/commit/52f5f24b05ea6b8004e568c03dd4daf95b8ba27d))
* **mobile:** parallel save error ([#1152](https://github.com/andes/api/issues/1152)) ([fc83fe1](https://github.com/andes/api/commit/fc83fe1f0c23355cb24ecfeefe95b3c15d2ceeef))
* **rup:** error en prestaciones al desestructurar turno ([#1153](https://github.com/andes/api/issues/1153)) ([7353944](https://github.com/andes/api/commit/7353944b94605cb7093e224f901f41de4dc5ce44))


### Features

* **CITAS:** Habilita turnos de gestion en agendas del dia ([#1131](https://github.com/andes/api/issues/1131)) ([83dc4ed](https://github.com/andes/api/commit/83dc4edbf0bc12cdba01d5b3b59146c6c1b9d19a))
* **mapa-camas:** columnas dinámicas ([#1151](https://github.com/andes/api/issues/1151)) ([234897e](https://github.com/andes/api/commit/234897e501e9a033996d24049a723ceac4d82312))
* **mapa-camas:** deshacer internación ([#1141](https://github.com/andes/api/issues/1141)) ([4a526ba](https://github.com/andes/api/commit/4a526baeaabedda8632aee9134b0b4c330d6aeb1))
* **mpi:** script para actualizar foto de pacientes ([#1146](https://github.com/andes/api/issues/1146)) ([edcfefd](https://github.com/andes/api/commit/edcfefd688441143fd095c76da2ef5b2af0a813e))
* **obra-social:** chequea si existe la obra social ([#1158](https://github.com/andes/api/issues/1158)) ([b39130f](https://github.com/andes/api/commit/b39130f5bf7f6413cfa2e567231195ae643f3bc0))
* **recupero:** descarga pdf de anexo 2 ([#1142](https://github.com/andes/api/issues/1142)) ([37b7edc](https://github.com/andes/api/commit/37b7edc096d86e0f62807efa4674312cce61e89c))

# [5.17.0](https://github.com/andes/api/compare/v5.16.0...v5.17.0) (2020-10-14)


### Bug Fixes

* **mapa-camas:** middleware para obtener historial en la capa enfermeria ([#1147](https://github.com/andes/api/issues/1147)) ([a7f5eda](https://github.com/andes/api/commit/a7f5eda2cc8e85bbb514a4035ed67f2198aeeed8))
* **reportes:** optimiza mejoras consulta diagnistico ([#1148](https://github.com/andes/api/issues/1148)) ([4a93dc0](https://github.com/andes/api/commit/4a93dc04adeb4e5a183f55443282306dcdc1022e))


### Features

* **gestor-usuario:** permisos unidad organizativa  ([#1109](https://github.com/andes/api/issues/1109)) ([47977b6](https://github.com/andes/api/commit/47977b6ac8cb322e06244e763930b9a3d5eb2873))
* **mapa-camas:** sala común ([#1117](https://github.com/andes/api/issues/1117)) ([5625b69](https://github.com/andes/api/commit/5625b691654c70a4561d5dd8a22dba82005cefbc))
* **rup:** crear solicitudes en background ([#1140](https://github.com/andes/api/issues/1140)) ([c3fa969](https://github.com/andes/api/commit/c3fa96913fa4a8a8598a5ca0a9b516a55589f48a))

# [5.16.0](https://github.com/andes/api/compare/v5.15.0...v5.16.0) (2020-10-07)


### Features

* **com:** cambios en nombres de estado ([#1138](https://github.com/andes/api/issues/1138)) ([59282d3](https://github.com/andes/api/commit/59282d3232f78159ffd7000f1f0c9ea75c7c246b))
* **com:** permisos para nuevo módulo ([#1133](https://github.com/andes/api/issues/1133)) ([4660f04](https://github.com/andes/api/commit/4660f04c4c3b010d2763da5dbabd95cc057de94b))
* **mapa-camas:** agrega permiso para bloquear camas ([#1129](https://github.com/andes/api/issues/1129)) ([1d16e08](https://github.com/andes/api/commit/1d16e086ef25782e0a3c38db055dcdef153846c8))
* **obra-social:** protege puco ([2cef26a](https://github.com/andes/api/commit/2cef26ae4df5e4805e863b0cf9066a8f31aecd46))
* **permisos:** agrego type queries ([#1116](https://github.com/andes/api/issues/1116)) ([6b16125](https://github.com/andes/api/commit/6b16125a212ce57bb3aeba1d8aa7e3ba2f10af28))
* **rup:** parámetro registrar conceptos repetidos en una prestación ([#1092](https://github.com/andes/api/issues/1092)) ([cbe84a9](https://github.com/andes/api/commit/cbe84a9af2ba9c3d31a6bf3a2f5613c751a22a70))
* **tup:** datos de la solicitud en informe-PDF ([#1130](https://github.com/andes/api/issues/1130)) ([17a5b6f](https://github.com/andes/api/commit/17a5b6fcbfaa0d5dd898eea043b06d8451b1ce94))

# [5.15.0](https://github.com/andes/api/compare/v5.14.0...v5.15.0) (2020-09-30)


### Bug Fixes

* **cda:** cambia string por objectId ([#1120](https://github.com/andes/api/issues/1120)) ([c4c73f6](https://github.com/andes/api/commit/c4c73f6e9b2052318ebb096e3122cb8f4758d0e2))
* **cda:** convert to ObjectId ([#1121](https://github.com/andes/api/issues/1121)) ([ecc631b](https://github.com/andes/api/commit/ecc631b628bb442f5e332da5f83abd20115b322f))
* **citas:** busqueda en sobreturnos ([#1118](https://github.com/andes/api/issues/1118)) ([5481262](https://github.com/andes/api/commit/5481262ee2bde0e1f76c12ff6e2e760e0ea638b6))
* **puco:** nombre incorrecto logo sumar ([#1125](https://github.com/andes/api/issues/1125)) ([9d9efa8](https://github.com/andes/api/commit/9d9efa84ae784c46990c2ca6613795fbdaa84c95))
* **rup:** conversión de id a objectId ([#1126](https://github.com/andes/api/issues/1126)) ([9abbf0a](https://github.com/andes/api/commit/9abbf0adbfeb38e50e3b62b2cd8219274cf2f5de))
* **rup:** modifica parámetro de readFile ([#1127](https://github.com/andes/api/issues/1127)) ([b475137](https://github.com/andes/api/commit/b475137b001c6a33c3b7a17f182ea339e0bc195a))


### Features

* **com:** esquema y rutas de derivaciones ([#1108](https://github.com/andes/api/issues/1108)) ([bdcb1e8](https://github.com/andes/api/commit/bdcb1e8728177890b49e6bf596faaa1bee0029ec))
* **com:** se suma a organización el atributo aceptaDerivacion ([#1114](https://github.com/andes/api/issues/1114)) ([0d0b080](https://github.com/andes/api/commit/0d0b080b45f613618a5905f5578d26dc6b6f1820))
* **mapa-camas:** agrega borrado lógico en los estados de cama ([#1072](https://github.com/andes/api/issues/1072)) ([c428320](https://github.com/andes/api/commit/c428320f8c709d6290b558fb822f9162bf64998d))
* **MISC:** refactor pdf PUCO ([#1111](https://github.com/andes/api/issues/1111)) ([cef8709](https://github.com/andes/api/commit/cef8709411ed31c2010f7f99cf4f97005390319c))

# [5.14.0](https://github.com/andes/api/compare/v5.13.0...v5.14.0) (2020-09-23)


### Bug Fixes

* **snowstorm:** too heavy request ([#1110](https://github.com/andes/api/issues/1110)) ([8cb2595](https://github.com/andes/api/commit/8cb25953322b980ff5207af99fc3a5004064e3ea))


### Features

* **mapa-camas:** agrega UO al extra de movimientos ([#1058](https://github.com/andes/api/issues/1058)) ([9cf956d](https://github.com/andes/api/commit/9cf956d9d5fa3d6927d366940b4459add87bc96c))

# [5.13.0](https://github.com/andes/api/compare/v5.12.1...v5.13.0) (2020-09-16)


### Bug Fixes

* **mpi:** se agregan controles entre pacientes similares para incluir temporales ([#1090](https://github.com/andes/api/issues/1090)) ([6c6e78b](https://github.com/andes/api/commit/6c6e78b18d656fea2967d65d80d8466881956a29))
* **profesionales:** control de errores ([#1104](https://github.com/andes/api/issues/1104)) ([62064ae](https://github.com/andes/api/commit/62064ae9f61894848a8754c305964f360c03aeba))


### Features

* **microservicios:** se suman identificadores a profesion para mapear a bases externas ([#1094](https://github.com/andes/api/issues/1094)) ([d4aeae1](https://github.com/andes/api/commit/d4aeae184afffe91c0108b563d00935472933037))

## [5.12.1](https://github.com/andes/api/compare/v5.12.0...v5.12.1) (2020-09-09)


### Bug Fixes

* **rup:** wrong index type ([8660469](https://github.com/andes/api/commit/86604690e7cb8066bfc138423da998fdbe5c0c76))

# [5.12.0](https://github.com/andes/api/compare/v5.11.0...v5.12.0) (2020-09-08)


### Bug Fixes

* **historial TOP:** guarda observaciones al citar paciente ([#1103](https://github.com/andes/api/issues/1103)) ([1384456](https://github.com/andes/api/commit/13844563f8eb7253d9f1be74c75e042c7b4d6790))
* **rup:** buscador filtra FSN === TERM ([#1089](https://github.com/andes/api/issues/1089)) ([e7a7bd6](https://github.com/andes/api/commit/e7a7bd6a0755206dff9554992d1e880110ddc899))
* **script top:** agrega control en datos de asignacion de turno ([#1101](https://github.com/andes/api/issues/1101)) ([855d8f1](https://github.com/andes/api/commit/855d8f19e60c1fbcfdbdc7ef326691704235e000))


### Features

* **core:** tipoPrestacion.id por tipoPrestacion.conceptId ([#1085](https://github.com/andes/api/issues/1085)) ([3ede5c7](https://github.com/andes/api/commit/3ede5c706268824ea73824b6e14c66f7d09eedc0))
* **log:** actualiza andes/log v2.0.0 ([#985](https://github.com/andes/api/issues/985)) ([4bbf8b0](https://github.com/andes/api/commit/4bbf8b0becd059d139ee7aafc200d45ff02af1d5))
* **mapa-camas:** agrega nota en los estados de camas ([#1060](https://github.com/andes/api/issues/1060)) ([2a49540](https://github.com/andes/api/commit/2a49540bf8fa69c2b9cebb8ce8c69e83b77cafcf))
* **mapa-camas:** para internacion filtra por fecha ingreso o egreso ([#1019](https://github.com/andes/api/issues/1019)) ([7d0ca19](https://github.com/andes/api/commit/7d0ca19dfdb3edb7881bc984792baee7698ac417))
* **mobileApp:** nuevo schema y rutas de categoría ([#1063](https://github.com/andes/api/issues/1063)) ([b19e48a](https://github.com/andes/api/commit/b19e48aff6e939ad6c24b511e2430915223f8f75))
* **rup:** agregar obra social a informe-pdf ([#1026](https://github.com/andes/api/issues/1026)) ([aed4363](https://github.com/andes/api/commit/aed43636aa1200ef9af63970044f7cabcdd0b9d3))
* **rup:** asociar la obra social a la prestación ([#1059](https://github.com/andes/api/issues/1059)) ([f35d701](https://github.com/andes/api/commit/f35d701e4b97cedd58672d5a3105cf56c19fea7d))
* **RUP:** get solicitudes trae estadoActual ([#1087](https://github.com/andes/api/issues/1087)) ([6b2ade1](https://github.com/andes/api/commit/6b2ade131f4c64b5a9b8ccb8ae4f32e44a67a7bd))

# [5.11.0](https://github.com/andes/api/compare/v5.10.0...v5.11.0) (2020-09-02)


### Bug Fixes

* **mpi:** guarda titulo de la nota de un paciente ([#1086](https://github.com/andes/api/issues/1086)) ([6f33213](https://github.com/andes/api/commit/6f332138b1216ffa2439a5409f45ed5afa1db8eb))
* **rup:** filtrar los valores null de los graficos ([#1073](https://github.com/andes/api/issues/1073)) ([dce7b05](https://github.com/andes/api/commit/dce7b0502f4baac31ee0d3786286e7ab37d059f9))


### Features

* **elemento-rup:** filtro por sexo en requeridos ([97dca2c](https://github.com/andes/api/commit/97dca2c5b58c474fdedd12693cde9c6fdf5d989e))
* **elementos-rup:** remove populate de requeridos ([ba55992](https://github.com/andes/api/commit/ba559927e5eca758a2f2a7237825da7d0972bb08))
* **rup:** asistencia del turno en background ([#1035](https://github.com/andes/api/issues/1035)) ([ca7b90c](https://github.com/andes/api/commit/ca7b90cb017888146496cac1ea4b9aa3dc7b3576))
* **rup:** registro inicio de prestacion ([#1088](https://github.com/andes/api/issues/1088)) ([eb7a560](https://github.com/andes/api/commit/eb7a5606ef1d57bb56cedf637987c94cf165d5b4))
* **top:** mejoras de performance ()  ([#1082](https://github.com/andes/api/issues/1082)) ([a144474](https://github.com/andes/api/commit/a144474eb86d994eb5a26af275bec0943cf6e400))

# [5.10.0](https://github.com/andes/api/compare/v5.9.0...v5.10.0) (2020-08-26)


### Features

* **mapas-camas:** agrega permiso para editar cama ([#1047](https://github.com/andes/api/issues/1047)) ([c3a7a4c](https://github.com/andes/api/commit/c3a7a4c3611e896f5e24b524493c888febaa0dac))
* **mitos:** busqueda por expression ([#1051](https://github.com/andes/api/issues/1051)) ([6970ff6](https://github.com/andes/api/commit/6970ff67cdd96fed8e7f1e7c2a5bba0b78822f0c))
* **organizacion:** agrega controles para eliminar y editar sector ([#1057](https://github.com/andes/api/issues/1057)) ([c5dde6c](https://github.com/andes/api/commit/c5dde6cf6c8de21b3e776162d94ebf77090a1093))
* **TOP:** observaciones en referir solicitud ([#1078](https://github.com/andes/api/issues/1078)) ([7846387](https://github.com/andes/api/commit/784638743ea6920206375aafd174062c9dd48d59))

# [5.9.0](https://github.com/andes/api/compare/v5.8.0...v5.9.0) (2020-08-19)


### Bug Fixes

* **mpi:** se elimina condicion paciente.documento ([#1079](https://github.com/andes/api/issues/1079)) ([9e2ac75](https://github.com/andes/api/commit/9e2ac75d392d553dcf9a716826584d1c1424cabe))
* **prestamo:** agrega control de fecha manual ([#1050](https://github.com/andes/api/issues/1050)) ([3fe73aa](https://github.com/andes/api/commit/3fe73aaeab58d9297e4ec29573922d410a816c6f))
* **prestamos:**  wrong date ([#1077](https://github.com/andes/api/issues/1077)) ([6e3843f](https://github.com/andes/api/commit/6e3843fa19b795fae5cb9399192f85059fee9744))


### Features

* **mpi:** actualiza paquete fuentes-autenticas y esquema de relacion ([#1071](https://github.com/andes/api/issues/1071)) ([e16b7c1](https://github.com/andes/api/commit/e16b7c1f3e8234ee58fa11c303ecf4fa75aae2a0))
* **TOP:** nueva operacion responder en PATCH de prestaciones ([#1052](https://github.com/andes/api/issues/1052)) ([e8ac0ef](https://github.com/andes/api/commit/e8ac0ef7bad3cb284ec66a7fcd18de101f65ca3e))

# [5.8.0](https://github.com/andes/api/compare/v5.7.0...v5.8.0) (2020-08-12)


### Bug Fixes

* **mpi:** fix pacienetes similares ([#1066](https://github.com/andes/api/issues/1066)) ([309102c](https://github.com/andes/api/commit/309102c089d22f3f130b95a9045b741bc4eaeffb))


### Features

* **top:** filtrado de solicitudes por createdAt y nuevo indice ([#1069](https://github.com/andes/api/issues/1069)) ([47408c7](https://github.com/andes/api/commit/47408c7a04c33d3e6a7ef73306d698efb07feb3b))
* **TOP:** busca por mas de una prestacion destino ([#1070](https://github.com/andes/api/issues/1070)) ([129d971](https://github.com/andes/api/commit/129d9710a9ce8eb65dcaad7110c072b251ff9cdc))

# [5.7.0](https://github.com/andes/api/compare/v5.6.0...v5.7.0) (2020-08-05)


### Features

* **pecas:** agrega idprofesional a la tabla de fuera de agenda ([#938](https://github.com/andes/api/issues/938)) ([98d8c7e](https://github.com/andes/api/commit/98d8c7e92255652d6f1763c94aefc43bd5d87540))
* **rup:** prestacion estadoActual ([#1012](https://github.com/andes/api/issues/1012)) ([8bb11ef](https://github.com/andes/api/commit/8bb11ef4eb29740a56d45c9150da5f03e87c75ee))

# [5.6.0](https://github.com/andes/api/compare/v5.5.0...v5.6.0) (2020-07-29)


### Bug Fixes

* **calle:** agrega control de caracteres ([#1061](https://github.com/andes/api/issues/1061)) ([f9727da](https://github.com/andes/api/commit/f9727dab9ba7f35cd9fbc6804e4b6932d9c2b0e7))
* **mapa-camas:** controla la unidad organizativa al calcular pases ([#1045](https://github.com/andes/api/issues/1045)) ([33b6c4a](https://github.com/andes/api/commit/33b6c4aa2d405a7b452ae41af359621fa4c30fdb))
* **pecas:** corrige todas las apariciones de comillas en el domicilio del paciente ([#1062](https://github.com/andes/api/issues/1062)) ([3638ac7](https://github.com/andes/api/commit/3638ac781182007717941708dbf7618497058beb))


### Features

* **citas:** audita agenda al validar prestacion no nominalizada ([#1029](https://github.com/andes/api/issues/1029)) ([f3fc2ba](https://github.com/andes/api/commit/f3fc2ba75650712610bda635e6226872be7a051a))
* **mapa-camas:** registros filtros por unidad organizativa ([#1054](https://github.com/andes/api/issues/1054)) ([7786213](https://github.com/andes/api/commit/778621310d1fbb652e5113ab81c4dabe885aaa09))
* **pecas:** se agregan y completan campos en tabla consolidado ([#914](https://github.com/andes/api/issues/914)) ([becf42e](https://github.com/andes/api/commit/becf42e0ef2959db8bb509c7d453a5f15292b839))
* **ServSalud:** agregado codigo de ServSalud para la organizacion y para el tipo de prestacion. ([#1046](https://github.com/andes/api/issues/1046)) ([05b260b](https://github.com/andes/api/commit/05b260b89660410c20313f88702344476a3f57d4))
* **TOP:** match de organizaciones de solicitud por array ([#1039](https://github.com/andes/api/issues/1039)) ([c0704ad](https://github.com/andes/api/commit/c0704ad5ffd405fc58abd7948d0102528c6081a7))

# [5.5.0](https://github.com/andes/api/compare/v5.4.0...v5.5.0) (2020-07-22)


### Bug Fixes

* **mapa-camas:** persistencia de matadata en movimientos ([#1037](https://github.com/andes/api/issues/1037)) ([b2167f7](https://github.com/andes/api/commit/b2167f7c1073aba74d4e88d2d8aece6b1167cdc1))
* **mpi:** quita la foto desde schema paciente ([#1042](https://github.com/andes/api/issues/1042)) ([09278fa](https://github.com/andes/api/commit/09278faf4e46e91c276047eb1024049713c78d69))


### Features

* **GESTOR:** Remueve permiso Mis Solicitudes ([9678b6f](https://github.com/andes/api/commit/9678b6fe4a36e38f2416fca881568ba14797363e))
* **mapa-camas:** chequeo de inegridad de estados ([#965](https://github.com/andes/api/issues/965)) ([6dd76a4](https://github.com/andes/api/commit/6dd76a4382e44f8c7d24051430f84409249d9b32))
* **mapa-camas:** dias de estada ([#1023](https://github.com/andes/api/issues/1023)) ([1c5f048](https://github.com/andes/api/commit/1c5f0480bbee10a87605c35949767b6cf0b0ca9f))
* **rup:** configurar diagnostico principal dinamico ([#992](https://github.com/andes/api/issues/992)) ([262129b](https://github.com/andes/api/commit/262129b82e8b22906ae20030265176a87ff63d34))

# [5.4.0](https://github.com/andes/api/compare/v5.3.0...v5.4.0) (2020-07-15)


### Bug Fixes

* **mpi:** quita select de paciente ([22360e0](https://github.com/andes/api/commit/22360e0b4b56433174c16f70f7c1a03997a95239))


### Features

* **mpi:** add index para búsqueda ([953bdf5](https://github.com/andes/api/commit/953bdf551529a855a86ea001b059a0846289c825))
* **mpi:** genera tokens por palabras ([f92570d](https://github.com/andes/api/commit/f92570d0d48e07dd1eb819527200d784454d0bfd))
* **permisos:** se borra permiso usuarios:perfiles:read ([0182570](https://github.com/andes/api/commit/0182570142ac95315b58b40b163fecd4d97d6460))
* **TM:** asigna organizacion a usuario autor ([13ac49b](https://github.com/andes/api/commit/13ac49bf485fa795bbab68026ab78a277163a569))
* **TOP:** busca solicitudes por mas de una organizacion ([93c8fef](https://github.com/andes/api/commit/93c8fef15d3b5118c80d0a2432bcbfc4a85b6a91))

# [5.3.0](https://github.com/andes/api/compare/v5.2.0...v5.3.0) (2020-07-08)


### Bug Fixes

* **Internacion:** Uso de  handleHttpRequest definido en utils ([36a5f60](https://github.com/andes/api/commit/36a5f6022f8e0f83002c64aa35f7249410ae8da0))
* **mapa-camas:** censo filtra por camas censables ([#1001](https://github.com/andes/api/issues/1001)) ([505496a](https://github.com/andes/api/commit/505496aa0fb8dc9c74770b094a36c38bf344fb89))
* **mitos:** evita buscar en ingles ([#1025](https://github.com/andes/api/issues/1025)) ([a41b212](https://github.com/andes/api/commit/a41b2120bb3cbc3e71ad6b35d5c733405732425d))
* **mpi:** busqueda por nro documento extranjero ([3e4a0cb](https://github.com/andes/api/commit/3e4a0cb198148f10ee5c10fad5980a77da601232))
* **ReportesDiarios:** timezones de los reportes y contar los sobreturnos y fuera de agenda en la planilla C1 ([5c90b47](https://github.com/andes/api/commit/5c90b4719cd71d6650902b0780a1289109070dd7))


### Features

* **Internacion:** Busca los datos de las organizaciones a exportar desde las queries de bi-queries ([2768a96](https://github.com/andes/api/commit/2768a9687825328c8752dd4c1b57b5b3402ab18e))
* **rup:** remove refsetids from snomed schema ([#1017](https://github.com/andes/api/issues/1017)) ([5603631](https://github.com/andes/api/commit/5603631884a995936407ffe82d4e12d6fe0f7ec7))
* **snomed:** busqueda multiple semanticTags nativa ([#1020](https://github.com/andes/api/issues/1020)) ([3c5a6d1](https://github.com/andes/api/commit/3c5a6d1584ba79d55724c3bff6c0ea00dbc2ec62))
* **top:** reglas según permisos ([#1003](https://github.com/andes/api/issues/1003)) ([1e3c51b](https://github.com/andes/api/commit/1e3c51b5a91e3d28d5dbb2c2c947b1c6ba6887b8))

# [5.2.0](https://github.com/andes/api/compare/v5.1.0...v5.2.0) (2020-07-01)


### Bug Fixes

* **mpi:** verifica campo de georeferencia ([227fc16](https://github.com/andes/api/commit/227fc16e22306ec7e6b6a99e10cebfc025dd7ea4))
* **notification:** Se cambio interfaz de notificacion ([4b41088](https://github.com/andes/api/commit/4b4108817bf5dd43f69f2c26bf4f97a5ef5cfe92))


### Features

* **robosender:** push notifications ([5c9c6d2](https://github.com/andes/api/commit/5c9c6d28344cd95f32bbc6c776282c3d63add3ef))
* **rup:** agrega ambito al subject del email del informe ([#1014](https://github.com/andes/api/issues/1014)) ([f3b956f](https://github.com/andes/api/commit/f3b956f269ed32356cdd19db9bb3004352922b89))
* **TOP:** incluye operacion citar al PATCH de preestaciones ([49c40c8](https://github.com/andes/api/commit/49c40c811bd772ff983b40bf72a346cb1259eda8))

# [5.1.0](https://github.com/andes/api/compare/v5.0.0...v5.1.0) (2020-06-24)


### Bug Fixes

* **citas:** asistencia en turnos de ayer ([#917](https://github.com/andes/api/issues/917)) ([d736668](https://github.com/andes/api/commit/d7366683a652f809d437c08fe9344778ab2a6055))
* **internacion:** informe pdf sin camas asociadas ([#1009](https://github.com/andes/api/issues/1009)) ([da15035](https://github.com/andes/api/commit/da15035a4075a338dcef0ccc1783c925c0d4374a))
* **mpi:** correcciones en validacion de paciente ([3c21e58](https://github.com/andes/api/commit/3c21e5825bdedf2ac14e24322f8977092e7870ea))
* **rup:** profesional en solicitud por defecto ([#1002](https://github.com/andes/api/issues/1002)) ([9580983](https://github.com/andes/api/commit/95809833701f6fb35b810b6a85675f9850c93e89))
* **turnos:** elimina promise ([8053d54](https://github.com/andes/api/commit/8053d5433114919e59657cdb04213f8a5dfe8385))


### Features

* **huds:** permiso impresión huds ([#1005](https://github.com/andes/api/issues/1005)) ([b2fc7eb](https://github.com/andes/api/commit/b2fc7eb20acd220f969fa25909feacb607ba19ab))
* **modulos:** campos de activo y orden ([3f91a5c](https://github.com/andes/api/commit/3f91a5cb4d4764bde3939e383421aa79214cf11c))
* **monitoreo:** permisos para los modulos de monitoreoApp ([1b16577](https://github.com/andes/api/commit/1b16577dbb01e84eef3740e024cf33664db108ac))
* **mpi:** implementa paquete georeference ([4fb7c92](https://github.com/andes/api/commit/4fb7c927a66874243d88f29347aa9ed1f5a724b8))
* **mpi:** refactor search paciente ([eb24e88](https://github.com/andes/api/commit/eb24e8813cce1b367be14e47c3e3e671cbcbc52c))
* **permisos:** se suma el permiso de módulos para monitoreo ([9a83937](https://github.com/andes/api/commit/9a83937eb9776cd0068f6a45e29ef7e2e460da8f))
* **rup:** add isEmpty flag ([#990](https://github.com/andes/api/issues/990)) ([de68c52](https://github.com/andes/api/commit/de68c526eb3f4c620fbd0a36f3e65b3ebcde8447))
* **rup:** agrega nombre y sector de la cama en informe pdf ([#997](https://github.com/andes/api/issues/997)) ([4819d7f](https://github.com/andes/api/commit/4819d7f4b12fcfae42d19e9137f44a68eae82468))
* **rup:** excluye notas privadas en informe pdf ([#1006](https://github.com/andes/api/issues/1006)) ([ed75343](https://github.com/andes/api/commit/ed75343fbbc260a3b101fb828df644ea4fb24f70))
* **rup:** plantillas para solicitudes ([#993](https://github.com/andes/api/issues/993)) ([0e411d7](https://github.com/andes/api/commit/0e411d7f2fa7327c47fd553af0d73b709cd66865))
* **TOP:** agrega remision de solicitudes ([58985a0](https://github.com/andes/api/commit/58985a0d6d36e37b89c57c002fd6449e7d37b449))
* **turno:** cambios para visualizar historial de turnos app-mobile ([909b2dd](https://github.com/andes/api/commit/909b2dde9b83f939ba7072e0cae10e473548346d))

# [5.0.0](https://github.com/andes/api/compare/v4.10.0...v5.0.0) (2020-06-04)


### Bug Fixes

* **mapa-camas:** control de ingreso-egreso en el mismo día ([#986](https://github.com/andes/api/issues/986)) ([8009577](https://github.com/andes/api/commit/80095770f8359c0590ba0b674bcd8bbabb092259))
* **mis-familiares:** nueva ruta ([948597f](https://github.com/andes/api/commit/948597f5167a6ad229d7a8dbb39746c4da85edd2))
* **mis-familiares:** uso buscarPaciente y verifico familiar ([907070c](https://github.com/andes/api/commit/907070c43499d09fe620da69f6202b0156e0f3c6))
* **obra-social:** arregla bug editar paciente ([11035f0](https://github.com/andes/api/commit/11035f0a90cc2d8f5cb7fb4336f86121f7093247))
* **rup:** frecuentes en secciones ([#984](https://github.com/andes/api/issues/984)) ([5d1da9c](https://github.com/andes/api/commit/5d1da9cd71f51e4e44a8423d671ee0b28514e75c))


### chore

* **version:** add semantic-release ([fa1b0b3](https://github.com/andes/api/commit/fa1b0b3fe5833559103c9468f7751bad1da611c0))


### Features

* **mapa-camas:** agrega al esquema de estados (en extras) el tipo de egreso ([#989](https://github.com/andes/api/issues/989)) ([84169e2](https://github.com/andes/api/commit/84169e2c41888ff53fb0c1af272412293e713f06))
* **mobile-app:** se agrega funcion mis familiares ([aa57d2c](https://github.com/andes/api/commit/aa57d2cff4ebafebf29f3299e777e2f3ecfafa7e))
* **rupers:** resource base para elementos rup ([#966](https://github.com/andes/api/issues/966)) ([92f7b34](https://github.com/andes/api/commit/92f7b34bb9f758094ebfb8ddfda2600a3f243f46))


### BREAKING CHANGES

* **version:** agregamos semantic-release y empezamos a versionar automaticamente
