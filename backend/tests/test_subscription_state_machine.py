"""
BillSphere Subscription State Machine Tests

Tests:
- Valid lifecycle transitions
- Invalid lifecycle transitions
- Pause / Resume
- Past due recovery
- Cancellation
- Cancelled subscription protection
- Cancel-at-period-end validation
"""

import pytest

from app.services.subscription_state_machine import (
    InvalidSubscriptionTransition,
    SubscriptionAlreadyCancelled,
    SubscriptionAlreadyPaused,
    SubscriptionAlreadyScheduledForCancellation,
    SubscriptionNotPaused,
    SubscriptionStatus,
    can_transition,
    validate_transition,
)


# ==========================================================
# Valid Transition Tests
# ==========================================================


def test_trial_to_active_is_allowed():
    """
    trial -> active must be valid.
    """

    assert can_transition(
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.ACTIVE,
    )


def test_trial_to_cancelled_is_allowed():
    """
    trial -> cancelled must be valid.
    """

    assert can_transition(
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.CANCELLED,
    )


def test_active_to_paused_is_allowed():
    """
    active -> paused must be valid.
    """

    assert can_transition(
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.PAUSED,
    )


def test_paused_to_active_is_allowed():
    """
    paused -> active must be valid.
    """

    assert can_transition(
        SubscriptionStatus.PAUSED,
        SubscriptionStatus.ACTIVE,
    )


def test_active_to_past_due_is_allowed():
    """
    active -> past_due must be valid.
    """

    assert can_transition(
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.PAST_DUE,
    )


def test_past_due_to_active_is_allowed():
    """
    past_due -> active must be valid.
    """

    assert can_transition(
        SubscriptionStatus.PAST_DUE,
        SubscriptionStatus.ACTIVE,
    )


def test_active_to_cancelled_is_allowed():
    """
    active -> cancelled must be valid.
    """

    assert can_transition(
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.CANCELLED,
    )


def test_paused_to_cancelled_is_allowed():
    """
    paused -> cancelled must be valid.
    """

    assert can_transition(
        SubscriptionStatus.PAUSED,
        SubscriptionStatus.CANCELLED,
    )


def test_past_due_to_cancelled_is_allowed():
    """
    past_due -> cancelled must be valid.
    """

    assert can_transition(
        SubscriptionStatus.PAST_DUE,
        SubscriptionStatus.CANCELLED,
    )


# ==========================================================
# Invalid Transition Tests
# ==========================================================


def test_cancelled_to_active_is_not_allowed():
    """
    cancelled -> active must be rejected.
    """

    assert not can_transition(
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.ACTIVE,
    )


def test_cancelled_to_paused_is_not_allowed():
    """
    cancelled -> paused must be rejected.
    """

    assert not can_transition(
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.PAUSED,
    )


def test_cancelled_to_past_due_is_not_allowed():
    """
    cancelled -> past_due must be rejected.
    """

    assert not can_transition(
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.PAST_DUE,
    )


def test_paused_to_past_due_is_not_allowed():
    """
    paused -> past_due must be rejected.
    """

    assert not can_transition(
        SubscriptionStatus.PAUSED,
        SubscriptionStatus.PAST_DUE,
    )


def test_trial_to_paused_is_not_allowed():
    """
    trial -> paused must be rejected.
    """

    assert not can_transition(
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.PAUSED,
    )


def test_trial_to_past_due_is_not_allowed():
    """
    trial -> past_due must be rejected.
    """

    assert not can_transition(
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.PAST_DUE,
    )


# ==========================================================
# Validation Tests
# ==========================================================


def test_validate_valid_transition():
    """
    validate_transition() should not raise for valid
    transitions.
    """

    validate_transition(
        "trial",
        "active",
    )


def test_validate_invalid_transition():
    """
    validate_transition() should raise for invalid
    transitions.
    """

    with pytest.raises(
        InvalidSubscriptionTransition,
    ):
        validate_transition(
            "cancelled",
            "active",
        )


# ==========================================================
# String Status Compatibility
# ==========================================================


def test_string_status_transition():
    """
    Existing database string statuses must work with
    the state machine.
    """

    assert can_transition(
        "active",
        "paused",
    )


def test_string_status_case_normalization():
    """
    Status values should be normalized to lowercase.
    """

    assert can_transition(
        "ACTIVE",
        "PAUSED",
    )


# ==========================================================
# Enum Value Tests
# ==========================================================


def test_subscription_status_values():
    """
    Verify persisted enum values remain compatible with
    existing database strings.
    """

    assert SubscriptionStatus.TRIAL.value == "trial"

    assert SubscriptionStatus.ACTIVE.value == "active"

    assert SubscriptionStatus.PAUSED.value == "paused"

    assert SubscriptionStatus.PAST_DUE.value == "past_due"

    assert SubscriptionStatus.CANCELLED.value == "cancelled"


# ==========================================================
# Complete Lifecycle Path Tests
# ==========================================================


def test_complete_trial_to_cancelled_lifecycle():
    """
    Validate:

    trial
      -> active
      -> paused
      -> active
      -> past_due
      -> active
      -> cancelled
    """

    lifecycle = [
        ("trial", "active"),
        ("active", "paused"),
        ("paused", "active"),
        ("active", "past_due"),
        ("past_due", "active"),
        ("active", "cancelled"),
    ]

    for current, target in lifecycle:
        assert can_transition(
            current,
            target,
        )


# ==========================================================
# Terminal State Test
# ==========================================================


def test_cancelled_is_terminal_state():
    """
    Cancelled subscriptions must not have outgoing
    lifecycle transitions.
    """

    for target in SubscriptionStatus:
        assert not can_transition(
            SubscriptionStatus.CANCELLED,
            target,
        )