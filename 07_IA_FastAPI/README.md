# SmartTraining AI / FastAPI

Service Python responsable :
- de la prédiction du risque apprenant ;
- de l'assistant IA génératif.

## Stack

- FastAPI 0.141.1 ;
- Uvicorn 0.52.1 ;
- pandas 2.3.3 ;
- NumPy 2.4.0 ;
- scikit-learn 1.8.0 ;
- joblib 1.5.3 ;
- Pydantic 2.13.4.

## Démarrage

```powershell
cd ai-service
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Endpoints

- `GET /health`
- `GET /model-info`
- `POST /predict-risk`
- `POST /assistant/chat`

## Modèle de risque

Le pipeline chargé au démarrage est une Logistic Regression scikit-learn sérialisée avec joblib.

Les métadonnées du modèle contiennent :
- liste des features ;
- méthode d'entraînement ;
- hyperparamètres ;
- métriques ;
- avertissement sur le weak label.

Voir `../docs/AI_MODEL.md` depuis la racine du dépôt.

## Assistant

La clé Gemini est lue depuis :

`GEMINI_API_KEY`

Paramètres complémentaires :
- `GEMINI_MODEL` ;
- `GEMINI_TIMEOUT_SECONDS` ;
- `SMARTTRAINING_TIMEZONE`.

Aucune clé Gemini ne doit apparaître dans Git.

## Structure

```text
07_IA_FastAPI/
├── ai-service/
│   ├── app/
│   ├── models/
│   ├── Dockerfile
│   └── requirements.txt
├── datasets/
├── models/
├── notebooks/
└── scripts/
```

Le dataset, le notebook, les métadonnées et les scripts sont conservés pour la reproductibilité académique du PFE.