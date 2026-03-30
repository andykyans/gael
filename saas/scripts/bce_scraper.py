#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
bce_scraper.py — Script de génération des leads B2B Wallonie
============================================================
Télécharge les données Open Data de la BCE (Banque-Carrefour des Entreprises)
et génère un fichier JSON des entreprises wallonnes dans les secteurs cibles.

Source officielle : https://economie.fgov.be/fr/themes/entreprises/
                    banque-carrefour-des-entreprises/data-de-la-bce/bce-open-data

Usage :
    python bce_scraper.py

Output :
    bce_wallonie.json  — chargé automatiquement dans l'app Gaele Pro
"""

import os
import io
import json
import zipfile
import requests
import csv
import time
from datetime import datetime

# ── CONFIGURATION ──────────────────────────────────────────────────────────────

# URL Open Data BCE (fichier zip mis à jour mensuellement)
BCE_OPEN_DATA_URL = "https://economie.fgov.be/sites/default/files/Files/Entreprises/KBO/kbo-open-data-0120.zip"

# Codes postaux Wallonie (toutes les provinces wallonnes)
WALLONIE_CP = set()
# Brabant wallon: 1300-1499
for cp in range(1300, 1500): WALLONIE_CP.add(str(cp))
# Hainaut: 6000-7999
for cp in range(6000, 8000): WALLONIE_CP.add(str(cp))
# Namur: 5000-5999
for cp in range(5000, 6000): WALLONIE_CP.add(str(cp))
# Liège: 4000-4999
for cp in range(4000, 5000): WALLONIE_CP.add(str(cp))
# Luxembourg belge: 6600-6999 (déjà dans Hainaut range, récupération sûre)

# Codes NACE pertinents (secteurs cibles pour panneaux solaires)
NACE_CIBLES = {
    # Construction & bâtiment
    "4120": "Construction résidentielle",
    "4121": "Construction maisons individuelles",
    "4122": "Construction bâtiments",
    "4211": "Construction routes",
    "4321": "Installation électrique",
    "4322": "Plomberie / chauffage",
    "4329": "Autres travaux installation",
    "4391": "Travaux couverture",
    "4399": "Autres travaux construction",
    # Immobilier
    "6810": "Achat / vente immobilier",
    "6820": "Location / gestion immobilier",
    "6831": "Agences immobilières",
    "6832": "Gestion immobilier",
    # Petits commerces / artisans (potentiel toiture commerciale)
    "4711": "Supermarchés",
    "4719": "Commerce non spécialisé",
    "5610": "Restaurants",
    "9602": "Coiffeurs / esthéticiens",
    # Agriculture (toiture agricole)
    "0111": "Culture céréales",
    "0112": "Culture légumes",
    "0121": "Viticulture",
    "0141": "Élevage bovins",
    "0145": "Élevage ovins / caprins",
    "0146": "Élevage porcins",
    "0147": "Élevage volailles",
}

# Nombre max de leads à exporter (pour ne pas surcharger l'app)
MAX_LEADS = 2000

# ── FONCTIONS ──────────────────────────────────────────────────────────────────

def download_bce_data(url: str, dest_folder: str = ".") -> str:
    """Télécharge et extrait le fichier zip BCE."""
    print(f"⬇️  Téléchargement des données BCE...")
    print(f"    URL: {url}")
    print("    (Ce fichier peut faire 50-200 MB, patience...)\n")

    try:
        resp = requests.get(url, stream=True, timeout=120)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur téléchargement: {e}")
        print("\n💡 Alternative: téléchargez manuellement depuis:")
        print("   https://economie.fgov.be/fr/themes/entreprises/banque-carrefour-des-entreprises/data-de-la-bce/bce-open-data")
        print("   Placez le fichier 'enterprise.csv' dans le dossier 'scripts/'")
        return None

    total = int(resp.headers.get('content-length', 0))
    downloaded = 0
    zip_buffer = io.BytesIO()

    for chunk in resp.iter_content(chunk_size=8192):
        zip_buffer.write(chunk)
        downloaded += len(chunk)
        if total:
            pct = int(downloaded / total * 100)
            print(f"\r    Progression: {pct}% ({downloaded // 1024 // 1024} MB)", end='', flush=True)

    print(f"\n✅ Téléchargement terminé ({downloaded // 1024 // 1024} MB)\n")

    zip_buffer.seek(0)
    with zipfile.ZipFile(zip_buffer) as zf:
        print(f"📦 Fichiers dans l'archive: {zf.namelist()}")
        zf.extractall(dest_folder)
        print(f"✅ Extraction dans '{dest_folder}'\n")

    return dest_folder


def parse_enterprise_csv(folder: str) -> list:
    """Parse le fichier enterprise.csv et filtre les entreprises wallonnes."""
    enterprise_file = os.path.join(folder, "enterprise.csv")
    address_file    = os.path.join(folder, "address.csv")
    activity_file   = os.path.join(folder, "activity.csv")

    if not os.path.exists(enterprise_file):
        print(f"❌ Fichier non trouvé: {enterprise_file}")
        print("   Vérifiez que l'extraction a bien fonctionné.")
        return []

    print("🔍 Chargement des adresses...")
    # Charger les adresses → {enterprise_number: {cp, commune}}
    addresses = {}
    if os.path.exists(address_file):
        with open(address_file, encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f, delimiter=',')
            for row in reader:
                cp = row.get('Zipcode', '').strip()
                if cp in WALLONIE_CP:
                    num = row.get('EntityNumber', '').strip()
                    addresses[num] = {
                        'cp':      cp,
                        'commune': row.get('MunicipalityFR', row.get('Municipality', '')).strip(),
                        'rue':     row.get('StreetFR', row.get('Street','')).strip(),
                        'num':     row.get('HouseNumber','').strip(),
                    }
    print(f"   → {len(addresses)} adresses wallonnes trouvées\n")

    print("🔍 Chargement des activités NACE...")
    # Charger les activités → {enterprise_number: nace_code}
    activities = {}
    if os.path.exists(activity_file):
        with open(activity_file, encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f, delimiter=',')
            for row in reader:
                num  = row.get('EntityNumber', '').strip()
                nace = row.get('NaceCode', '').strip()[:4]  # 4 premiers chiffres
                if nace in NACE_CIBLES:
                    activities[num] = nace
    print(f"   → {len(activities)} activités NACE cibles trouvées\n")

    print("🔍 Parsing des entreprises...")
    leads = []
    count_total = 0

    with open(enterprise_file, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f, delimiter=',')
        for row in reader:
            count_total += 1
            num    = row.get('EnterpriseNumber', '').strip()
            status = row.get('Status', '').strip()

            # Seulement les entreprises actives
            if status != 'Active':
                continue

            # Doit être en Wallonie
            if num not in addresses:
                continue

            addr  = addresses[num]
            nace  = activities.get(num, '')
            nom   = row.get('Name', row.get('Denomination', '')).strip()
            forme = row.get('JuridicalForm', '').strip()

            leads.append({
                'num':     num,
                'nom':     nom or f"Entreprise {num}",
                'forme':   forme,
                'cp':      addr['cp'],
                'commune': addr['commune'],
                'rue':     addr.get('rue', '') + ' ' + addr.get('num', ''),
                'nace':    NACE_CIBLES.get(nace, nace),
                'nace_code': nace,
                'tel':     '',  # Pas dans les données publiques
            })

            if len(leads) >= MAX_LEADS:
                break

    print(f"✅ {len(leads)} leads B2B retenus (sur {count_total} entreprises scannées)\n")
    return leads


def export_json(leads: list, output_path: str):
    """Exporte les leads en JSON pour l'app."""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(leads, f, ensure_ascii=False, indent=2)
    print(f"✅ Fichier généré: {output_path}")
    print(f"   → {len(leads)} entreprises B2B exportées")
    print(f"   → Place ce fichier dans le dossier 'scripts/' du projet Gaele Pro")
    print(f"   → L'app le chargera automatiquement dans l'onglet 'B2B Wallonie'\n")


