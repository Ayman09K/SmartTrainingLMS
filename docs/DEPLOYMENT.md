# DÃ©ploiement et configuration

## 1. Environnements

SmartTraining AI est conÃ§u pour fonctionner :
- en local sous Windows pour le dÃ©veloppement et la dÃ©monstration ;
- sur VPS Ubuntu pour l'environnement de dÃ©monstration / production du PFE.

L'environnement dÃ©ployÃ© utilise Docker et Caddy. Le trafic public HTTPS est dirigÃ© vers l'API Gateway ; les microservices restent sur le rÃ©seau interne.

## 2. Endpoints publics

- Web : `https://smarttraininglms.com`
- API : `https://api.smarttraininglms.com/api`

Le code Mobile de production utilise l'API HTTPS publique et ne doit pas dÃ©pendre d'une adresse localhost ou d'une IP privÃ©e.

## 3. Topologie de production

```text
Internet
   |
 HTTPS
   |
 Caddy
   +--------------------> Web React statique
   |
   +--------------------> API Gateway :8080
                             |
                             +--> Auth :8081
                             +--> Training :8082
                             +--> Evaluation :8083
                             +--> Analytics :8084
                                      |
                                      +--> FastAPI AI :8000
```

Eureka assure la dÃ©couverte entre les services Spring.

## 4. Secrets et variables d'environnement

Les valeurs sensibles ne sont jamais versionnÃ©es.

### Auth / sÃ©curitÃ©
- `APP_JWT_SECRET`
- `JWT_SECRET`
- `SPRING_MAIL_HOST`
- `SPRING_MAIL_PORT`
- `SPRING_MAIL_USERNAME`
- `SPRING_MAIL_PASSWORD`

Les secrets JWT utilisÃ©s par les composants qui Ã©mettent ou valident les tokens doivent Ãªtre cohÃ©rents entre eux, mÃªme lorsque les noms de variables diffÃ¨rent selon le service.

### Bases de donnÃ©es
- `AUTH_DB_URL`
- `AUTH_DB_USERNAME`
- `AUTH_DB_PASSWORD`
- `TRAINING_DB_URL`
- `TRAINING_DB_USERNAME`
- `TRAINING_DB_PASSWORD`
- `EVALUATION_DB_URL`
- `EVALUATION_DB_USERNAME`
- `EVALUATION_DB_PASSWORD`
- `ANALYTICS_DB_URL`
- `ANALYTICS_DB_USERNAME`
- `ANALYTICS_DB_PASSWORD`

### DÃ©couverte / appels internes
- `EUREKA_DEFAULT_ZONE`
- `AI_SERVICE_URL`
- `ANALYTICS_SERVICE_URL`
- `SMARTTRAINING_AUTH_INTERNAL_URL`

### MÃ©dias / intÃ©grations
- `PEXELS_API_KEY`
- `PEXELS_BASE_URL`
- `SMARTTRAINING_UPLOAD_DIR`
- `SMARTTRAINING_PUBLIC_MEDIA_URL`

### Assistant IA
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_TIMEOUT_SECONDS`
- `SMARTTRAINING_TIMEZONE`

### Clients
- Web : URL API via configuration Vite selon l'environnement.
- Mobile : `EXPO_PUBLIC_API_URL`.

## 5. Stockage SCORM et mÃ©dias

Le dossier `training-service/uploads/` est un stockage runtime et n'appartient pas au code source.

Il peut contenir :
- packages ZIP importÃ©s ;
- contenus SCORM extraits ;
- vidÃ©os ;
- images ;
- documents ;
- fichiers de travail.

Ce rÃ©pertoire doit Ãªtre montÃ© comme volume persistant en environnement conteneurisÃ© et sauvegardÃ© indÃ©pendamment de Git.

## 6. SantÃ© des services

Spring Boot :
- `/actuator/health`
- `/actuator/info`

FastAPI :
- `/health`
- `/model-info`

La vÃ©rification publique du Gateway peut Ãªtre rÃ©alisÃ©e via son endpoint Actuator HTTPS lorsque la configuration Caddy l'autorise.

## 7. Build Web

```powershell
cd 06_Web_React\smarttraining-web
npm ci
npm run build
```

Le rÃ©sultat Vite (`dist/`) est un artefact de build et n'est pas versionnÃ©.

## 8. Build / exÃ©cution Mobile

DÃ©veloppement :

```powershell
cd 05_Mobile_React_Native\smarttraining-mobile
npm ci
npx expo start --port 8086
```

Production Android : EAS gÃ©nÃ¨re un AAB Ã  partir de la configuration Expo/EAS.

Baseline actuelle :
- version : `1.0.7` ;
- Android `versionCode` : `8` ;
- package : `com.smarttraininglms.app`.

Le fichier AAB n'est pas versionnÃ© dans le dÃ©pÃ´t source.

## 9. DÃ©ploiement sÃ©curisÃ©

Avant tout dÃ©ploiement :
1. construire et tester localement ;
2. sauvegarder la version active ;
3. vÃ©rifier les variables d'environnement ;
4. dÃ©ployer uniquement l'artefact ciblÃ© ;
5. vÃ©rifier les health checks ;
6. tester une route publique et une route protÃ©gÃ©e ;
7. disposer d'un rollback.

Ce principe correspond Ã  la stratÃ©gie de stabilisation utilisÃ©e pendant le PFE : changements ciblÃ©s, sauvegarde et non-rÃ©gression.