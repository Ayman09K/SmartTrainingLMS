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

Une version Android AAB est utilisÃ©e en test fermÃ© Google Play.

## Installation

```powershell
npm ci
```

## DÃ©marrage

Le `package.json` historique demande le port 8083 pour Expo, mais ce port est Ã©galement celui de `evaluation-service`.

Pour exÃ©cuter l'ensemble du systÃ¨me local sans conflit :

```powershell
npx expo start --port 8086
```

Puis ouvrir la cible souhaitÃ©e depuis Expo.

## API

La production utilise :

`EXPO_PUBLIC_API_URL=https://api.smarttraininglms.com/api`

Les builds destinÃ©s aux tests ou Ã  la production ne doivent pas pointer vers localhost, une IP privÃ©e ou une IP VPS codÃ©e en dur.

## FonctionnalitÃ©s

L'application propose selon le rÃ´le :
- formations et parcours ;
- ressources ;
- quiz ;
- progression ;
- SCORM via WebView ;
- notifications ;
- certificats ;
- fonctions formateur / administration adaptÃ©es au mobile ;
- assistant IA.

## SCORM Mobile

Le lecteur SCORM utilise une WebView et gÃ¨re les contraintes d'orientation / affichage mobile. Les contenus importÃ©s restent servis par le backend ; ils ne sont pas intÃ©grÃ©s au bundle Mobile.

## Android

EAS est utilisÃ© pour la gÃ©nÃ©ration des builds Android.

Le fichier AAB est un artefact de release et n'est pas versionnÃ© dans Git.

## iOS

Le code React Native / Expo est multiplateforme et le projet contient une cible iOS de dÃ©veloppement.

Cependant, Ã  la date de cette baseline PFE, la configuration de distribution iOS n'est pas prÃ©sentÃ©e comme une release livrÃ©e : le `bundleIdentifier` et le `buildNumber` seront traitÃ©s sÃ©parÃ©ment avant toute validation de build iOS / App Store.

Cette distinction Ã©vite de revendiquer une publication iOS qui n'a pas encore Ã©tÃ© rÃ©alisÃ©e.