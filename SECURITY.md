# Politique de sécurité

## Périmètre

Cette politique concerne le dépôt source SmartTraining AI préparé pour le PFE.

## Signaler une vulnérabilité

Ne publiez jamais dans une issue :
- mot de passe ;
- token JWT ;
- clé Gemini ;
- identifiant SMTP ;
- clé API ;
- clé privée ;
- donnée personnelle réelle.

Pour un signalement de sécurité, utilisez en priorité le mécanisme privé de signalement de vulnérabilité GitHub s'il est activé sur le dépôt. À défaut, contactez le mainteneur du projet par le canal privé académique / projet déjà établi.

Le signalement doit contenir :
- composant concerné ;
- version ou commit ;
- description du problème ;
- étapes de reproduction sans secret réel ;
- impact estimé.

## Gestion des secrets

Les secrets doivent être fournis par variables d'environnement.

Le dépôt ignore notamment :
- `.env*` locaux ;
- clés et certificats privés ;
- APK / AAB ;
- fichiers runtime SCORM ;
- caches et logs.

Si un secret est exposé accidentellement :
1. ne pas simplement supprimer la ligne et continuer ;
2. révoquer / faire tourner le secret ;
3. nettoyer l'historique concerné si nécessaire ;
4. vérifier les journaux d'utilisation ;
5. rescanner le dépôt avant un nouveau push.

## Versions supportées

La baseline PFE courante est la seule version activement maintenue dans ce dépôt. Les anciennes copies locales et archives historiques ne sont pas considérées comme des versions supportées.