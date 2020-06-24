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
