# SmartTraining AI / FastAPI

Service Python responsable :
- de la prÃ©diction du risque apprenant ;
- de l'assistant IA gÃ©nÃ©ratif.

## Stack

- FastAPI 0.141.1 ;
- Uvicorn 0.52.1 ;
- pandas 2.3.3 ;
- NumPy 2.4.0 ;
- scikit-learn 1.8.0 ;
- joblib 1.5.3 ;
- Pydantic 2.13.4.

## DÃ©marrage

```powershell
cd ai-service
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Endpoints

- `GET /health`
- `GET /model-info`
- `POST /predict-risk`
- `POST /assistant/chat`

## ModÃ¨le de risque

Le pipeline chargÃ© au dÃ©marrage est une Logistic Regression scikit-learn sÃ©rialisÃ©e avec joblib.

Les mÃ©tadonnÃ©es du modÃ¨le contiennent :
- liste des features ;
- mÃ©thode d'entraÃ®nement ;
- hyperparamÃ¨tres ;
- mÃ©triques ;
- avertissement sur le weak label.

Voir `../docs/AI_MODEL.md` depuis la racine du dÃ©pÃ´t.

## Assistant

La clÃ© Gemini est lue depuis :

`GEMINI_API_KEY`

ParamÃ¨tres complÃ©mentaires :
- `GEMINI_MODEL` ;
- `GEMINI_TIMEOUT_SECONDS` ;
- `SMARTTRAINING_TIMEZONE`.

Aucune clÃ© Gemini ne doit apparaÃ®tre dans Git.

## Structure

```text
07_IA_FastAPI/
â”œâ”€â”€ ai-service/
â”‚   â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ models/
â”‚   â”œâ”€â”€ Dockerfile
â”‚   â””â”€â”€ requirements.txt
â”œâ”€â”€ datasets/
â”œâ”€â”€ models/
â”œâ”€â”€ notebooks/
â””â”€â”€ scripts/
```

Le dataset, le notebook, les mÃ©tadonnÃ©es et les scripts sont conservÃ©s pour la reproductibilitÃ© acadÃ©mique du PFE.