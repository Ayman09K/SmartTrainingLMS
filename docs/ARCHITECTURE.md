# Architecture technique

## 1. Vue d'ensemble

SmartTraining AI suit une architecture distribuÃ©e composÃ©e de clients Web et Mobile, d'une API Gateway, de microservices mÃ©tier Spring Boot, d'un service IA FastAPI et de bases MySQL logiquement sÃ©parÃ©es par domaine.

Le principe central est que les clients ne portent pas la logique mÃ©tier critique. Les contrÃ´les d'accÃ¨s, la progression, les Ã©valuations, les analytics et les dÃ©cisions de sÃ©curitÃ© sont traitÃ©s cÃ´tÃ© serveur.

## 2. Microservices

| Service | Port local | ResponsabilitÃ© principale |
|---|---:|---|
| discovery-service | 8761 | registre Eureka et dÃ©couverte des services |
| api-gateway | 8080 | point d'entrÃ©e API, routage et contrÃ´le JWT |
| auth-service | 8081 | authentification, utilisateurs, rÃ´les, statut des comptes, reset mot de passe |
| training-service | 8082 | formations, modules, leÃ§ons, ressources, inscriptions, groupes, parcours, certificats, SCORM |
| evaluation-service | 8083 | quiz, questions, options, tentatives et scores |
| analytics-service | 8084 | progression, Ã©vÃ©nements, risques, alertes, recommandations, feedbacks, interventions, BI et assistant |
| ai-service | 8000 | prÃ©diction ML et gÃ©nÃ©ration de rÃ©ponses de l'assistant |

## 3. API Gateway

Les clients Web et Mobile consomment une API commune exposÃ©e par l'API Gateway.

Exemples de familles de routes :
- `/api/auth/**` â†’ auth-service ;
- `/api/trainings/**`, `/api/modules/**`, `/api/lessons/**`, `/api/resources/**` â†’ training-service ;
- `/api/quizzes/**`, `/api/questions/**`, `/api/attempts/**` â†’ evaluation-service ;
- `/api/analytics/**`, `/api/progress/**`, `/api/risk-predictions/**` â†’ analytics-service.

La route publique de l'assistant est portÃ©e par Analytics :

`POST /api/analytics/assistant/chat`

Analytics transmet ensuite la requÃªte au service FastAPI interne :

`POST /assistant/chat`

## 4. Authentification et autorisation

L'authentification produit un JWT. La Gateway et les Resource Servers valident ce token avant l'accÃ¨s aux routes protÃ©gÃ©es.

Les rÃ´les mÃ©tier principaux sont :
- `ADMIN` ;
- `FORMATEUR` ;
- `APPRENANT`.

Les permissions ne reposent pas uniquement sur l'interface : elles sont appliquÃ©es cÃ´tÃ© backend.

## 5. DonnÃ©es

Les domaines principaux disposent de bases logiquement sÃ©parÃ©es :
- `smarttraining_auth_db` ;
- `smarttraining_training_db` ;
- `smarttraining_evaluation_db` ;
- `smarttraining_analytics_db`.

Le moteur MySQL peut Ãªtre mutualisÃ© au niveau infrastructure, mais la sÃ©paration logique maintient le dÃ©coupage mÃ©tier.

## 6. Flux d'apprentissage

Un parcours apprenant typique suit le flux :

1. authentification ;
2. consultation d'une formation affectÃ©e ;
3. ouverture des modules, leÃ§ons et ressources ;
4. exÃ©cution Ã©ventuelle d'un contenu SCORM ;
5. rÃ©alisation de quiz ;
6. Ã©mission d'Ã©vÃ©nements de progression ;
7. consolidation cÃ´tÃ© Analytics ;
8. calcul de risque et recommandations ;
9. consultation du suivi par le formateur.

## 7. SCORM

Le training-service gÃ¨re l'import et l'exÃ©cution des packages SCORM.

Les fichiers importÃ©s et extraits sont des donnÃ©es runtime stockÃ©es dans un rÃ©pertoire configurable (`SMARTTRAINING_UPLOAD_DIR`). Ils ne sont pas versionnÃ©s dans Git.

Le runtime prend en charge SCORM 1.2 et SCORM 2004 et persiste notamment :
- progression / statut ;
- score ;
- temps ;
- interactions ;
- objectifs ;
- valeurs CMI nÃ©cessaires Ã  la reprise.

## 8. Intelligence artificielle prÃ©dictive

Le service FastAPI charge au dÃ©marrage un pipeline scikit-learn sÃ©rialisÃ© avec joblib.

Analytics prÃ©pare les donnÃ©es utiles puis appelle le service IA. La rÃ©ponse contient une probabilitÃ© / classification de risque et des informations exploitables par le suivi pÃ©dagogique.

Le modÃ¨le et ses limites sont documentÃ©s dans `docs/AI_MODEL.md`.

## 9. Assistant IA

L'assistant suit ce flux :

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant C as Web / Mobile
    participant G as API Gateway
    participant A as Analytics Service
    participant F as FastAPI
    participant M as Gemini

    U->>C: Question
    C->>G: POST /api/analytics/assistant/chat
    G->>A: JWT validÃ© + requÃªte
    A->>A: Contexte LMS autorisÃ© selon rÃ´le
    A->>F: POST /assistant/chat
    F->>M: Prompt + contexte autorisÃ©
    M-->>F: RÃ©ponse
    F-->>A: RÃ©ponse structurÃ©e
    A-->>G: RÃ©ponse utilisateur
    G-->>C: JSON
    C-->>U: Message
```

Le contexte LMS fourni au modÃ¨le est construit cÃ´tÃ© backend et limitÃ© aux donnÃ©es autorisÃ©es. La clÃ© Gemini n'est jamais stockÃ©e dans le code source.

## 10. ObservabilitÃ©

Les microservices Spring exposent Spring Boot Actuator, notamment les endpoints `health` et `info`.

Le service FastAPI expose `/health`, qui indique Ã©galement si le modÃ¨le ML est chargÃ©.

## 11. Principes de sÃ©curitÃ©

- aucun secret dans Git ;
- JWT validÃ© cÃ´tÃ© serveur ;
- contrÃ´le des rÃ´les cÃ´tÃ© backend ;
- variables d'environnement pour credentials ;
- HTTPS en production ;
- Caddy comme point d'entrÃ©e public ;
- services mÃ©tier non exposÃ©s directement sur Internet ;
- uploads runtime exclus du dÃ©pÃ´t.