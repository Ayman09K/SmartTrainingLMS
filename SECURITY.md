# Politique de sÃ©curitÃ©

## PÃ©rimÃ¨tre

Cette politique concerne le dÃ©pÃ´t source SmartTraining AI prÃ©parÃ© pour le PFE.

## Signaler une vulnÃ©rabilitÃ©

Ne publiez jamais dans une issue :
- mot de passe ;
- token JWT ;
- clÃ© Gemini ;
- identifiant SMTP ;
- clÃ© API ;
- clÃ© privÃ©e ;
- donnÃ©e personnelle rÃ©elle.

Pour un signalement de sÃ©curitÃ©, utilisez en prioritÃ© le mÃ©canisme privÃ© de signalement de vulnÃ©rabilitÃ© GitHub s'il est activÃ© sur le dÃ©pÃ´t. Ã€ dÃ©faut, contactez le mainteneur du projet par le canal privÃ© acadÃ©mique / projet dÃ©jÃ  Ã©tabli.

Le signalement doit contenir :
- composant concernÃ© ;
- version ou commit ;
- description du problÃ¨me ;
- Ã©tapes de reproduction sans secret rÃ©el ;
- impact estimÃ©.

## Gestion des secrets

Les secrets doivent Ãªtre fournis par variables d'environnement.

Le dÃ©pÃ´t ignore notamment :
- `.env*` locaux ;
- clÃ©s et certificats privÃ©s ;
- APK / AAB ;
- fichiers runtime SCORM ;
- caches et logs.

Si un secret est exposÃ© accidentellement :
1. ne pas simplement supprimer la ligne et continuer ;
2. rÃ©voquer / faire tourner le secret ;
3. nettoyer l'historique concernÃ© si nÃ©cessaire ;
4. vÃ©rifier les journaux d'utilisation ;
5. rescanner le dÃ©pÃ´t avant un nouveau push.

## Versions supportÃ©es

La baseline PFE courante est la seule version activement maintenue dans ce dÃ©pÃ´t. Les anciennes copies locales et archives historiques ne sont pas considÃ©rÃ©es comme des versions supportÃ©es.