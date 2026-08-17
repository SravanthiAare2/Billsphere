"""
BillSphere Rate Limit Middleware

Protects APIs from excessive requests.

Handles:
- IP based request limiting
- Abuse prevention
- API throttling
"""

import time

from collections import defaultdict

from fastapi import Request

from starlette.middleware.base import (
    BaseHTTPMiddleware,
)

from starlette.responses import (
    JSONResponse,
)

from app.core.config import settings



# ==========================================================
# Request Storage
# ==========================================================

request_history = defaultdict(
    list
)



# ==========================================================
# Rate Limit Middleware
# ==========================================================

class RateLimitMiddleware(
    BaseHTTPMiddleware
):
    """
    Simple in-memory rate limiter.

    Production:
    Replace with Redis based limiter.
    """



    async def dispatch(
        self,
        request: Request,
        call_next,
    ):

        client_ip = (
            request.client.host
            if request.client
            else "unknown"
        )


        current_time = time.time()



        window = (
            settings.RATE_LIMIT_WINDOW
        )


        max_requests = (
            settings.RATE_LIMIT_REQUESTS
        )



        # Remove expired requests

        request_history[client_ip] = [

            timestamp

            for timestamp
            in request_history[client_ip]

            if current_time - timestamp
            <
            window

        ]



        # Check limit

        if len(
            request_history[client_ip]
        ) >= max_requests:


            return JSONResponse(

                status_code=429,

                content={

                    "success":
                    False,

                    "message":
                    (
                        "Too many requests. "
                        "Please try again later."
                    ),

                },

            )



        request_history[client_ip].append(
            current_time
        )



        response = await call_next(
            request
        )


        return response