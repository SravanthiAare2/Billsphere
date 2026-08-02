from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import plans, customers, auth, subscriptions
from app.api import plans, customers, auth, subscriptions, schedule

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for demo only — restrict this in real production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(plans.router)
app.include_router(customers.router)
app.include_router(subscriptions.router)
app.include_router(schedule.router)

@app.get("/")
def read_root():
    return {"message": "Server is running"}