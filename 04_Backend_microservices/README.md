# Backend microservices

Le backend SmartTraining AI est construit en Java 17 avec Spring Boot et Spring Cloud.

## Services

| Service | Port | RÃ´le |
|---|---:|---|
| discovery-service | 8761 | Eureka Server |
| api-gateway | 8080 | entrÃ©e API et routage |
| auth-service | 8081 | identitÃ©, authentification, rÃ´les |
| training-service | 8082 | cÅ“ur LMS, SCORM, groupes, parcours |
| evaluation-service | 8083 | quiz et scores |
| analytics-service | 8084 | progression, analytics, risques, assistant |

## DÃ©marrage local

PrÃ©requis :
- Java 17 ;
- Maven ;
- MySQL 8 ;
- variables d'environnement nÃ©cessaires.

Dans chaque service :

```powershell
mvn spring-boot:run
```

Ordre recommandÃ© :
1. discovery-service ;
2. auth-service ;
3. training-service ;
4. evaluation-service ;
5. analytics-service ;
6. api-gateway.

Le service FastAPI sur le port 8000 doit Ãªtre actif pour les fonctions IA d'Analytics.

## Tests

Les tests backend sont placÃ©s sous `src/test/`.

ExÃ©cution pour un service :

```powershell
mvn test
```

Build :

```powershell
mvn clean package
```

## Configuration

Les fichiers `application.yml` de ce dÃ©pÃ´t candidat ont Ã©tÃ© assainis : aucune valeur sensible ne doit Ãªtre inscrite en dur.

Les profils Docker utilisent des variables d'environnement pour les bases, JWT et URLs internes.

## ObservabilitÃ©

Les services exposent Spring Boot Actuator :
- `/actuator/health`
- `/actuator/info`

## DonnÃ©es runtime

`training-service/uploads/` n'est pas versionnÃ©.

Ce dossier reÃ§oit les mÃ©dias et contenus SCORM importÃ©s et doit Ãªtre gÃ©rÃ© comme stockage persistant sÃ©parÃ©.