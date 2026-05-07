import json
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, send_from_directory
import requests

try:
    from bs4 import BeautifulSoup
except ImportError:  # pragma: no cover
    BeautifulSoup = None

load_dotenv()

APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / 'calculator'
APIFY_API_TOKEN = os.getenv('APIFY_API_TOKEN', '').strip()
APIFY_ACTOR = 'curious_coder~facebook-ads-library-scraper'

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path='')


def build_facebook_ads_url(keyword: str, country: str) -> str:
    keyword = keyword.strip()
    country = country.strip().upper()
    query = requests.utils.requote_uri(keyword)
    return (
        f'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country={country}'
        f'&q={query}&search_type=keyword_unordered&media_type=all'
    )


def call_apify_ads_scraper(search_url: str, max_items: int = 20) -> dict:
    if not APIFY_API_TOKEN:
        raise RuntimeError('APIFY_API_TOKEN not configured')

    run_url = f'https://api.apify.com/v2/acts/{APIFY_ACTOR}/runs?token={APIFY_API_TOKEN}'
    payload = {
        'urls': [{'url': search_url}],
        'count': max_items,
        'scrapePageAds.activeStatus': 'active',
    }
    response = requests.post(run_url, json=payload, timeout=120)
    response.raise_for_status()
    data = response.json()
    dataset_id = data.get('defaultDatasetId')
    if not dataset_id:
        raise RuntimeError('Apify actor did not return a dataset id')

    items_url = f'https://api.apify.com/v2/datasets/{dataset_id}/items?format=json&clean=1&limit={max_items}&token={APIFY_API_TOKEN}'
    dataset_response = requests.get(items_url, timeout=120)
    dataset_response.raise_for_status()
    items = dataset_response.json()

    prospects = []
    for item in items[:max_items]:
        prospects.append({
            'page_name': item.get('pageName') or item.get('page_name') or 'Inconnu',
            'page_url': item.get('pageUrl') or item.get('page_url') or '',
            'ad_text': item.get('adText') or item.get('ad_text') or '',
        })
    return {
        'prospects': prospects,
        'source': 'apify',
        'datasetId': dataset_id,
    }


def build_public_forum_search_url(keyword: str, country: str) -> str:
    keyword = keyword.strip()
    if not keyword:
        keyword = 'panneaux solaires wallonie forum'
    if country.upper() == 'BE' and 'wallonie' not in keyword.lower():
        keyword += ' wallonie'
    if 'forum' not in keyword.lower() and 'discussion' not in keyword.lower():
        keyword += ' forum'
    query = requests.utils.requote_uri(keyword)
    return f'https://html.duckduckgo.com/html?q={query}&kl=fr-fr'


def scrape_public_forum_results(search_url: str, max_items: int = 20) -> list[dict]:
    if BeautifulSoup is None:
        raise RuntimeError('BeautifulSoup non installé. Installez beautifulsoup4.')

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    }
    response = requests.get(search_url, headers=headers, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, 'html.parser')
    results = []
    for link in soup.select('a.result__a, a[data-testid="result-title-a"]'):
        title = link.get_text(strip=True)
        url = link.get('href', '').strip()
        snippet = ''
        parent = link.find_parent('div', class_='result')
        if parent:
            snippet_el = parent.select_one('.result__snippet, .result__abstract')
            if snippet_el:
                snippet = snippet_el.get_text(strip=True)
        if not title or not url:
            continue
        results.append({
            'title': title,
            'url': url,
            'description': snippet or 'Discussion publique ou fil de forum.',
        })
        if len(results) >= max_items:
            break

    if not results:
        for link in soup.select('a'):
            title = link.get_text(strip=True)
            url = link.get('href', '').strip()
            if title and url and url.startswith('http'):
                results.append({
                    'title': title,
                    'url': url,
                    'description': 'Résultat public trouvé sur la recherche.',
                })
            if len(results) >= max_items:
                break

    return results


@app.route('/')
def index():
    return send_from_directory(str(STATIC_DIR), 'index.html')


