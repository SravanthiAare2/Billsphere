from fastapi import FastAPI

app = FastAPI(title="Billing Platform API")

@app.get("/")
def root():
    return {"message": "Billing Platform is running"}

@app.get("/health")
def health():
    return {"status": "ok"}