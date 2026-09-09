# SmartTraining Mobile

Application Mobile React Native / Expo de SmartTraining AI.

## Stack

- Expo 56 ;
- React Native 0.85 ;
- React 19 ;
- TypeScript ;
- Expo Router ;
- NativeWind ;
- Axios ;
- Expo Secure Store ;
- React Native WebView.

## Version applicative

Baseline actuelle :
- application : `1.0.7` ;
- Android package : `com.smarttraininglms.app` ;
- Android `versionCode` : `8`.

Une version Android AAB est utilisée en test fermé Google Play.

## Installation

```powershell
npm ci
```

## Démarrage

Le `package.json` historique demande le port 8083 pour Expo, mais ce port est également celui de `evaluation-service`.

Pour exécuter l'ensemble du système local sans conflit :

```powershell
npx expo start --port 8086
```

Puis ouvrir la cible souhaitée depuis Expo.

## API

La production utilise :

`EXPO_PUBLIC_API_URL=https://api.smarttraininglms.com/api`

Les builds destinés aux tests ou à la production ne doivent pas pointer vers localhost, une IP privée ou une IP VPS codée en dur.

## Fonctionnalités

L'application propose selon le rôle :
- formations et parcours ;
- ressources ;
- quiz ;
- progression ;
- SCORM via WebView ;
- notifications ;
- certificats ;
- fonctions formateur / administration adaptées au mobile ;
- assistant IA.

## SCORM Mobile

Le lecteur SCORM utilise une WebView et gère les contraintes d'orientation / affichage mobile. Les contenus importés restent servis par le backend ; ils ne sont pas intégrés au bundle Mobile.

## Android

EAS est utilisé pour la génération des builds Android.

Le fichier AAB est un artefact de release et n'est pas versionné dans Git.

## iOS

Le code React Native / Expo est multiplateforme et le projet contient une cible iOS de développement.

Cependant, à la date de cette baseline PFE, la configuration de distribution iOS n'est pas présentée comme une release livrée : le `bundleIdentifier` et le `buildNumber` seront traités séparément avant toute validation de build iOS / App Store.

Cette distinction évite de revendiquer une publication iOS qui n'a pas encore été réalisée.