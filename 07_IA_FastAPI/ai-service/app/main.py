from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from app.assistant import generate_assistant_response
from app.model_loader import model_loader
from app.schemas import (
    AssistantChatRequest,
    AssistantChatResponse,
    HealthResponse,
    RiskPredictionRequest,
    RiskPredictionResponse,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    model_loader.load()
    yield


app = FastAPI(
    title="SmartTraining AI Service",
    description="Service IA pour la prédiction des apprenants à risque.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="UP",
        service="ai-service",
        modelLoaded=model_loader.is_loaded(),
    )


@app.get("/model-info")
def model_info():
    try:
        return model_loader.get_model_info()
    except Exception as exception:
        raise HTTPException(status_code=500, detail="Le service IA est temporairement indisponible.") from exception


@app.post("/predict-risk", response_model=RiskPredictionResponse)
def predict_risk(request: RiskPredictionRequest) -> RiskPredictionResponse:
    try:
        result = model_loader.predict(request.model_dump())
        return RiskPredictionResponse(
            learnerId=request.learnerId,
            trainingId=request.trainingId,
            **result,
        )
    except Exception as exception:
        raise HTTPException(status_code=500, detail="Le service IA est temporairement indisponible.") from exception

@app.post("/assistant/chat", response_model=AssistantChatResponse)
def assistant_chat(request: AssistantChatRequest) -> AssistantChatResponse:
    try:
        return generate_assistant_response(request)
    except HTTPException:
        raise
    except Exception as exception:
        raise HTTPException(
            status_code=500,
            detail="Impossible dâ€™obtenir une rÃ©ponse pour le moment.",
        ) from exception
