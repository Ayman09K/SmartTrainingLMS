# Backend microservices

Le backend SmartTraining AI est construit en Java 17 avec Spring Boot et Spring Cloud.

## Services

| Service | Port | Rôle |
|---|---:|---|
| discovery-service | 8761 | Eureka Server |
| api-gateway | 8080 | entrée API et routage |
| auth-service | 8081 | identité, authentification, rôles |
| training-service | 8082 | cœur LMS, SCORM, groupes, parcours |
| evaluation-service | 8083 | quiz et scores |
| analytics-service | 8084 | progression, analytics, risques, assistant |

## Démarrage local

Prérequis :
- Java 17 ;
- Maven ;
- MySQL 8 ;
- variables d'environnement nécessaires.

Dans chaque service :

```powershell
mvn spring-boot:run
```

Ordre recommandé :
1. discovery-service ;
2. auth-service ;
3. training-service ;
4. evaluation-service ;
5. analytics-service ;
6. api-gateway.

Le service FastAPI sur le port 8000 doit être actif pour les fonctions IA d'Analytics.

## Tests

Les tests backend sont placés sous `src/test/`.

Exécution pour un service :

```powershell
mvn test
```

Build :

```powershell
mvn clean package
```

## Configuration

Les fichiers `application.yml` de ce dépôt candidat ont été assainis : aucune valeur sensible ne doit être inscrite en dur.

Les profils Docker utilisent des variables d'environnement pour les bases, JWT et URLs internes.

## Observabilité

Les services exposent Spring Boot Actuator :
- `/actuator/health`
- `/actuator/info`

## Données runtime

`training-service/uploads/` n'est pas versionné.

Ce dossier reçoit les médias et contenus SCORM importés et doit être géré comme stockage persistant séparé.