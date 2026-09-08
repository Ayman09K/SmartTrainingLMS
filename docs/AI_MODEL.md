# ModÃ¨le d'intelligence artificielle

## 1. Objectif

Le module ML estime si un apprenant prÃ©sente un risque de dÃ©crochage ou de difficultÃ© Ã  partir d'indicateurs d'activitÃ© et de progression.

Il s'agit d'une classification supervisÃ©e binaire :
- `0` : apprenant non Ã  risque ;
- `1` : apprenant Ã  risque.

## 2. ModÃ¨le

ModÃ¨le retenu : `LogisticRegression`.

Le pipeline est entraÃ®nÃ© avec scikit-learn puis sÃ©rialisÃ© au format joblib.

Version du modÃ¨le : `1.0.0`.

## 3. Variables d'entrÃ©e

Le modÃ¨le utilise 14 features :
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

Les identifiants (`learnerId`, `trainingId`) ne sont pas utilisÃ©s comme variables prÃ©dictives.

Des colonnes dÃ©rivÃ©es du risque ou de la recommandation sont Ã©galement exclues pour Ã©viter la fuite de cible.

## 4. Dataset

Le dataset acadÃ©mique contient 600 observations synthÃ©tiques gÃ©nÃ©rÃ©es pour le prototype PFE.

La cible `at_risk` est un **weak label** construit par rÃ¨gles.

Cette dÃ©cision permet de dÃ©montrer un pipeline ML complet dans le contexte acadÃ©mique, mais ne doit pas Ãªtre interprÃ©tÃ©e comme une validation clinique, statistique ou mÃ©tier sur une population rÃ©elle.

## 5. MÃ©thode d'entraÃ®nement

- sÃ©paration train/test : `80/20` ;
- stratification : oui ;
- validation croisÃ©e : `StratifiedKFold`, 5 plis ;
- recherche d'hyperparamÃ¨tres : `GridSearchCV` ;
- mÃ©trique principale de sÃ©lection : F1 ;
- graine alÃ©atoire : `42`.

Meilleurs paramÃ¨tres enregistrÃ©s :
- `C = 1` ;
- `class_weight = null`.

## 6. RÃ©sultats enregistrÃ©s

| MÃ©trique | Valeur |
|---|---:|
| Accuracy | 0.9417 |
| Precision classe Ã  risque | 0.9063 |
| Recall classe Ã  risque | 0.8788 |
| F1 classe Ã  risque | 0.8923 |
| ROC-AUC | 0.9471 |
| Meilleur F1 CV | 0.8557 |

Ces mÃ©triques dÃ©crivent le dataset prototype et doivent Ãªtre prÃ©sentÃ©es avec la limite du weak labeling.

## 7. PrÃ©vention des faux signaux

Le service contient un garde-fou : lorsque les donnÃ©es d'activitÃ© sont insuffisantes, il peut retourner un statut `DATA_INSUFFICIENT` plutÃ´t que de forcer une classification de risque.

## 8. API FastAPI

Endpoints :
- `GET /health`
- `GET /model-info`
- `POST /predict-risk`
- `POST /assistant/chat`

Le modÃ¨le est chargÃ© au dÃ©marrage du service.

## 9. ReproductibilitÃ©

Artefacts prÃ©sents dans le dÃ©pÃ´t :
- dataset CSV ;
- notebook d'entraÃ®nement ;
- script de gÃ©nÃ©ration du dataset ;
- script de test de prÃ©diction ;
- mÃ©tadonnÃ©es JSON ;
- pipeline `.joblib`.

Cette combinaison permet de montrer au jury :
1. comment les donnÃ©es sont produites ;
2. comment le modÃ¨le est entraÃ®nÃ© ;
3. comment les mÃ©triques sont obtenues ;
4. comment le modÃ¨le est sauvegardÃ© ;
5. comment il est consommÃ© par l'API.

## 10. Limites et suite logique

La principale limite est la construction synthÃ©tique de la cible.

Pour une mise en production rÃ©elle, la suite attendue serait :
- collecte d'historiques rÃ©els anonymisÃ©s ;
- dÃ©finition d'un Ã©vÃ©nement mÃ©tier observable de dÃ©crochage ;
- rÃ©entraÃ®nement avec labels rÃ©els ;
- validation temporelle ;
- contrÃ´le du drift ;
- suivi des faux positifs / faux nÃ©gatifs ;
- rÃ©Ã©valuation pÃ©riodique des features et seuils.

Le projet PFE prÃ©sente donc un pipeline ML cohÃ©rent et explicable, tout en distinguant clairement prototype acadÃ©mique et modÃ¨le validÃ© en production.