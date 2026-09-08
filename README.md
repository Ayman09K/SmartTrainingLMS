# SmartTraining AI

Plateforme LMS intelligente, multiplateforme et orientÃ©e Learning Analytics, rÃ©alisÃ©e dans le cadre d'un Projet de Fin d'Ã‰tudes de 5e annÃ©e DLTI Ã  l'IGA, annÃ©e universitaire 2025â€“2026.

SmartTraining AI associe :
- une application Web React ;
- une application Mobile React Native / Expo ;
- une architecture backend en microservices Spring Boot ;
- un moteur SCORM 1.2 / 2004 ;
- un service de Machine Learning FastAPI pour la dÃ©tection du risque apprenant ;
- un assistant IA gÃ©nÃ©ratif intÃ©grÃ© au LMS.

## Objectif

Le projet vise Ã  couvrir le cycle de formation au-delÃ  d'un simple catalogue de contenus : administration, conception de formations, apprentissage, Ã©valuations, suivi de progression, groupes, parcours, Ã©chÃ©ances, notifications, certificats, analytics, interventions pÃ©dagogiques et accompagnement assistÃ© par IA.

## FonctionnalitÃ©s principales

### LMS
- gestion des rÃ´les ADMIN, FORMATEUR et APPRENANT ;
- formations structurÃ©es en modules, leÃ§ons et ressources ;
- ressources texte, document, PDF, vidÃ©o, lien externe et SCORM ;
- quiz, questions, tentatives et scores ;
- progression calculÃ©e cÃ´tÃ© serveur ;
- groupes d'apprenants et affectations collectives ;
- Learning Paths ;
- Ã©chÃ©ances, notifications et certificats.

### SCORM
- import de packages SCORM ;
- prise en charge du runtime SCORM 1.2 et SCORM 2004 ;
- persistance des donnÃ©es CMI, scores, temps, interactions et objectifs ;
- lecture Web et Mobile.

### Learning Analytics
- consolidation de la progression et de l'activitÃ© ;
- alertes et recommandations ;
- vue de suivi formateur ;
- feedbacks, interventions et sÃ©ances d'accompagnement ;
- indicateurs BI.

### Intelligence artificielle
- modÃ¨le de classification supervisÃ©e pour le risque apprenant ;
- API FastAPI de prÃ©diction ;
- assistant conversationnel basÃ© sur Gemini ;
- contexte LMS autorisÃ© et adaptation selon le rÃ´le utilisateur.

## Architecture

```mermaid
flowchart LR
    WEB[Web React / Vite]
    MOB[Mobile React Native / Expo]
    CADDY[Caddy / HTTPS]
    GW[API Gateway :8080]
    EUREKA[Eureka :8761]

    AUTH[Auth :8081]
    TRAIN[Training :8082]
    EVAL[Evaluation :8083]
    ANALYTICS[Analytics :8084]
    AI[FastAPI AI :8000]
    GEMINI[Gemini API]

    AUTHDB[(Auth DB)]
    TRAINDB[(Training DB)]
    EVALDB[(Evaluation DB)]
    ANALYTICSDB[(Analytics DB)]

    WEB --> CADDY
    MOB --> CADDY
    CADDY --> GW

    GW --> AUTH
    GW --> TRAIN
    GW --> EVAL
    GW --> ANALYTICS

    AUTH --- EUREKA
    TRAIN --- EUREKA
    EVAL --- EUREKA
    ANALYTICS --- EUREKA
    GW --- EUREKA

    AUTH --> AUTHDB
    TRAIN --> TRAINDB
    EVAL --> EVALDB
    ANALYTICS --> ANALYTICSDB

    ANALYTICS --> AI
    AI --> GEMINI
```

Le dÃ©tail des responsabilitÃ©s et des flux est dÃ©crit dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Stack technique

| Couche | Technologies principales |
|---|---|
| Backend | Java 17, Spring Boot 4.1.0, Spring Cloud, Spring Security, JPA |
| Discovery / Gateway | Netflix Eureka, Spring Cloud Gateway |
| DonnÃ©es | MySQL 8 |
| Web | React 19, TypeScript, Vite 8, MUI, ECharts |
| Mobile | React Native 0.85, Expo 56, Expo Router, TypeScript |
| IA | Python, FastAPI, pandas, scikit-learn, joblib |
| Assistant | Gemini API via service FastAPI |
| DÃ©ploiement | Docker, Ubuntu VPS, Caddy, HTTPS |
| Mobile Android | Expo / EAS, AAB, Google Play test fermÃ© |

