"""
BillSphere Request Logging Middleware

Tracks:
- Incoming requests
- Response status
- Processing time
- API activity
"""

import time

from fastapi import Request

from starlette.middleware.base import (
    BaseHTTPMiddleware,
)

from app.core.logging import logger



# ==========================================================
# Request Logging Middleware
# ==========================================================

class LoggingMiddleware(
    BaseHTTPMiddleware
):
    """
    Logs every API request.
    """



    async def dispatch(
        self,
        request: Request,
        call_next,
    ):

        start_time = time.time()


        response = await call_next(
            request
        )


        process_time = (
            time.time()
            -
            start_time
        )



        logger.info(
            (
                "%s %s | Status: %s | "
                "Time: %.4fs"
            ),

            request.method,

            request.url.path,

            response.status_code,

            process_time,

        )


        response.headers[
            "X-Process-Time"
        ] = str(
            process_time
        )


        return response