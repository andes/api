![ANDES](https://github.com/andes/andes.github.io/raw/master/images/logo.png)

## API

APIs para ANDES

## Instalación

### Instalar dependencias

```bash
npm install -g nodemon
cd api
npm install
```

### Configuración

Renombrar el archivo `config.private.ts.example` a `config.private.ts`, y completar el mismo con la configuración deseada.

### Iniciar el servidor web

```bash
npm start
```

## Docker

### Build images

```bash
docker build -t andesnqn/api .
```

### Run image in container

```bash
docker run  -p  3002:3002  --rm --name andes_api andesnqn/api 
```

### Run container for development

```bash
docker run -v  ${pwd}:/usr/src/api  -p  3002:3002  --rm --name andes_api andesnqn/api 

#Stop container
docker stop andes_api

#Run command inside the conntainer
docker exec andes_api npm install

```
