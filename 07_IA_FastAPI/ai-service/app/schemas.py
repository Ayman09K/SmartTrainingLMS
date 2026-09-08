from pydantic import BaseModel, Field, model_validator


class RiskPredictionRequest(BaseModel):
    learnerId: int = Field(..., ge=1)
    trainingId: int = Field(..., ge=1)
    progressPercentage: float = Field(..., ge=0, le=100)
    averageScore: float = Field(..., ge=0, le=100)
    completedLessons: int = Field(..., ge=0)
    totalLessons: int = Field(..., ge=0)
    completedQuizzes: int = Field(..., ge=0)
    totalQuizzes: int = Field(..., ge=0)
    totalEvents: int = Field(..., ge=0)
    totalTrainingsStarted: int = Field(..., ge=0)
    totalTrainingsCompleted: int = Field(..., ge=0)
    lessonCompletionRate: float = Field(..., ge=0, le=1)
    quizCompletionRate: float = Field(..., ge=0, le=1)
    scoreRatio: float = Field(..., ge=0, le=1)
    daysSinceLastActivity: int = Field(..., ge=0)
    avgEventsPerTraining: float = Field(..., ge=0)

    @model_validator(mode="after")
    def validate_totals(self):
        if self.completedLessons > self.totalLessons:
            raise ValueError("completedLessons ne peut pas dépasser totalLessons.")
        if self.completedQuizzes > self.totalQuizzes:
            raise ValueError("completedQuizzes ne peut pas dépasser totalQuizzes.")
        if self.totalTrainingsCompleted > self.totalTrainingsStarted:
            raise ValueError(
                "totalTrainingsCompleted ne peut pas dépasser totalTrainingsStarted."
            )
        return self


class RiskPredictionResponse(BaseModel):
    learnerId: int
    trainingId: int
    prediction: int
    riskLabel: str
    riskProbability: float
    riskLevel: str
    dataStatus: str
    modelName: str
    modelVersion: str
    explanation: str


class HealthResponse(BaseModel):
    status: str
    service: str
    modelLoaded: bool

class AssistantHistoryMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=1500)


class AssistantChatRequest(BaseModel):
    role: str = Field(..., pattern="^(APPRENANT|FORMATEUR|ADMIN)$")
    message: str = Field(..., min_length=1, max_length=2000)
    surface: str | None = Field(default=None, pattern="^(MOBILE|WEB)$")
    learningContext: str | None = Field(default=None, max_length=16000)
    history: list[AssistantHistoryMessage] = Field(default_factory=list, max_length=8)


class AssistantChatResponse(BaseModel):
    answer: str
    model: str
    contextUsed: bool
