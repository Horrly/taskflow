import pytest
from rest_framework.test import APIClient

from core.tests.factories import UserFactory, WorkspaceFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def other_user(db):
    return UserFactory()


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


def make_authed(api_client, u):
    client = APIClient()
    client.force_authenticate(user=u)
    return client


@pytest.fixture
def client_for():
    """Factory fixture: client_for(user) -> APIClient authenticated as user."""
    def _make(u):
        client = APIClient()
        client.force_authenticate(user=u)
        return client
    return _make


@pytest.fixture
def workspace(db, user):
    return WorkspaceFactory(owner=user)
