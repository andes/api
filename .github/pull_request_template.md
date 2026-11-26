<!--

PASOS PARA REGISTRAR UN PULL REQUEST
_____________________________________________

1) Escribir el nombre siguiendo estas reglas:
   - Indicar como prefijo el nombre del módulo
   - Si la funcionalidad corresponde a una User Story, el nombre debe coincidir son su título
   - No utilizar la palabra fix ni sus derivados

   Ejemplo: CITAS - Reglas de referencia y contrarreferencia para la carga de solicitudes

2) Seleccionar el proyecto al que pertenece (CITAS, RUP, MPI, ...)
3) Asignar revisores que sean miembros del equipo responsable de revisar el pull request
4) Completar las siguientes secciones:

-->
### Requerimiento
<!-- URL de la User Story, referencia al issue (#1111) o breve descripcion del requerimiento -->

### Funcionalidad desarrollada 
<!-- Describir que se desarrollo -->
1. 
2. 
3. 


### UserStories llegó a completarse
<!-- Marca con una X la casilla correcta-->
- [ ] Si
- [ ] No

### Requiere actualizaciones en la base de datos
<!-- Marca con una X la casilla correcta-->
<!-- Indique el cambio en caso afirmativo, agradecemos si es en forma de comando en mongo además de una explicación -->
- [ ] Si
- [ ] No


### Test

<!--
Descomentá las opciones que correspondan a los tests que quieras ejecutar.
Si dejás todas las opciones comentadas, no se ejecutarán los tests.

Documentación:
https://github.com/andes/andes-test-integracion#readme
-->

```
# 1. STACK (entorno de integración)
# Seleccionar como máximo uno. Por defecto: andes.

# andes
# pacs

# 2. GRUPOS DE TESTS
# Seleccionar uno o varios grupos del stack correspondiente.
# Usar "todos" para ejecutar todos los grupos del stack.

# todos

# Grupos del stack ANDES:
# core
# citas
# rup-internacion
# rup
# apps
# monitoreo
# mobile

# 3. ARCHIVOS O DIRECTORIOS ESPECÍFICOS (opcional)
# Alternativa a la selección de grupos.
# No combinar con grupos ni con "todos".

# cypress/e2e/apps/mobile

# 4. RAMAS DE LOS REPOSITORIOS (opcional)
# Descomentar y reemplazar "master" por la rama deseada.
# El repositorio del PR utiliza automáticamente el commit del PR.

# app: master
# api: master
# mobile: master
# monitoreo: master
# matriculaciones: master
# tests: master
```

<!-- Agregar captura de pantalla, si fuera relevante  -->


<!-- Código relevante 
  ```
  (pegar código aquí)  
  ``` 
-->
