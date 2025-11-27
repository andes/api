#

## Intalación de `uv`

> [!INFO:] 
> `uv` es un proyecto que combina las herramientas de venv y pip. Esto nos permite hacer una gestion de versiones de python y de entorno muy sencilla. (Es como si npm y nvm fueran un solo conjunto de herramientas)

### Para instalar la ultima version de `uv` en MacOS y Linux:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Para instalar la ultima version de `uv` en Windows:

```ps
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```


## Ejecucion del proyecto

Una vez instalado `uv` y parados en la terminal en la raiz del proyecto `test-api-snomed`
podemos directamente ejecutar el comando:

```bash
uv run main.py
```

Este comando aparte de ejecutar el script. Previamente va a revisar que tengamos nuestra version de python requerida, nuestro entorno creado y nuestras dependencias actualizadas.

Tambien se puede usar el comando: 

```bash
uv sync
```

Este solo hara la comprobacion de versiones de python y dependencias en el entorno local, sin ejecutar nada del codigo del proyecto.



