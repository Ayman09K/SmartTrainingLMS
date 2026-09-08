# DÃ©monstration de soutenance

Ce document propose un fil de dÃ©monstration court et cohÃ©rent. Il ne remplace pas le discours oral : il sert de garde-fou pour montrer l'architecture, le produit et les choix techniques sans se disperser.

## 1. Introduction â€” 30 secondes

PrÃ©senter SmartTraining AI comme un LMS multiplateforme composÃ© de :
- Web ;
- Mobile ;
- microservices Spring Boot ;
- Learning Analytics ;
- SCORM ;
- service ML FastAPI ;
- assistant IA.

Message Ã  faire passer : le projet n'est pas une seule interface, mais un systÃ¨me complet.

## 2. Architecture â€” 1 minute

Montrer le schÃ©ma du README.

Expliquer simplement :
- Web et Mobile consomment la mÃªme API ;
- la Gateway est le point d'entrÃ©e ;
- Eureka permet la dÃ©couverte des services ;
- chaque microservice a une responsabilitÃ© ;
- Analytics communique avec FastAPI pour l'IA ;
- les secrets ne sont pas dans le code.

## 3. Parcours LMS â€” 2 minutes

Ã€ partir d'un compte de dÃ©monstration dÃ©jÃ  prÃ©parÃ© :
1. ouvrir une formation ;
2. montrer modules et leÃ§ons ;
3. ouvrir une ressource ;
4. montrer un package SCORM ;
5. revenir sur la progression.

Ne pas crÃ©er des donnÃ©es complexes en direct si elles peuvent dÃ©jÃ  Ãªtre prÃ©parÃ©es.

## 4. Ã‰valuation â€” 1 minute

Montrer :
- un quiz ;
- une tentative ;
- le score ;
- l'impact sur le suivi.

Expliquer que l'Ã©valuation appartient Ã  un microservice sÃ©parÃ©.

## 5. Analytics et IA prÃ©dictive â€” 2 minutes

Montrer la vue de suivi :
- progression ;
- activitÃ© ;
- risque ;
- alertes / recommandations ;
- intervention si pertinente.

Puis expliquer le pipeline ML :
- 14 features ;
- Logistic Regression ;
- FastAPI ;
- weak label du prototype ;
- mÃ©triques ;
- limite clairement assumÃ©e.

Le point important pour le jury est de distinguer :
- le modÃ¨le prÃ©dictif ;
- les rÃ¨gles de garde-fou ;
- l'assistant gÃ©nÃ©ratif.

## 6. Assistant IA â€” 1 minute

Poser une question utile au LMS.

Expliquer le chemin :
Web/Mobile â†’ Gateway â†’ Analytics â†’ contexte autorisÃ© â†’ FastAPI â†’ Gemini.

Insister sur deux points :
- la clÃ© Gemini est cÃ´tÃ© serveur ;
- le contexte transmis dÃ©pend du rÃ´le et des donnÃ©es autorisÃ©es.

## 7. DÃ©ploiement â€” 1 minute

Montrer :
- site Web HTTPS ;
- API publique ;
- Ã©ventuellement le health check ;
- Android installÃ© ou Google Play test fermÃ©.

Expliquer :
- VPS Ubuntu ;
- Docker ;
- Caddy ;
- HTTPS ;
- services internes non directement publics.

## 8. Conclusion â€” 30 secondes

RÃ©sumer les apports :
- architecture microservices ;
- interopÃ©rabilitÃ© SCORM ;
- mÃªme backend pour Web et Mobile ;
- Learning Analytics ;
- ML explicable ;
- assistant IA contextualisÃ© ;
- dÃ©ploiement rÃ©el.

## Questions techniques Ã  maÃ®triser

### Pourquoi des microservices ?
SÃ©parer les responsabilitÃ©s mÃ©tier, isoler les Ã©volutions et permettre un dÃ©ploiement par service.

### Pourquoi une API Gateway ?
Fournir une entrÃ©e unique aux clients et centraliser le routage et une partie de la sÃ©curitÃ©.

### Pourquoi Eureka ?
Permettre aux services de se dÃ©couvrir par nom plutÃ´t que par adresse fixe.

### Pourquoi JWT ?
Fournir une authentification stateless adaptÃ©e aux clients Web/Mobile et aux APIs.

### Pourquoi Logistic Regression ?
ModÃ¨le simple, rapide et explicable, pertinent pour un prototype acadÃ©mique de classification binaire.

### Pourquoi FastAPI ?
Exposer facilement le pipeline Python/ML via HTTP tout en gardant le backend mÃ©tier en Java.

### Quelle diffÃ©rence entre IA prÃ©dictive et assistant IA ?
Le modÃ¨le ML calcule un risque Ã  partir de features structurÃ©es. L'assistant Gemini gÃ©nÃ¨re du langage naturel Ã  partir d'une question et d'un contexte autorisÃ©.

### Pourquoi ne pas mettre les packages SCORM dans Git ?
Ce sont des contenus importÃ©s Ã  l'exÃ©cution, volumineux et variables. Git contient le moteur et le code qui les gÃ¨rent, pas les donnÃ©es runtime.

### Quelle limite principale de l'IA prÃ©dictive ?
La cible est un weak label synthÃ©tique. Une vraie production nÃ©cessiterait des labels rÃ©els observÃ©s et une nouvelle validation.