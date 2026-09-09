# SmartTraining Web

Interface Web de SmartTraining AI.

## Stack

- React 19 ;
- TypeScript ;
- Vite 8 ;
- Material UI ;
- MUI Data Grid ;
- ECharts ;
- React Router ;
- Axios.

## Rôle de l'application

L'interface Web couvre les espaces ADMIN, FORMATEUR et APPRENANT.

Elle consomme l'API SmartTraining via l'API Gateway et ne porte pas les décisions métier critiques côté client.

Fonctions principales :
- authentification ;
- administration ;
- gestion des formations ;
- modules, leçons et ressources ;
- quiz ;
- suivi apprenants ;
- analytics / BI ;
- groupes et affectations ;
- Learning Paths ;
- certificats ;
- SCORM ;
- assistant IA.

## Installation

```powershell
npm ci
```

## Développement

```powershell
npm run dev
```

Vite utilise normalement le port `5173`.

## Vérifications

```powershell
npm run lint
npm run build
```

Le dossier `dist/` est un artefact de build et n'est pas versionné.

## API

L'URL de l'API dépend de l'environnement.

En production, le Web consomme l'API HTTPS publique SmartTraining. Les secrets et credentials ne doivent jamais être placés dans le code frontend.

## Architecture

Le Web ne communique pas directement avec les microservices individuels ni avec FastAPI. Il passe par l'API Gateway.