import json
import os

def qualify_lead(lead_data):
    """
    Exemple de qualification automatique par IA (simulé).
    Vérifie si le code postal est en Wallonie ou Flandre.
    """
    wallonie_codes = range(1300, 7999) # Simplifié
    flandre_codes = range(8000, 9999) # Simplifié
    bxl_codes = range(1000, 1299) # Simplifié
    
    cp = int(lead_data.get("zip", 0))
    
    if cp in wallonie_codes:
        lead_data["status"] = "Qualifié - Wallonie (Gaele XL)"
    elif cp in flandre_codes:
        lead_data["status"] = "Qualifié - Flandre (Gaele XL)"
    elif cp in bxl_codes:
        lead_data["status"] = "Qualifié - Bruxelles (Gaele Courtier)"
    else:
        lead_data["status"] = "Hors zone"
        
    return lead_data

def process_batch(file_path):
    """Lit un fichier JSON de leads et les qualifie."""
    if not os.path.exists(file_path):
        print(f"Erreur : fichier {file_path} introuvable.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        leads = json.load(f)

    results = []
    for lead in leads:
        qualified = qualify_lead(lead)
        results.append(qualified)
        print(f"Propsect: {qualified['name']} -> {qualified['status']}")

    with open("qualified_leads.json", "w", encoding='utf-8') as f:
        json.dump(results, f, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    # Test simple avec un lead fictif
    dummy_leads = [
        {"name": "Jean Dupont", "zip": "5000", "email": "jean@example.com"},
        {"name": "Luc Janssens", "zip": "9000", "email": "luc@example.com"},
        {"name": "Marc Dubois", "zip": "1000", "email": "marc@example.com"}
    ]
    
    with open("temp_leads.json", "w", encoding='utf-8') as f:
        json.dump(dummy_leads, f)
        
    process_batch("temp_leads.json")
