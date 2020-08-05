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
