# Démonstration de soutenance

Ce document propose un fil de démonstration court et cohérent. Il ne remplace pas le discours oral : il sert de garde-fou pour montrer l'architecture, le produit et les choix techniques sans se disperser.

## 1. Introduction — 30 secondes

Présenter SmartTraining AI comme un LMS multiplateforme composé de :
- Web ;
- Mobile ;
- microservices Spring Boot ;
- Learning Analytics ;
- SCORM ;
- service ML FastAPI ;
- assistant IA.

Message à faire passer : le projet n'est pas une seule interface, mais un système complet.

## 2. Architecture — 1 minute

Montrer le schéma du README.

Expliquer simplement :
- Web et Mobile consomment la même API ;
- la Gateway est le point d'entrée ;
- Eureka permet la découverte des services ;
- chaque microservice a une responsabilité ;
- Analytics communique avec FastAPI pour l'IA ;
- les secrets ne sont pas dans le code.

## 3. Parcours LMS — 2 minutes

À partir d'un compte de démonstration déjà préparé :
1. ouvrir une formation ;
2. montrer modules et leçons ;
3. ouvrir une ressource ;
4. montrer un package SCORM ;
5. revenir sur la progression.

Ne pas créer des données complexes en direct si elles peuvent déjà être préparées.

## 4. Évaluation — 1 minute

Montrer :
- un quiz ;
- une tentative ;
- le score ;
- l'impact sur le suivi.

Expliquer que l'évaluation appartient à un microservice séparé.

## 5. Analytics et IA prédictive — 2 minutes

Montrer la vue de suivi :
- progression ;
- activité ;
- risque ;
- alertes / recommandations ;
- intervention si pertinente.

Puis expliquer le pipeline ML :
- 14 features ;
- Logistic Regression ;
- FastAPI ;
- weak label du prototype ;
- métriques ;
- limite clairement assumée.

Le point important pour le jury est de distinguer :
- le modèle prédictif ;
- les règles de garde-fou ;
- l'assistant génératif.

## 6. Assistant IA — 1 minute

Poser une question utile au LMS.

Expliquer le chemin :
Web/Mobile → Gateway → Analytics → contexte autorisé → FastAPI → Gemini.

Insister sur deux points :
- la clé Gemini est côté serveur ;
- le contexte transmis dépend du rôle et des données autorisées.

## 7. Déploiement — 1 minute

Montrer :
- site Web HTTPS ;
- API publique ;
- éventuellement le health check ;
- Android installé ou Google Play test fermé.

Expliquer :
- VPS Ubuntu ;
- Docker ;
- Caddy ;
- HTTPS ;
- services internes non directement publics.

## 8. Conclusion — 30 secondes

Résumer les apports :
- architecture microservices ;
- interopérabilité SCORM ;
- même backend pour Web et Mobile ;
- Learning Analytics ;
- ML explicable ;
- assistant IA contextualisé ;
- déploiement réel.

## Questions techniques à maîtriser

### Pourquoi des microservices ?
Séparer les responsabilités métier, isoler les évolutions et permettre un déploiement par service.

### Pourquoi une API Gateway ?
Fournir une entrée unique aux clients et centraliser le routage et une partie de la sécurité.

### Pourquoi Eureka ?
Permettre aux services de se découvrir par nom plutôt que par adresse fixe.

### Pourquoi JWT ?
Fournir une authentification stateless adaptée aux clients Web/Mobile et aux APIs.

### Pourquoi Logistic Regression ?
Modèle simple, rapide et explicable, pertinent pour un prototype académique de classification binaire.

### Pourquoi FastAPI ?
Exposer facilement le pipeline Python/ML via HTTP tout en gardant le backend métier en Java.

### Quelle différence entre IA prédictive et assistant IA ?
Le modèle ML calcule un risque à partir de features structurées. L'assistant Gemini génère du langage naturel à partir d'une question et d'un contexte autorisé.

### Pourquoi ne pas mettre les packages SCORM dans Git ?
Ce sont des contenus importés à l'exécution, volumineux et variables. Git contient le moteur et le code qui les gèrent, pas les données runtime.

### Quelle limite principale de l'IA prédictive ?
La cible est un weak label synthétique. Une vraie production nécessiterait des labels réels observés et une nouvelle validation.