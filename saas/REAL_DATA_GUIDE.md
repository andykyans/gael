# Guide : Obtenir les données réelles BCE Wallonie

Pour remplir votre CRM B2B avec de vraies entreprises et non des données de démonstration, vous devez lancer le script de récupération (scraper) sur votre ordinateur.

## Prérequis
- **Node.js** doit être installé sur votre PC.
- Une connexion internet active.

## Étapes à suivre

1. **Ouvrez un terminal** (PowerShell ou Invite de commande) dans le dossier du projet :
   `c:\Users\andyk\OneDrive\Bureau\GAELE\gaelexl\saas\`

2. **Lancez le script de récupération** avec la commande suivante :
   ```bash
   node scripts/bce_scraper_node.js
   ```

3. **Patientez** :
   - Le script va télécharger le fichier ZIP officiel de la BCE (~200 Mo).
   - Il va extraire les données et filtrer les entreprises actives en Wallonie dans les secteurs cibles (Électricité, Chauffage, Construction, etc.).
   - Le fichier `scripts/bce_wallonie.json` sera alors rempli avec les **vraies données**.

4. **Rafraîchissez l'application** :
   - Une fois le script terminé, retournez sur votre application Gaele Pro.
   - Allez dans l'onglet **CRM** -> **B2B Wallonie**.
   - Vous devriez voir les milliers d'entreprises réelles s'afficher.

## Pourquoi dois-je le faire moi-même ?
Le fichier de données complet est très lourd et les conditions d'utilisation de la banque carrefour des entreprises (BCE) demandent souvent une mise à jour régulière depuis leur portail officiel. Faire tourner le script localement vous garantit d'avoir les données les plus fraîches et complètes.

---
*Gaele Pro v1.4 — Assistant Intelligent*