def main():
    print("=" * 60)
    print("  GAELE PRO — Script BCE Open Data Wallonie")
    print(f"  Exécuté le {datetime.now().strftime('%d/%m/%Y à %H:%M')}")
    print("=" * 60 + "\n")

    script_dir  = os.path.dirname(os.path.abspath(__file__))
    data_folder = os.path.join(script_dir, "bce_data")
    output_path = os.path.join(script_dir, "bce_wallonie.json")

    os.makedirs(data_folder, exist_ok=True)

    # Vérifier si les fichiers CSV sont déjà présents (évite re-téléchargement)
    enterprise_csv = os.path.join(data_folder, "enterprise.csv")
    if os.path.exists(enterprise_csv):
        print(f"📂 Fichiers BCE déjà présents dans '{data_folder}'")
        user = input("   Forcer le re-téléchargement ? (o/N) : ").strip().lower()
        if user != 'o':
            print()
    else:
        result = download_bce_data(BCE_OPEN_DATA_URL, data_folder)
        if result is None:
            print("\n🔄 Mode manuel: vérifiez les instructions ci-dessus.")
            return

    leads = parse_enterprise_csv(data_folder)

    if not leads:
        print("⚠️  Aucun lead trouvé. Vérifiez que les fichiers CSV sont corrects.")
        return

    # Statistiques
    print("📊 Statistiques:")
    commune_count = {}
    for l in leads:
        commune_count[l['commune']] = commune_count.get(l['commune'], 0) + 1
    top5 = sorted(commune_count.items(), key=lambda x: -x[1])[:5]
    for commune, count in top5:
        print(f"   {commune}: {count} entreprises")
    print()

    export_json(leads, output_path)
    print("🚀 Terminé ! Ouvre l'app Gaele Pro → CRM → onglet 'B2B Wallonie'")


if __name__ == "__main__":
    main()
