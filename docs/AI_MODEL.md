# Modèle d'intelligence artificielle

## 1. Objectif

Le module ML estime si un apprenant présente un risque de décrochage ou de difficulté à partir d'indicateurs d'activité et de progression.

Il s'agit d'une classification supervisée binaire :
- `0` : apprenant non à risque ;
- `1` : apprenant à risque.

## 2. Modèle

Modèle retenu : `LogisticRegression`.

Le pipeline est entraîné avec scikit-learn puis sérialisé au format joblib.

Version du modèle : `1.0.0`.

## 3. Variables d'entrée

Le modèle utilise 14 features :
1. `progressPercentage`
2. `averageScore`
3. `completedLessons`
4. `totalLessons`
5. `completedQuizzes`
6. `totalQuizzes`
7. `totalEvents`
8. `totalTrainingsStarted`
9. `totalTrainingsCompleted`
10. `lessonCompletionRate`
11. `quizCompletionRate`
12. `scoreRatio`
13. `daysSinceLastActivity`
14. `avgEventsPerTraining`

Les identifiants (`learnerId`, `trainingId`) ne sont pas utilisés comme variables prédictives.

Des colonnes dérivées du risque ou de la recommandation sont également exclues pour éviter la fuite de cible.

## 4. Dataset

Le dataset académique contient 600 observations synthétiques générées pour le prototype PFE.

La cible `at_risk` est un **weak label** construit par règles.

Cette décision permet de démontrer un pipeline ML complet dans le contexte académique, mais ne doit pas être interprétée comme une validation clinique, statistique ou métier sur une population réelle.

## 5. Méthode d'entraînement

- séparation train/test : `80/20` ;
- stratification : oui ;
- validation croisée : `StratifiedKFold`, 5 plis ;
- recherche d'hyperparamètres : `GridSearchCV` ;
- métrique principale de sélection : F1 ;
- graine aléatoire : `42`.

Meilleurs paramètres enregistrés :
- `C = 1` ;
- `class_weight = null`.

## 6. Résultats enregistrés

| Métrique | Valeur |
|---|---:|
| Accuracy | 0.9417 |
| Precision classe à risque | 0.9063 |
| Recall classe à risque | 0.8788 |
| F1 classe à risque | 0.8923 |
| ROC-AUC | 0.9471 |
| Meilleur F1 CV | 0.8557 |

Ces métriques décrivent le dataset prototype et doivent être présentées avec la limite du weak labeling.

## 7. Prévention des faux signaux

Le service contient un garde-fou : lorsque les données d'activité sont insuffisantes, il peut retourner un statut `DATA_INSUFFICIENT` plutôt que de forcer une classification de risque.

## 8. API FastAPI

Endpoints :
- `GET /health`
- `GET /model-info`
- `POST /predict-risk`
- `POST /assistant/chat`

Le modèle est chargé au démarrage du service.

## 9. Reproductibilité

Artefacts présents dans le dépôt :
- dataset CSV ;
- notebook d'entraînement ;
- script de génération du dataset ;
- script de test de prédiction ;
- métadonnées JSON ;
- pipeline `.joblib`.

Cette combinaison permet de montrer au jury :
1. comment les données sont produites ;
2. comment le modèle est entraîné ;
3. comment les métriques sont obtenues ;
4. comment le modèle est sauvegardé ;
5. comment il est consommé par l'API.

## 10. Limites et suite logique

La principale limite est la construction synthétique de la cible.

Pour une mise en production réelle, la suite attendue serait :
- collecte d'historiques réels anonymisés ;
- définition d'un événement métier observable de décrochage ;
- réentraînement avec labels réels ;
- validation temporelle ;
- contrôle du drift ;
- suivi des faux positifs / faux négatifs ;
- réévaluation périodique des features et seuils.

Le projet PFE présente donc un pipeline ML cohérent et explicable, tout en distinguant clairement prototype académique et modèle validé en production.