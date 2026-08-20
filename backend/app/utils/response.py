"""
BillSphere Response Utilities

Standard API response helpers.

Provides:
- Success responses
- Error responses
- Pagination responses
"""

from typing import (
    Any,
    Optional,
)



# ==========================================================
# Success Response
# ==========================================================

def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
):
    """
    Create standard successful API response.
    """

    return {

        "success": True,

        "status_code": status_code,

        "message": message,

        "data": data,

    }



# ==========================================================
# Error Response
# ==========================================================

def error_response(
    message: str = "Something went wrong",
    errors: Optional[Any] = None,
    status_code: int = 400,
):
    """
    Create standard error API response.
    """

    return {

        "success": False,

        "status_code": status_code,

        "message": message,

        "errors": errors,

    }



# ==========================================================
# Pagination Response
# ==========================================================

def pagination_response(
    items: list,
    total: int,
    page: int,
    page_size: int,
):
    """
    Create paginated response.
    """

    total_pages = (
        (total + page_size - 1)
        //
        page_size
    )


    return {

        "success": True,

        "data": items,

        "pagination": {

            "total":
            total,

            "page":
            page,

            "page_size":
            page_size,

            "total_pages":
            total_pages,

        },

    }



# ==========================================================
# Validation Error Response
# ==========================================================

def validation_error_response(
    errors: Any,
):
    """
    Format validation errors.
    """

    return {

        "success": False,

        "message":
        "Validation failed",

        "errors":
        errors,

    }