@app.route('/<path:path>')
def static_proxy(path: str):
    if (STATIC_DIR / path).exists():
        return send_from_directory(str(STATIC_DIR), path)
    return redirect('/')


@app.route('/api/prospection', methods=['POST'])
def api_prospection():
    body = request.get_json(force=True, silent=True) or {}
    keyword = (body.get('keyword') or '').strip()
    country = (body.get('country') or 'BE').strip().upper()
    max_items = int(body.get('max') or 20)

    if not keyword:
        return jsonify({'error': 'Mot-clé requis.'}), 400
    if not country.isalpha() or len(country) != 2:
        return jsonify({'error': 'Code pays ISO à 2 lettres requis.'}), 400
    if max_items < 1 or max_items > 200:
        return jsonify({'error': 'Nombre de prospects doit être entre 1 et 200.'}), 400

    search_url = build_facebook_ads_url(keyword, country)
    result = {
        'search_url': search_url,
        'keyword': keyword,
        'country': country,
        'max': max_items,
        'backend': 'local',
        'message': 'Backend prêt. Utilisez Facebook Ads Library ou Apify pour extraire les prospects.',
        'prospects': []
    }

    if APIFY_API_TOKEN:
        try:
            apify_data = call_apify_ads_scraper(search_url, max_items)
            result.update(apify_data)
            result['message'] = 'Données extraites depuis Apify. Consultez la liste de prospects.'
        except Exception as exc:
            result['error'] = f'Erreur Apify: {exc}'
            result['message'] = 'Impossible d’exécuter Apify. Utilisez la recherche manuelle.'
            result['backend'] = 'fallback'
    else:
        result['message'] = (
            'APIFY_API_TOKEN non configuré. La recherche est prête, mais le scraper Apify n’a pas été exécuté.'
        )
        result['prospects'] = [
            {
                'page_name': f'Prospect factice {i + 1}',
                'page_url': '',
                'ad_text': f'Page suggérée pour "{keyword}" en {country}.',
            }
            for i in range(min(5, max_items))
        ]

    return jsonify(result)


@app.route('/api/public-scrape', methods=['POST'])
def api_public_scrape():
    body = request.get_json(force=True, silent=True) or {}
    keyword = (body.get('keyword') or '').strip()
    country = (body.get('country') or 'BE').strip().upper()
    max_items = int(body.get('max') or 20)

    if not keyword:
        return jsonify({'error': 'Mot-clé requis.'}), 400
    if not country.isalpha() or len(country) != 2:
        return jsonify({'error': 'Code pays ISO à 2 lettres requis.'}), 400
    if max_items < 1 or max_items > 200:
        return jsonify({'error': 'Nombre de résultats doit être entre 1 et 200.'}), 400

    search_url = build_public_forum_search_url(keyword, country)
    result = {
        'search_url': search_url,
        'keyword': keyword,
        'country': country,
        'max': max_items,
        'backend': 'local',
        'source': 'public_forums',
        'results': [],
        'message': 'Recherche publique prête. Scraping des forums en cours.'
    }

    try:
        result['results'] = scrape_public_forum_results(search_url, max_items)
        if result['results']:
            result['message'] = f"{len(result['results'])} résultats publics extraits."
        else:
            result['message'] = 'Aucun résultat structuré trouvé. Utilisez l’URL de recherche pour inspecter manuellement.'
    except Exception as exc:
        result['error'] = f'Erreur scraping: {exc}'
        result['results'] = [
            {
                'title': 'Recherche publique prête',
                'description': 'Impossible de scraper automatiquement. Utilisez l’URL de recherche pour inspecter les forums manuellement.',
                'url': search_url,
            }
        ]
        result['message'] = 'Erreur de scraping. Vérifiez la configuration ou utilisez la recherche manuelle.'

    return jsonify(result)


@app.route('/api/health', methods=['GET'])
def api_health():
    return jsonify({'status': 'ok', 'apify': bool(APIFY_API_TOKEN)})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