## Organisation du dÃ©pÃ´t

```text
SmartTraining_AI/
â”œâ”€â”€ README.md
â”œâ”€â”€ CHANGELOG.md
â”œâ”€â”€ SECURITY.md
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ ARCHITECTURE.md
â”‚   â”œâ”€â”€ DEPLOYMENT.md
â”‚   â”œâ”€â”€ AI_MODEL.md
â”‚   â””â”€â”€ DEMO_SOUTENANCE.md
â”œâ”€â”€ 04_Backend_microservices/
â”œâ”€â”€ 05_Mobile_React_Native/
â”œâ”€â”€ 06_Web_React/
â””â”€â”€ 07_IA_FastAPI/
```

Les contenus gÃ©nÃ©rÃ©s Ã  l'exÃ©cution (uploads SCORM, builds, caches, fichiers `.env`, AAB/APK, logs et secrets) sont volontairement exclus du dÃ©pÃ´t.

## DÃ©marrage local

### PrÃ©requis
- Java 17 ;
- Maven ;
- MySQL 8 ;
- Node.js / npm ;
- Python ;
- Expo CLI via `npx`.

### Ordre recommandÃ©

1. Eureka Discovery â€” port `8761`
2. Auth Service â€” port `8081`
3. Training Service â€” port `8082`
4. Evaluation Service â€” port `8083`
5. FastAPI AI â€” port `8000`
6. Analytics Service â€” port `8084`
7. API Gateway â€” port `8080`
8. Web â€” port `5173`
9. Mobile â€” port Metro distinct des ports backend

Chaque microservice Spring Boot peut Ãªtre dÃ©marrÃ© depuis son dossier avec :

```powershell
mvn spring-boot:run
```

Service IA :

```powershell
cd 07_IA_FastAPI\ai-service
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Web :

```powershell
cd 06_Web_React\smarttraining-web
npm ci
npm run dev
```

Mobile :

```powershell
cd 05_Mobile_React_Native\smarttraining-mobile
npm ci
npx expo start --port 8086
```

Le port `8086` est proposÃ© pour Metro afin d'Ã©viter le conflit avec `evaluation-service` sur `8083`.

Les variables d'environnement et le dÃ©ploiement sont dÃ©taillÃ©s dans [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Ã‰tat de livraison

- Web : dÃ©ployÃ© sur l'environnement de dÃ©monstration ;
- API : dÃ©ployÃ©e derriÃ¨re HTTPS et API Gateway ;
- Android : version applicative `1.0.7`, `versionCode 8`, utilisÃ©e en test fermÃ© Google Play ;
- iOS : le socle React Native / Expo est multiplateforme, mais la distribution iOS n'est pas dÃ©clarÃ©e comme une release livrÃ©e Ã  ce stade.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [DÃ©ploiement et configuration](docs/DEPLOYMENT.md)
- [ModÃ¨le IA](docs/AI_MODEL.md)
- [ScÃ©nario de dÃ©monstration / soutenance](docs/DEMO_SOUTENANCE.md)
- [Backend](04_Backend_microservices/README.md)
- [Mobile](05_Mobile_React_Native/smarttraining-mobile/README.md)
- [Web](06_Web_React/smarttraining-web/README.md)
- [IA](07_IA_FastAPI/README.md)

## SÃ©curitÃ©

Aucun secret de production ne doit Ãªtre versionnÃ©. Les mots de passe de base de donnÃ©es, secrets JWT, identifiants SMTP, clÃ© Gemini et autres credentials sont injectÃ©s par variables d'environnement.

Voir [SECURITY.md](SECURITY.md).

## Statut acadÃ©mique

Projet de Fin d'Ã‰tudes â€” IGA â€” 5e annÃ©e DLTI â€” annÃ©e universitaire 2025â€“2026.

Ce dÃ©pÃ´t constitue une version source assainie destinÃ©e Ã  la traÃ§abilitÃ© technique, Ã  la soutenance et Ã  la dÃ©monstration du projet. Les donnÃ©es runtime et secrets d'environnement ne font pas partie du dÃ©pÃ´t.