# Stratégie de Prospection Automatisée — Andy (Gaele Advisor)

Cette stratégie vise à automatiser le cycle de vie d'un lead, de la découverte à la prise de rendez-vous, en utilisant l'écosystème GitHub et des outils d'IA.

## 1. Découverte Automatisée (Lead Generation)
L'objectif est de trouver des cibles qualifiées (propriétaires en Wallonie/Flandre) sans recherche manuelle.

- **GitHub Actions (Scraping/API)** : Configurer un workflow qui s'exécute chaque semaine pour :
    - Extraire des données de **Google Maps** (entreprises, PME, commerces) via un script Python.
    - Utiliser des serveurs **MCP (Model Context Protocol)** pour rechercher des zones résidentielles à fort potentiel solaire.
- **Ciblage Précis** : Se concentrer sur les zones avec un bon ensoleillement ou des incitations locales fortes.

## 2. Qualification par l'IA
Chaque lead trouvé doit être qualifié avant d'être contacté.

- **Analyse de Site Web** : Utiliser un agent (comme Claude) pour analyser le site web d'une entreprise et déterminer ses besoins énergétiques probables.
- **Filtrage Géographique** : Valider automatiquement le code postal par rapport aux offres Gaele XL (Wallonie/Flandre uniquement).

## 3. CRM & Suivi avec GitHub Projects
Transformer GitHub en un CRM léger et puissant.

- **GitHub Projects (Tableau Kanban)** : 
    - Colonnes : `Nouveau Lead`, `Qualifié`, `Contacté`, `RDV Fixé`, `Visite Technique`, `Clos`.
    - **Automatisation** : Utiliser les workflows de projet pour déplacer automatiquement un lead quand une action est détectée (ex: formulaire rempli).
- **Issues GitHub** : Chaque prospect est une "Issue" contenant l'historique des échanges.

## 4. Outreach Automatisé (Prise de contact)
Automatiser le premier contact pour maximiser le taux de réponse.

- **WhatsApp Automation** : Utiliser l'API WhatsApp (ou des outils comme Twilio/Wati) pour envoyer un message de bienvenue dès qu'un lead termine le quiz sur le site.
- **Emailing Personnalisé** : Intégrer **Formspree** (déjà utilisé) avec des séquences d'emails automatiques.

## 5. Prise de RDV (Flatpickr + Andy)
- **Calendrier Dynamique** : Continuer à utiliser Flatpickr pour permettre au client de choisir son créneau.
- **Sync Calendrier** : Synchroniser les prises de RDV avec un calendrier Google/Outlook via une Action GitHub ou un webhook.

---
> [!TIP]
> Pour commencer, nous pouvons configurer une **GitHub Action** simple qui vous envoie une notification (Email ou Telegram) dès qu'un nouveau lead est détecté ou qualifié.
