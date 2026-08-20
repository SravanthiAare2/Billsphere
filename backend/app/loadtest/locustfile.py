"""
BillSphere Load Test

Run with:

    locust -f loadtest/locustfile.py --host=http://127.0.0.1:8000

Then open http://localhost:8089 to configure users/spawn rate
and start the test.
"""

import random

from locust import HttpUser, between, task


class BillSphereUser(HttpUser):
    """
    Simulates an authenticated API consumer hitting the most
    common BillSphere endpoints.
    """

    wait_time = between(1, 3)

    def on_start(self):
        """
        Log in once per simulated user and cache the token.
        """

        response = self.client.post(
            "/api/v1/login",
            json={
                "email": "lakshman06@gmail.com",
                "password": "Lakshman@123",
            },
        )

        if response.status_code == 200:
            token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {token}"}
        else:
            self.headers = {}

    @task(5)
    def list_subscriptions(self):
        self.client.get(
            "/api/v1/subscriptions",
            headers=self.headers,
            name="/subscriptions [list]",
        )

    @task(3)
    def list_invoices(self):
        self.client.get(
            "/api/v1/invoices",
            headers=self.headers,
            name="/invoices [list]",
        )

    @task(3)
    def list_customers(self):
        self.client.get(
            "/api/v1/customers",
            headers=self.headers,
            name="/customers [list]",
        )

    @task(2)
    def list_payments(self):
        self.client.get(
            "/api/v1/payments",
            headers=self.headers,
            name="/payments [list]",
        )

    @task(2)
    def dashboard_analytics(self):
        self.client.get(
            "/api/v1/analytics/dashboard",
            headers=self.headers,
            name="/analytics/dashboard",
        )

    @task(1)
    def get_random_subscription(self):
        subscription_id = random.randint(1, 10)
        self.client.get(
            f"/api/v1/subscriptions/{subscription_id}",
            headers=self.headers,
            name="/subscriptions/:id",
        )

    @task(1)
    def health_check(self):
        self.client.get("/health", name="/health")