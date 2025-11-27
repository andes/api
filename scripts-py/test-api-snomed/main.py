import json
import requests
from typing import List, Dict, Any
import logging
from pathlib import Path
import time
import os
from dotenv import load_dotenv


load_dotenv()

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_json_data(file_path: str) -> List[Dict[str, Any]]:
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            if isinstance(data, list):
                return data
            else:
                return [data]
    except FileNotFoundError:
        logger.error(f"Archivo no encontrado: {file_path}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Error al decodificar JSON: {e}")
        return []

def make_http_request(item: Dict[str, Any], base_url: str, auth_token: str = None) -> Dict[str, Any]:
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Python-HTTP-Client/1.0'
    }
    if auth_token:
        headers['Authorization'] = f'{auth_token}'
    
    concept_id = item.get('conceptId', '')
    if not concept_id:
        logger.error(f"No se encontró conceptId en el item: {item.get('term', 'unknown')}")
        return {
            'item_id': item.get('conceptId', 'unknown'),
            'concept_id': concept_id,
            'term': item.get('term', 'unknown'),
            'url': '',
            'method': 'GET',
            'success': False,
            'status_code': None,
            'response_data': None,
            'error': 'conceptId no encontrado'
        }
    
    url = f"https://app.andes.gob.ar/api/core/term/snomed/relationships?expression=^331101000221109:774160008=<{concept_id}"
    method = 'GET'
    
    result = {
        'item_id': item.get('conceptId', 'unknown'),
        'concept_id': concept_id,
        'term': item.get('term', 'unknown'),
        'url': url,
        'method': method,
        'success': False,
        'status_code': None,
        'response_data': None,
        'error': None
    }
    
    try:
        logger.info(f"Realizando consulta {method} para conceptId: {concept_id} - {item.get('term', 'unknown')}")
        
        response = requests.get(
            url=url,
            headers=headers,
            timeout=30
        )
        
        result['status_code'] = response.status_code
        result['success'] = response.status_code < 400
        
        try:
            result['response_data'] = response.json()
        except json.JSONDecodeError:
            result['response_data'] = response.text
            
        if result['success']:
            logger.info(f"Consulta exitosa: {response.status_code}")
        else:
            logger.warning(f"Consulta falló: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        result['error'] = str(e)
        logger.error(f"Error en la consulta: {e}")
    
    return result

def process_requests(json_file_path: str, url: str, auth_token: str = None) -> List[Dict[str, Any]]:
    data = load_json_data(json_file_path)
    
    if not data:
        logger.error("No se pudieron cargar los datos del JSON")
        return []
    
    logger.info(f"Procesando {len(data)} elementos")
    
    results = []
    for i, item in enumerate(data, 1):
        logger.info(f"Procesando elemento {i}/{len(data)} - conceptId: {item.get('conceptId', 'unknown')}")
        result = make_http_request(item, url, auth_token)
        results.append(result)
    
    return results

def save_results(results: List[Dict[str, Any]], output_file: str = "results.json"):
    try:
        with open(output_file, 'w', encoding='utf-8') as file:
            json.dump(results, file, indent=2, ensure_ascii=False)
        logger.info(f"Resultados guardados en {output_file}")
    except Exception as e:
        logger.error(f"Error al guardar resultados: {e}")

def main():
    json_file = "requests.json"
    url = "https://app.andes.gob.ar/api/core/term/snomed/relationships?expression=(^331101000221109:774160008="
    auth_token = os.getenv('API_TOKEN')
    output_file = "results.json"
    
    logger.info(f"Iniciando procesamiento con URL base: {url}")
    
    # Verificar si existe el archivo JSON
    if not Path(json_file).exists():
        logger.error(f"El archivo {json_file} no existe")
        logger.info("El archivo JSON debe contener objetos con 'conceptId', 'term', 'fsn', etc.")
        return
    
    data = load_json_data(json_file)
    
    if not data:
        logger.error("No se pudieron cargar los datos del JSON")
    
    logger.info(f"Procesando {len(data)} elementos")
    
    results = []
    for i, item in enumerate(data, 1):
        logger.info(f"Procesando elemento {i}/{len(data)} - conceptId: {item.get('conceptId', 'unknown')}")
        result = make_http_request(item, url, auth_token)
        results.append(result)
        time.sleep(2)
        
    
    # Guardar resultados
    if results:
        save_results(results, output_file)
        
        # Mostrar resumen
        successful = sum(1 for r in results if r['success'])
        total = len(results)
        logger.info(f"Resumen: {successful}/{total} consultas exitosas")
    else:
        logger.error("No se procesaron consultas")


if __name__ == "__main__":
    main()
