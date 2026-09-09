# Changelog

Ce fichier suit les baselines significatives du projet SmartTraining AI. Il ne cherche pas à reconstruire artificiellement un historique Git antérieur.

## Baseline PFE — septembre 2026

État fonctionnel consolidé :
- architecture backend microservices ;
- Web et Mobile ;
- authentification / rôles ;
- LMS formations → modules → leçons → ressources ;
- quiz et scores ;
- progression côté serveur ;
- SCORM 1.2 / 2004 ;
- groupes et affectations collectives ;
- Learning Paths ;
- échéances, notifications et certificats ;
- Learning Analytics, alertes, recommandations et interventions ;
- modèle ML FastAPI ;
- assistant Gemini contextualisé ;
- déploiement VPS HTTPS ;
- Android en test fermé Google Play.

## Mobile 1.0.7

Baseline applicative Android :
- version : `1.0.7` ;
- `versionCode` : `8`.

## Préparation GitHub — 8 septembre 2026

- création d'un candidat de dépôt séparé du projet de travail ;
- suppression des données runtime et artefacts de build ;
- exclusion des anciens backups et archives ;
- remplacement des secrets locaux par variables d'environnement dans le candidat ;
- scan de configuration : aucun secret restant détecté ;
- documentation technique du dépôt.

Les tags Git seront créés uniquement après validation du dépôt final ; aucun historique fictif n'est ajouté.