# Déploiement et configuration

## 1. Environnements

SmartTraining AI est conçu pour fonctionner :
- en local sous Windows pour le développement et la démonstration ;
- sur VPS Ubuntu pour l'environnement de démonstration / production du PFE.

L'environnement déployé utilise Docker et Caddy. Le trafic public HTTPS est dirigé vers l'API Gateway ; les microservices restent sur le réseau interne.

## 2. Endpoints publics

- Web : `https://smarttraininglms.com`
- API : `https://api.smarttraininglms.com/api`

Le code Mobile de production utilise l'API HTTPS publique et ne doit pas dépendre d'une adresse localhost ou d'une IP privée.

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

Eureka assure la découverte entre les services Spring.

## 4. Secrets et variables d'environnement

Les valeurs sensibles ne sont jamais versionnées.

### Auth / sécurité
- `APP_JWT_SECRET`
- `JWT_SECRET`
- `SPRING_MAIL_HOST`
- `SPRING_MAIL_PORT`
- `SPRING_MAIL_USERNAME`
- `SPRING_MAIL_PASSWORD`

Les secrets JWT utilisés par les composants qui émettent ou valident les tokens doivent être cohérents entre eux, même lorsque les noms de variables diffèrent selon le service.

### Bases de données
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

### Découverte / appels internes
- `EUREKA_DEFAULT_ZONE`
- `AI_SERVICE_URL`
- `ANALYTICS_SERVICE_URL`
- `SMARTTRAINING_AUTH_INTERNAL_URL`

### Médias / intégrations
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

## 5. Stockage SCORM et médias

Le dossier `training-service/uploads/` est un stockage runtime et n'appartient pas au code source.

Il peut contenir :
- packages ZIP importés ;
- contenus SCORM extraits ;
- vidéos ;
- images ;
- documents ;
- fichiers de travail.

Ce répertoire doit être monté comme volume persistant en environnement conteneurisé et sauvegardé indépendamment de Git.

## 6. Santé des services

Spring Boot :
- `/actuator/health`
- `/actuator/info`

FastAPI :
- `/health`
- `/model-info`

La vérification publique du Gateway peut être réalisée via son endpoint Actuator HTTPS lorsque la configuration Caddy l'autorise.

## 7. Build Web

```powershell
cd 06_Web_React\smarttraining-web
npm ci
npm run build
```

Le résultat Vite (`dist/`) est un artefact de build et n'est pas versionné.

## 8. Build / exécution Mobile

Développement :

```powershell
cd 05_Mobile_React_Native\smarttraining-mobile
npm ci
npx expo start --port 8086
```

Production Android : EAS génère un AAB à partir de la configuration Expo/EAS.

Baseline actuelle :
- version : `1.0.7` ;
- Android `versionCode` : `8` ;
- package : `com.smarttraininglms.app`.

Le fichier AAB n'est pas versionné dans le dépôt source.

## 9. Déploiement sécurisé

Avant tout déploiement :
1. construire et tester localement ;
2. sauvegarder la version active ;
3. vérifier les variables d'environnement ;
4. déployer uniquement l'artefact ciblé ;
5. vérifier les health checks ;
6. tester une route publique et une route protégée ;
7. disposer d'un rollback.

Ce principe correspond à la stratégie de stabilisation utilisée pendant le PFE : changements ciblés, sauvegarde et non-régression.